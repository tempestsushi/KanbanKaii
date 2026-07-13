from typing import Any

from arq import cron
from starlette.concurrency import run_in_threadpool

from app.database.supabase_client import get_supabase_admin_client
from app.database.ticket_repository import TicketRepository
from app.integrations.slack.config import get_slack_oauth_settings
from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.processing.processor import SlackEventProcessor
from app.integrations.slack.processing.queued_processor import SlackQueuedEventHandler
from app.integrations.slack.data.repository import SlackRepository
from app.integrations.slack.services.users import SlackUserService
from app.redis.client import get_arq_redis_settings
from app.services.model_service import get_ai_model_service
from app.maintenance.cleanup import IntegrationCleanupService


async def startup(ctx: dict[str, Any]) -> None:
    """Build long-lived worker services once, not once per job."""
    supabase_client = get_supabase_admin_client()
    repository = SlackRepository(supabase_client)
    settings = get_slack_oauth_settings()
    processor = SlackEventProcessor(
        slack_repository=repository,
        ticket_repository=TicketRepository(repository.client),
        ollama_service=get_ai_model_service(),
        slack_user_service=SlackUserService(
            repository,
            TokenCipher(settings.encryption_key),
        ),
    )
    ctx["slack_handler"] = SlackQueuedEventHandler(repository, processor)
    ctx["integration_cleanup"] = IntegrationCleanupService(supabase_client)


async def process_slack_event(ctx: dict[str, Any], event_id: str) -> None:
    handler: SlackQueuedEventHandler = ctx["slack_handler"]
    await handler.handle(event_id)


async def cleanup_integration_data(ctx: dict[str, Any]) -> None:
    service: IntegrationCleanupService = ctx["integration_cleanup"]
    await run_in_threadpool(service.run)


class WorkerSettings:
    functions = [process_slack_event]
    cron_jobs = [
        cron(
            cleanup_integration_data,
            hour=3,
            minute=15,
            run_at_startup=True,
            unique=True,
        ),
    ]
    on_startup = startup
    redis_settings = get_arq_redis_settings()
    max_jobs = 3
    max_tries = 3
    job_timeout = 180
    keep_result = 3600
    retry_jobs = True
