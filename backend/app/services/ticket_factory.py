from app.schemas.ticket import TicketCreate
from app.schemas.triage import AIAnalysisResult, IncomingMessage
from uuid import UUID


class NonActionableMessageError(ValueError):
    """Raised when an ignored message is passed to the ticket factory."""


def create_ticket_from_analysis(
    owner_id: UUID,
    message: IncomingMessage,
    analysis: AIAnalysisResult,
    source: str,
    assignee: str | None = None,
    scope: str = "PRIVATE",
    organization_id: UUID | None = None,
    board_id: UUID | None = None,
    created_by: UUID | None = None,
    assigned_by_user_id: UUID | None = None,
    assignee_user_id: UUID | None = None,
    requested_by_name: str | None = None,
    source_team_id: str | None = None,
    source_channel_id: str | None = None,
    source_channel_name: str | None = None,
    source_message_ts: str | None = None,
) -> TicketCreate:
    """Convert an actionable AI analysis into validated ticket data."""
    if not analysis.isActionableTask:
        raise NonActionableMessageError(
            "A ticket cannot be created from a non-actionable message"
        )

    return TicketCreate(
        owner_id=owner_id,
        scope=scope,
        organization_id=organization_id,
        board_id=board_id,
        created_by=created_by,
        assigned_by_user_id=assigned_by_user_id,
        assignee_user_id=assignee_user_id,
        title=analysis.extractedTitle,
        description=analysis.cleanDescription,
        priority=analysis.estimatedPriority,
        status="PENDING",
        assignee=assignee or message.user_name,
        source=source,
        requested_by_name=requested_by_name,
        source_team_id=source_team_id,
        source_channel_id=source_channel_id,
        source_channel_name=source_channel_name,
        source_message_ts=source_message_ts,
    )
