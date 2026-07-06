import json
from typing import Any
from uuid import UUID

from pydantic import ValidationError
from postgrest.exceptions import APIError
from supabase import Client

from app.database.supabase_client import get_supabase_admin_client
from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketStatus,
    TicketUpdate,
)


class TicketRepositoryError(RuntimeError):
    """Raised when a ticket cannot be stored or read back safely."""


class TicketPermissionError(TicketRepositoryError):
    """Raised when RLS or a guarded database function denies an operation."""


class TicketRepository:
    """Store validated tickets in Supabase."""

    def __init__(self, client: Client | None = None) -> None:
        self.client = client or get_supabase_admin_client()

    def create(self, ticket: TicketCreate) -> TicketResponse:
        """Insert one ticket and validate the row returned by Supabase."""
        payload = ticket.model_dump(mode="json")

        try:
            result = self.client.table("tickets").insert(payload).execute()
        except Exception as exc:
            raise TicketRepositoryError("Supabase could not create the ticket") from exc

        rows: Any = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise TicketRepositoryError(
                "Supabase did not return exactly one created ticket"
            )

        try:
            return TicketResponse.model_validate_json(json.dumps(rows[0]))
        except ValidationError as exc:
            raise TicketRepositoryError(
                "Supabase returned an invalid ticket record"
            ) from exc

    def list_for_owner(
        self,
        owner_id: UUID,
        ticket_status: TicketStatus | None = None,
    ) -> list[TicketResponse]:
        """Return one owner's tickets, optionally filtered by status."""
        try:
            query = (
                self.client.table("tickets")
                .select("*")
                .eq("owner_id", str(owner_id))
            )
            if ticket_status is not None:
                query = query.eq("status", ticket_status)
            result = query.order("created_at", desc=True).execute()
        except Exception as exc:
            raise TicketRepositoryError("Supabase could not load tickets") from exc

        rows: Any = result.data
        if not isinstance(rows, list):
            raise TicketRepositoryError("Supabase returned an invalid ticket list")

        try:
            return [
                TicketResponse.model_validate_json(json.dumps(row))
                for row in rows
            ]
        except ValidationError as exc:
            raise TicketRepositoryError(
                "Supabase returned an invalid ticket record"
            ) from exc

    def update_status(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        new_status: TicketStatus,
    ) -> TicketResponse:
        """Use the RLS-aware status function for an authorized assignee."""
        try:
            result = (
                self.client.rpc(
                    "update_assigned_ticket_status",
                    {
                        "p_ticket_id": str(ticket_id),
                        "p_status": new_status,
                    },
                )
                .execute()
            )
        except APIError as exc:
            if exc.code == "42501":
                raise TicketPermissionError(
                    "Ticket status update is not permitted"
                ) from exc
            raise TicketRepositoryError(
                "Supabase could not update the ticket status"
            ) from exc
        except Exception as exc:
            raise TicketRepositoryError(
                "Supabase could not update the ticket status"
            ) from exc

        rows: Any = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise TicketRepositoryError(
                "Ticket was not found or status update is not permitted"
            )

        try:
            return TicketResponse.model_validate_json(json.dumps(rows[0]))
        except ValidationError as exc:
            raise TicketRepositoryError(
                "Supabase returned an invalid ticket record"
            ) from exc

    def update(
        self,
        ticket_id: UUID,
        owner_id: UUID,
        changes: TicketUpdate,
    ) -> TicketResponse:
        """Update editable fields on one owner-scoped ticket."""
        try:
            result = (
                self.client.table("tickets")
                .update(changes.model_dump(mode="json"))
                .eq("id", str(ticket_id))
                .eq("owner_id", str(owner_id))
                .execute()
            )
        except Exception as exc:
            raise TicketRepositoryError("Supabase could not update the ticket") from exc

        rows: Any = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise TicketRepositoryError("Ticket was not found for this owner")

        try:
            return TicketResponse.model_validate_json(json.dumps(rows[0]))
        except ValidationError as exc:
            raise TicketRepositoryError(
                "Supabase returned an invalid ticket record"
            ) from exc

    def delete(self, ticket_id: UUID, owner_id: UUID) -> None:
        """Delete a ticket only when it belongs to the given owner."""
        try:
            result = (
                self.client.table("tickets")
                .delete()
                .eq("id", str(ticket_id))
                .eq("owner_id", str(owner_id))
                .execute()
            )
        except Exception as exc:
            raise TicketRepositoryError("Supabase could not delete the ticket") from exc

        rows: Any = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise TicketRepositoryError("Ticket was not found for this owner")
