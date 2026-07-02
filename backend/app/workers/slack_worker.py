from typing import Any

from app.database.supabase_client import get_supabase_admin_client
from app.database.ticket_repository import TicketRepository
from app.integrations.slack.config import get_slack_oauth_settings
from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.processing.processor import SlackEventProcessor
from app.integrations.slack.processing.queued_processor import SlackQueuedEventHandler
from app.integrations.slack.data.repository import SlackRepository
from app.integrations.slack.services.users import SlackUserService
from app.redis.client import get_arq_redis_settings
from app.services.ollama_service import get_ollama_service


async def startup(ctx: dict[str, Any]) -> None:
    """Build long-lived worker services once, not once per job."""
    repository = SlackRepository(get_supabase_admin_client())
    settings = get_slack_oauth_settings()
    processor = SlackEventProcessor(
        slack_repository=repository,
        ticket_repository=TicketRepository(repository.client),
        ollama_service=get_ollama_service(),
        slack_user_service=SlackUserService(
            repository,
            TokenCipher(settings.encryption_key),
        ),
    )
    ctx["slack_handler"] = SlackQueuedEventHandler(repository, processor)


async def process_slack_event(ctx: dict[str, Any], event_id: str) -> None:
    handler: SlackQueuedEventHandler = ctx["slack_handler"]
    await handler.handle(event_id)


class WorkerSettings:
    functions = [process_slack_event]
    on_startup = startup
    redis_settings = get_arq_redis_settings()
    max_jobs = 1
    max_tries = 3
    job_timeout = 180
    keep_result = 3600
    retry_jobs = True
