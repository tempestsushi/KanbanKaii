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
) -> TicketCreate:
    """Convert an actionable AI analysis into validated ticket data."""
    if not analysis.isActionableTask:
        raise NonActionableMessageError(
            "A ticket cannot be created from a non-actionable message"
        )

    return TicketCreate(
        owner_id=owner_id,
        title=analysis.extractedTitle,
        description=analysis.cleanDescription,
        priority=analysis.estimatedPriority,
        status="PENDING",
        assignee=assignee or message.user_name,
        source=source,
    )
