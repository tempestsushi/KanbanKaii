import asyncio
from unittest import TestCase
from uuid import uuid4
from types import SimpleNamespace

from app.integrations.slack.processing.processor import SlackEventProcessor
from app.integrations.slack.data.repository import SlackMentionTarget
from app.integrations.slack.schemas import SlackEvent
from app.schemas.triage import AITaskBatchResult, ExtractedTask


class FakeSlackRepository:
    def __init__(self) -> None:
        self.states = []

    def update_webhook_delivery(
        self,
        event_id,
        status,
        error=None,
        outcome=None,
        result=None,
    ) -> None:
        self.states.append((event_id, status, error, outcome, result))


class FakeTicketRepository:
    def __init__(self) -> None:
        self.created = []

    def create(self, ticket):
        self.created.append(ticket)
        return SimpleNamespace(id=uuid4())


class FakeOllamaService:
    def __init__(self, actionable=True, task_count=1) -> None:
        self.actionable = actionable
        self.task_count = task_count
        self.messages = []

    async def analyze_tasks(self, message):
        self.messages.append(message)
        return AITaskBatchResult(
            isActionableTask=self.actionable,
            tasks=[
                ExtractedTask(
                    title=f"Task {index + 1}",
                    description=f"Complete task {index + 1}.",
                    priority="HIGH",
                )
                for index in range(self.task_count if self.actionable else 0)
            ],
        )


class FakeSlackUserService:
    async def display_name(self, owner_id, slack_user_id):
        self.lookup = (owner_id, slack_user_id)
        return "Aisha"


class SlackEventProcessorTests(TestCase):
    def test_actionable_mention_creates_private_owner_ticket(self) -> None:
        owner_id = uuid4()
        slack_repository = FakeSlackRepository()
        ticket_repository = FakeTicketRepository()
        ollama = FakeOllamaService()
        slack_users = FakeSlackUserService()
        processor = SlackEventProcessor(
            slack_repository,
            ticket_repository,
            ollama,
            slack_users,
        )

        asyncio.run(
            processor.process(
                "Ev123",
                SlackEvent(
                    type="message",
                    user="U-SENDER",
                    text="<@U-CONNECTED> please fix checkout before tomorrow",
                ),
                [SlackMentionTarget(owner_id, "U-CONNECTED")],
            )
        )

        self.assertEqual(
            ollama.messages[0].text,
            "please fix checkout before tomorrow",
        )
        self.assertEqual(len(ticket_repository.created), 1)
        ticket = ticket_repository.created[0]
        self.assertEqual(ticket.owner_id, owner_id)
        self.assertEqual(ticket.assignee, "Aisha")
        self.assertEqual(ollama.messages[0].user_name, "Aisha")
        self.assertEqual(slack_users.lookup, (owner_id, "U-SENDER"))
        self.assertEqual(ticket.source, "SLACK")
        self.assertEqual(
            [state[1] for state in slack_repository.states],
            ["PROCESSING", "COMPLETED"],
        )
        self.assertEqual(slack_repository.states[-1][3], "TICKET_CREATED")
        self.assertEqual(
            slack_repository.states[-1][4][0]["analysis"]["isActionableTask"],
            True,
        )

    def test_multiple_requested_outcomes_create_multiple_tickets(self) -> None:
        repository = FakeSlackRepository()
        tickets = FakeTicketRepository()
        processor = SlackEventProcessor(
            repository,
            tickets,
            FakeOllamaService(task_count=3),
        )

        asyncio.run(
            processor.process(
                "Ev-multi",
                SlackEvent(
                    type="message",
                    user="U-SENDER",
                    text="<@U-CONNECTED> fix checkout, update SQL, and review tests",
                ),
                [SlackMentionTarget(uuid4(), "U-CONNECTED")],
            )
        )

        self.assertEqual(len(tickets.created), 3)
        self.assertEqual(len(repository.states[-1][4][0]["ticket_ids"]), 3)

    def test_non_actionable_mention_completes_without_ticket(self) -> None:
        slack_repository = FakeSlackRepository()
        ticket_repository = FakeTicketRepository()
        processor = SlackEventProcessor(
            slack_repository,
            ticket_repository,
            FakeOllamaService(actionable=False),
        )

        asyncio.run(
            processor.process(
                "Ev124",
                SlackEvent(
                    type="message",
                    user="U-SENDER",
                    text="hello <@U-CONNECTED>",
                ),
                [SlackMentionTarget(uuid4(), "U-CONNECTED")],
            )
        )

        self.assertEqual(ticket_repository.created, [])
        self.assertEqual(slack_repository.states[-1][1], "COMPLETED")
        self.assertEqual(
            slack_repository.states[-1][3],
            "IGNORED_NON_ACTIONABLE",
        )
