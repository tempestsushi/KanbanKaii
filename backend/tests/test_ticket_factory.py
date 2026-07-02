from unittest import TestCase
from uuid import uuid4

from app.schemas.triage import AIAnalysisResult, IncomingMessage
from app.services.ticket_factory import (
    NonActionableMessageError,
    create_ticket_from_analysis,
)


class TicketFactoryTests(TestCase):
    def test_maps_actionable_analysis(self) -> None:
        owner_id = uuid4()
        message = IncomingMessage(text="Please fix checkout", user_name="Aisha")
        analysis = AIAnalysisResult(
            isActionableTask=True,
            extractedTitle="Fix checkout",
            cleanDescription="Resolve the checkout failure.",
            estimatedPriority="HIGH",
        )

        ticket = create_ticket_from_analysis(
            owner_id=owner_id,
            message=message,
            analysis=analysis,
            source="SLACK",
        )

        self.assertEqual(ticket.owner_id, owner_id)
        self.assertEqual(ticket.title, "Fix checkout")
        self.assertEqual(ticket.description, "Resolve the checkout failure.")
        self.assertEqual(ticket.priority, "HIGH")
        self.assertEqual(ticket.status, "PENDING")
        self.assertEqual(ticket.assignee, "Aisha")
        self.assertEqual(ticket.source, "SLACK")

    def test_rejects_non_actionable_analysis(self) -> None:
        message = IncomingMessage(text="Thanks!", user_name="Noah")
        analysis = AIAnalysisResult(
            isActionableTask=False,
            extractedTitle="",
            cleanDescription="",
            estimatedPriority="MEDIUM",
        )

        with self.assertRaisesRegex(
            NonActionableMessageError,
            "A ticket cannot be created from a non-actionable message",
        ):
            create_ticket_from_analysis(
                owner_id=uuid4(),
                message=message,
                analysis=analysis,
                source="GITHUB",
            )
