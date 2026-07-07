from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.triage import AIAnalysisResult, Priority


TicketStatus = Literal["PENDING", "IN_PROGRESS", "COMPLETED"]
TicketScope = Literal["PRIVATE", "PERSONAL_ASSIGNMENT", "ORGANIZATION"]
SourceMessageState = Literal["ACTIVE", "DELETED"]


class ManualTicketCreate(BaseModel):
    """User-entered ticket fields accepted by the manual creation endpoint."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus = "PENDING"
    assignee: str = Field(min_length=1, max_length=100)


class OrganizationTicketCreate(BaseModel):
    """Lead-entered formal assignment for one organization member."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus = "PENDING"
    assignee_user_id: UUID


class TicketCreate(BaseModel):
    """Validated ticket data before it is stored."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    owner_id: UUID
    scope: TicketScope = "PRIVATE"
    organization_id: UUID | None = None
    board_id: UUID | None = None
    created_by: UUID | None = None
    assigned_by_user_id: UUID | None = None
    assignee_user_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus = "PENDING"
    assignee: str = Field(min_length=1, max_length=100)
    source: str = Field(min_length=1, max_length=50)
    requested_by_name: str | None = Field(default=None, min_length=1, max_length=100)
    source_team_id: str | None = Field(default=None, min_length=1, max_length=255)
    source_channel_id: str | None = Field(default=None, min_length=1, max_length=255)
    source_message_ts: str | None = Field(default=None, min_length=1, max_length=255)
    source_message_state: SourceMessageState = "ACTIVE"
    source_message_deleted_at: datetime | None = None

    @model_validator(mode="after")
    def validate_scope_relationships(self) -> "TicketCreate":
        if self.scope == "PRIVATE":
            if self.organization_id is not None:
                raise ValueError("Private tickets cannot belong to an organization")
            if self.board_id is not None:
                raise ValueError("Private tickets cannot belong to a board")
            if self.created_by is None:
                self.created_by = self.owner_id
            if self.assignee_user_id is None:
                self.assignee_user_id = self.owner_id
        elif self.organization_id is None:
            raise ValueError("Assigned tickets must belong to an organization")

        if self.source_message_state == "ACTIVE":
            if self.source_message_deleted_at is not None:
                raise ValueError("Active source messages cannot have a deletion time")
        elif self.source_message_deleted_at is None:
            raise ValueError("Deleted source messages require a deletion time")
        return self


class TicketResponse(TicketCreate):
    """Complete ticket returned by the API after creation."""

    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class TicketStatusUpdate(BaseModel):
    """Allowed status change for an existing ticket."""

    model_config = ConfigDict(extra="forbid", strict=True)

    status: TicketStatus


class TicketUpdate(BaseModel):
    """Editable fields for an existing ticket."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus
    assignee: str = Field(min_length=1, max_length=100)


class TriageResponse(BaseModel):
    """Result of triaging a message and optionally storing a ticket."""

    model_config = ConfigDict(extra="forbid", strict=True)

    status: Literal["ignored", "created"]
    analysis: AIAnalysisResult
    ticket: TicketResponse | None = None
