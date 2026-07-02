from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.triage import AIAnalysisResult, Priority


TicketStatus = Literal["PENDING", "IN_PROGRESS", "COMPLETED"]


class ManualTicketCreate(BaseModel):
    """User-entered ticket fields accepted by the manual creation endpoint."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus = "PENDING"
    assignee: str = Field(min_length=1, max_length=100)


class TicketCreate(BaseModel):
    """Validated ticket data before it is stored."""

    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    owner_id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5_000)
    priority: Priority
    status: TicketStatus = "PENDING"
    assignee: str = Field(min_length=1, max_length=100)
    source: str = Field(min_length=1, max_length=50)


class TicketResponse(TicketCreate):
    """Complete ticket returned by the API after creation."""

    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(
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
