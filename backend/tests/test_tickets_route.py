from datetime import datetime, timezone
from unittest import TestCase
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user_id
from app.database.ticket_repository import TicketRepositoryError
from app.main import app
from app.routes.tickets import get_ticket_repository
from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketStatus,
    TicketUpdate,
)


client = TestClient(app)


class FakeTicketRepository:
    def __init__(self, tickets: list[TicketResponse]) -> None:
        self.tickets = tickets
        self.received_owner_id = None
        self.received_status = None
        self.status_update = None
        self.created_ticket = None
        self.deleted_ticket = None
        self.ticket_update = None

    def create(self, ticket: TicketCreate) -> TicketResponse:
        self.created_ticket = ticket
        return TicketResponse(
            **ticket.model_dump(),
            id=uuid4(),
            created_at=datetime.now(timezone.utc),
        )

    def list_for_owner(
        self,
        owner_id: UUID,
        ticket_status: TicketStatus | None = None,
    ) -> list[TicketResponse]:
        self.received_owner_id = owner_id
        self.received_status = ticket_status
        return self.tickets

    def update_status(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        new_status: TicketStatus,
    ) -> TicketResponse:
        self.status_update = (ticket_id, owner_id, new_status)
        ticket = self.tickets[0]
        return ticket.model_copy(update={"status": new_status})

    def delete(self, ticket_id: UUID, owner_id: UUID) -> None:
        self.deleted_ticket = (ticket_id, owner_id)

    def update(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        changes: TicketUpdate,
    ) -> TicketResponse:
        self.ticket_update = (ticket_id, owner_id, changes)
        ticket = self.tickets[0]
        return ticket.model_copy(update=changes.model_dump())


class FailingTicketRepository:
    def list_for_owner(
        self,
        owner_id: UUID,
        ticket_status: TicketStatus | None = None,
    ) -> list[TicketResponse]:
        raise TicketRepositoryError("Supabase could not load tickets")


class MissingTicketRepository:
    def update_status(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        new_status: TicketStatus,
    ) -> TicketResponse:
        raise TicketRepositoryError("Ticket was not found for this owner")

    def delete(self, ticket_id: UUID, owner_id: UUID) -> None:
        raise TicketRepositoryError("Ticket was not found for this owner")

    def update(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        changes: TicketUpdate,
    ) -> TicketResponse:
        raise TicketRepositoryError("Ticket was not found for this owner")


class TicketsRouteTests(TestCase):
    def setUp(self) -> None:
        self.owner_id = uuid4()
        app.dependency_overrides[get_current_user_id] = lambda: self.owner_id

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_lists_owner_tickets(self) -> None:
        owner_id = self.owner_id
        ticket = TicketResponse(
            id=uuid4(),
            owner_id=owner_id,
            title="Fix checkout error",
            description="Please fix the checkout error before tomorrow.",
            priority="MEDIUM",
            status="PENDING",
            assignee="Aisha",
            source="SLACK",
            created_at=datetime.now(timezone.utc),
        )
        repository = FakeTicketRepository([ticket])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.get(
            "/api/tickets",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], str(ticket.id))
        self.assertEqual(repository.received_owner_id, owner_id)

    def test_creates_manual_ticket(self) -> None:
        owner_id = self.owner_id
        repository = FakeTicketRepository([])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.post(
            "/api/tickets",
            json={
                "title": "Plan release",
                "description": "Prepare the release checklist.",
                "priority": "MEDIUM",
                "status": "PENDING",
                "assignee": "Aisha",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["source"], "MANUAL")
        self.assertEqual(response.json()["owner_id"], str(owner_id))
        self.assertEqual(repository.created_ticket.title, "Plan release")
        self.assertEqual(repository.created_ticket.source, "MANUAL")

    def test_manual_creation_rejects_empty_description(self) -> None:
        app.dependency_overrides[get_ticket_repository] = lambda: (
            FakeTicketRepository([])
        )

        response = client.post(
            "/api/tickets",
            json={
                "title": "Plan release",
                "description": "",
                "priority": "MEDIUM",
                "status": "PENDING",
                "assignee": "Aisha",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_requires_authentication(self) -> None:
        app.dependency_overrides.pop(get_current_user_id)
        app.dependency_overrides[get_ticket_repository] = lambda: (
            FakeTicketRepository([])
        )

        response = client.get("/api/tickets")

        self.assertEqual(response.status_code, 401)

    def test_filters_tickets_by_status(self) -> None:
        owner_id = self.owner_id
        repository = FakeTicketRepository([])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.get(
            "/api/tickets",
            params={"status": "PENDING"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(repository.received_status, "PENDING")

    def test_reports_database_failure(self) -> None:
        app.dependency_overrides[get_ticket_repository] = FailingTicketRepository

        response = client.get("/api/tickets")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json(),
            {"detail": "Supabase could not load tickets"},
        )

    def test_updates_ticket_status(self) -> None:
        owner_id = self.owner_id
        ticket = TicketResponse(
            id=uuid4(),
            owner_id=owner_id,
            title="Fix checkout error",
            description="Please fix the checkout error before tomorrow.",
            priority="MEDIUM",
            status="PENDING",
            assignee="Aisha",
            source="SLACK",
            created_at=datetime.now(timezone.utc),
        )
        repository = FakeTicketRepository([ticket])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.patch(
            f"/api/tickets/{ticket.id}/status",
            json={"status": "IN_PROGRESS"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "IN_PROGRESS")
        self.assertEqual(
            repository.status_update,
            (ticket.id, owner_id, "IN_PROGRESS"),
        )

    def test_status_update_returns_404_for_unknown_owner_ticket(self) -> None:
        app.dependency_overrides[get_ticket_repository] = MissingTicketRepository

        response = client.patch(
            f"/api/tickets/{uuid4()}/status",
            json={"status": "COMPLETED"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {"detail": "Ticket was not found for this owner"},
        )

    def test_updates_complete_ticket_details(self) -> None:
        ticket = TicketResponse(
            id=uuid4(),
            owner_id=self.owner_id,
            title="Fix checkout",
            description="Resolve the checkout failure.",
            priority="HIGH",
            status="PENDING",
            assignee="Aisha",
            source="SLACK",
            created_at=datetime.now(timezone.utc),
        )
        repository = FakeTicketRepository([ticket])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.patch(
            f"/api/tickets/{ticket.id}",
            json={
                "title": "Updated checkout",
                "description": "Resolve and document the checkout failure.",
                "priority": "MEDIUM",
                "status": "IN_PROGRESS",
                "assignee": "Noah",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Updated checkout")
        self.assertEqual(response.json()["source"], "SLACK")
        self.assertEqual(repository.ticket_update[1], self.owner_id)

    def test_full_update_returns_404_for_unknown_owner_ticket(self) -> None:
        app.dependency_overrides[get_ticket_repository] = MissingTicketRepository

        response = client.patch(
            f"/api/tickets/{uuid4()}",
            json={
                "title": "Updated checkout",
                "description": "Resolve the checkout failure.",
                "priority": "MEDIUM",
                "status": "IN_PROGRESS",
                "assignee": "Noah",
            },
        )

        self.assertEqual(response.status_code, 404)

    def test_deletes_ticket(self) -> None:
        owner_id = self.owner_id
        ticket_id = uuid4()
        repository = FakeTicketRepository([])
        app.dependency_overrides[get_ticket_repository] = lambda: repository

        response = client.delete(f"/api/tickets/{ticket_id}")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertEqual(repository.deleted_ticket, (ticket_id, owner_id))

    def test_delete_returns_404_for_unknown_owner_ticket(self) -> None:
        app.dependency_overrides[get_ticket_repository] = MissingTicketRepository

        response = client.delete(f"/api/tickets/{uuid4()}")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {"detail": "Ticket was not found for this owner"},
        )
