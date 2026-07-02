import asyncio
from types import SimpleNamespace
from unittest import TestCase
from uuid import uuid4

from app.integrations.slack.processing.queue import SlackJobQueue
from app.integrations.slack.processing.queued_processor import SlackQueuedEventHandler
from app.integrations.slack.data.repository import SlackMentionTarget
from app.integrations.slack.schemas import SlackQueuedDelivery


class FakeArqRedis:
    def __init__(self, job=True) -> None:
        self.job = job
        self.call = None

    async def enqueue_job(self, function, event_id, _job_id):
        self.call = (function, event_id, _job_id)
        return SimpleNamespace() if self.job else None


class FakeRepository:
    def __init__(self, delivery_status="RECEIVED", targets=True) -> None:
        self.delivery_status = delivery_status
        self.has_targets = targets
        self.updated = None

    def get_webhook_delivery(self, event_id):
        self.loaded_event_id = event_id
        return SlackQueuedDelivery(
            status=self.delivery_status,
            payload={
                "type": "event_callback",
                "team_id": "T123",
                "event_id": event_id,
                "event": {
                    "type": "message",
                    "user": "U-SENDER",
                    "text": "<@U-CONNECTED> fix checkout",
                },
            },
        )

    def find_mentioned_targets(self, team_id, text):
        self.lookup = (team_id, text)
        if not self.has_targets:
            return []
        return [SlackMentionTarget(uuid4(), "U-CONNECTED")]

    def update_webhook_delivery(self, *values):
        self.updated = values


class FakeProcessor:
    def __init__(self) -> None:
        self.processed = None

    async def process(self, event_id, event, targets):
        self.processed = (event_id, event, targets)


class SlackQueueTests(TestCase):
    def test_enqueues_unique_arq_job_id(self) -> None:
        redis = FakeArqRedis()
        queue = SlackJobQueue(redis)

        queued = asyncio.run(queue.enqueue("Ev123"))

        self.assertTrue(queued)
        self.assertEqual(
            redis.call,
            ("process_slack_event", "Ev123", "slack:Ev123"),
        )

    def test_worker_loads_persisted_payload_and_processes_it(self) -> None:
        repository = FakeRepository()
        processor = FakeProcessor()
        handler = SlackQueuedEventHandler(repository, processor)

        asyncio.run(handler.handle("Ev123"))

        self.assertEqual(repository.loaded_event_id, "Ev123")
        self.assertEqual(processor.processed[0], "Ev123")
        self.assertEqual(processor.processed[1].user, "U-SENDER")

    def test_worker_skips_completed_delivery(self) -> None:
        repository = FakeRepository(delivery_status="COMPLETED")
        processor = FakeProcessor()

        asyncio.run(SlackQueuedEventHandler(repository, processor).handle("Ev123"))

        self.assertIsNone(processor.processed)

    def test_worker_completes_event_if_connection_was_removed(self) -> None:
        repository = FakeRepository(targets=False)
        processor = FakeProcessor()

        asyncio.run(SlackQueuedEventHandler(repository, processor).handle("Ev123"))

        self.assertIsNone(processor.processed)
        self.assertEqual(repository.updated[1], "COMPLETED")
