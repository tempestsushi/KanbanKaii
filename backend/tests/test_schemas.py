from unittest import TestCase
from uuid import uuid4

from pydantic import ValidationError

from app.schemas.ticket import TicketCreate, TicketResponse
from app.schemas.triage import AIAnalysisResult, IncomingMessage, TriageRequest


class SchemaTests(TestCase):
    def test_incoming_message_rejects_unknown_fields(self) -> None:
        with self.assertRaises(ValidationError):
            IncomingMessage(
                text="Please fix login",
                user_name="Aisha",
                channel="support",
            )

    def test_ai_analysis_result_enforces_priority_values(self) -> None:
        with self.assertRaises(ValidationError):
            AIAnalysisResult(
                isActionableTask=True,
                extractedTitle="Fix login",
                cleanDescription="Resolve the login redirect loop.",
                estimatedPriority="URGENT",
            )

    def test_triage_request_parses_json_uuid_and_rejects_invalid_source(self) -> None:
        owner_id = uuid4()
        request = TriageRequest(
            text="Please fix checkout",
            user_name="Aisha",
            owner_id=str(owner_id),
            source="SLACK",
        )

        self.assertEqual(request.owner_id, owner_id)
        with self.assertRaises(ValidationError):
            TriageRequest(
                text="Please fix checkout",
                user_name="Aisha",
                owner_id=str(owner_id),
                source="EMAIL",
            )

    def test_ticket_create_defaults_to_pending(self) -> None:
        owner_id = uuid4()
        ticket = TicketCreate(
            owner_id=owner_id,
            title="Fix checkout",
            description="Resolve the checkout failure.",
            priority="HIGH",
            assignee="Aisha",
            source="WEBHOOK",
        )

        self.assertEqual(ticket.status, "PENDING")
        self.assertEqual(ticket.scope, "PRIVATE")
        self.assertEqual(ticket.created_by, owner_id)
        self.assertEqual(ticket.assignee_user_id, owner_id)
        self.assertEqual(ticket.source_message_state, "ACTIVE")

    def test_assigned_ticket_requires_an_organization(self) -> None:
        with self.assertRaises(ValidationError):
            TicketCreate(
                owner_id=uuid4(),
                scope="ORGANIZATION",
                title="Fix checkout",
                description="Resolve the checkout failure.",
                priority="HIGH",
                assignee="Noah",
                source="SLACK",
            )

    def test_ticket_response_generates_identity_and_timestamp(self) -> None:
        ticket = TicketResponse(
            owner_id=uuid4(),
            title="Fix checkout",
            description="Resolve the checkout failure.",
            priority="HIGH",
            assignee="Aisha",
            source="WEBHOOK",
        )

        self.assertIsNotNone(ticket.id)
        self.assertIsNotNone(ticket.created_at.tzinfo)

    def test_ticket_rejects_invalid_status_and_extra_fields(self) -> None:
        with self.assertRaises(ValidationError):
            TicketCreate(
                owner_id=uuid4(),
                title="Fix checkout",
                description="Resolve the checkout failure.",
                priority="HIGH",
                status="BLOCKED",
                assignee="Aisha",
                source="WEBHOOK",
                unexpected=True,
            )
