from types import SimpleNamespace
from unittest import TestCase
from uuid import uuid4

from postgrest.exceptions import APIError

from app.database.ticket_repository import (
    TicketRepository,
    TicketRepositoryError,
    TicketPermissionError,
)
from app.schemas.ticket import TicketCreate, TicketUpdate


class FakeSupabaseQuery:
    def __init__(self, data=None, error: Exception | None = None) -> None:
        self.data = data
        self.error = error
        self.inserted_payload = None
        self.selected_columns = None
        self.filters = []
        self.ordering = None
        self.updated_payload = None
        self.delete_called = False

    def insert(self, payload):
        self.inserted_payload = payload
        return self

    def select(self, columns):
        self.selected_columns = columns
        return self

    def update(self, payload):
        self.updated_payload = payload
        return self

    def delete(self):
        self.delete_called = True
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column, desc=False):
        self.ordering = (column, desc)
        return self

    def execute(self):
        if self.error:
            raise self.error
        return SimpleNamespace(data=self.data)


class FakeSupabaseClient:
    def __init__(self, query: FakeSupabaseQuery) -> None:
        self.query = query
        self.table_name = None
        self.rpc_name = None
        self.rpc_parameters = None

    def table(self, table_name: str) -> FakeSupabaseQuery:
        self.table_name = table_name
        return self.query

    def rpc(self, function_name: str, parameters: dict) -> FakeSupabaseQuery:
        self.rpc_name = function_name
        self.rpc_parameters = parameters
        return self.query


def make_ticket() -> TicketCreate:
    return TicketCreate(
        owner_id=uuid4(),
        title="Fix checkout",
        description="Resolve the checkout failure.",
        priority="HIGH",
        assignee="Aisha",
        source="SLACK",
    )


class TicketRepositoryTests(TestCase):
    def test_creates_and_validates_ticket(self) -> None:
        ticket = make_ticket()
        ticket_id = uuid4()
        query = FakeSupabaseQuery(
            data=[
                {
                    **ticket.model_dump(mode="json"),
                    "id": str(ticket_id),
                    "created_at": "2026-06-29T10:30:00+00:00",
                }
            ]
        )
        fake_client = FakeSupabaseClient(query)

        created = TicketRepository(client=fake_client).create(ticket)

        self.assertEqual(fake_client.table_name, "tickets")
        self.assertEqual(query.inserted_payload, ticket.model_dump(mode="json"))
        self.assertEqual(created.id, ticket_id)
        self.assertEqual(created.owner_id, ticket.owner_id)
        self.assertEqual(created.status, "PENDING")

    def test_reports_database_failure(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(
                FakeSupabaseQuery(error=RuntimeError("database unavailable"))
            )
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Supabase could not create the ticket",
        ):
            repository.create(make_ticket())

    def test_rejects_missing_created_row(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(FakeSupabaseQuery(data=[]))
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Supabase did not return exactly one created ticket",
        ):
            repository.create(make_ticket())

    def test_lists_owner_tickets_newest_first(self) -> None:
        ticket = make_ticket()
        query = FakeSupabaseQuery(
            data=[
                {
                    **ticket.model_dump(mode="json"),
                    "id": str(uuid4()),
                    "created_at": "2026-06-29T13:14:56.875304Z",
                }
            ]
        )
        fake_client = FakeSupabaseClient(query)

        tickets = TicketRepository(client=fake_client).list_for_owner(
            ticket.owner_id
        )

        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0].owner_id, ticket.owner_id)
        self.assertEqual(query.selected_columns, "*")
        self.assertEqual(
            query.filters,
            [("owner_id", str(ticket.owner_id))],
        )
        self.assertEqual(query.ordering, ("created_at", True))

    def test_reports_ticket_list_failure(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(
                FakeSupabaseQuery(error=RuntimeError("database unavailable"))
            )
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Supabase could not load tickets",
        ):
            repository.list_for_owner(uuid4())

    def test_filters_owner_tickets_by_status(self) -> None:
        owner_id = uuid4()
        query = FakeSupabaseQuery(data=[])

        TicketRepository(
            client=FakeSupabaseClient(query)
        ).list_for_owner(owner_id, "PENDING")

        self.assertEqual(
            query.filters,
            [
                ("owner_id", str(owner_id)),
                ("status", "PENDING"),
            ],
        )

    def test_updates_status_for_owner(self) -> None:
        ticket = make_ticket()
        ticket_id = uuid4()
        query = FakeSupabaseQuery(
            data=[
                {
                    **ticket.model_dump(mode="json"),
                    "id": str(ticket_id),
                    "status": "IN_PROGRESS",
                    "created_at": "2026-06-29T13:14:56.875304Z",
                }
            ]
        )

        fake_client = FakeSupabaseClient(query)
        updated = TicketRepository(client=fake_client).update_status(
            ticket_id,
            ticket.owner_id,
            "IN_PROGRESS",
        )

        self.assertEqual(updated.status, "IN_PROGRESS")
        self.assertEqual(fake_client.rpc_name, "update_assigned_ticket_status")
        self.assertEqual(
            fake_client.rpc_parameters,
            {
                "p_ticket_id": str(ticket_id),
                "p_status": "IN_PROGRESS",
            },
        )

    def test_updates_editable_ticket_fields_for_owner(self) -> None:
        ticket = make_ticket()
        ticket_id = uuid4()
        changes = TicketUpdate(
            title="Updated checkout",
            description="Resolve and document the checkout failure.",
            priority="MEDIUM",
            status="IN_PROGRESS",
            assignee="Noah",
        )
        query = FakeSupabaseQuery(
            data=[
                {
                    **ticket.model_dump(mode="json"),
                    **changes.model_dump(mode="json"),
                    "id": str(ticket_id),
                    "created_at": "2026-06-29T13:14:56.875304Z",
                }
            ]
        )

        updated = TicketRepository(
            client=FakeSupabaseClient(query)
        ).update(ticket_id, ticket.owner_id, changes)

        self.assertEqual(updated.title, "Updated checkout")
        self.assertEqual(updated.assignee, "Noah")
        self.assertEqual(updated.source, "SLACK")
        self.assertEqual(query.updated_payload, changes.model_dump(mode="json"))

    def test_full_update_rejects_unknown_owner_ticket(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(FakeSupabaseQuery(data=[]))
        )
        changes = TicketUpdate(
            title="Updated checkout",
            description="Resolve the checkout failure.",
            priority="MEDIUM",
            status="IN_PROGRESS",
            assignee="Noah",
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Ticket was not found for this owner",
        ):
            repository.update(uuid4(), uuid4(), changes)

    def test_status_update_rejects_unknown_owner_ticket(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(FakeSupabaseQuery(data=[]))
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Ticket was not found or status update is not permitted",
        ):
            repository.update_status(uuid4(), uuid4(), "COMPLETED")

    def test_status_update_reports_database_permission_denial(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(
                FakeSupabaseQuery(
                    error=APIError(
                        {
                            "code": "42501",
                            "message": "Ticket status update is not permitted",
                            "hint": None,
                            "details": None,
                        }
                    )
                )
            )
        )

        with self.assertRaisesRegex(
            TicketPermissionError,
            "Ticket status update is not permitted",
        ):
            repository.update_status(uuid4(), uuid4(), "COMPLETED")

    def test_deletes_ticket_for_owner(self) -> None:
        owner_id = uuid4()
        ticket_id = uuid4()
        query = FakeSupabaseQuery(data=[{"id": str(ticket_id)}])

        TicketRepository(client=FakeSupabaseClient(query)).delete(
            ticket_id,
            owner_id,
        )

        self.assertTrue(query.delete_called)
        self.assertEqual(
            query.filters,
            [
                ("id", str(ticket_id)),
                ("owner_id", str(owner_id)),
            ],
        )

    def test_delete_rejects_unknown_owner_ticket(self) -> None:
        repository = TicketRepository(
            client=FakeSupabaseClient(FakeSupabaseQuery(data=[]))
        )

        with self.assertRaisesRegex(
            TicketRepositoryError,
            "Ticket was not found for this owner",
        ):
            repository.delete(uuid4(), uuid4())
