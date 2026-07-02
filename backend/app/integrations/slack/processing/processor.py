from starlette.concurrency import run_in_threadpool

from app.core.logging import get_application_logger
from app.database.ticket_repository import TicketRepository
from app.integrations.slack.processing.message import prepare_slack_message
from app.integrations.slack.data.repository import SlackMentionTarget, SlackRepository
from app.integrations.slack.schemas import SlackEvent
from app.integrations.slack.services.users import SlackUserService
from app.schemas.triage import AIAnalysisResult, IncomingMessage
from app.services.ollama_service import OllamaService
from app.services.ticket_factory import create_ticket_from_analysis


logger = get_application_logger("slack.processor")


class SlackEventProcessor:
    """Turn one Slack message into private tickets for its connected recipients."""

    def __init__(
        self,
        slack_repository: SlackRepository,
        ticket_repository: TicketRepository,
        ollama_service: OllamaService,
        slack_user_service: SlackUserService | None = None,
    ) -> None:
        self.slack_repository = slack_repository
        self.ticket_repository = ticket_repository
        self.ollama_service = ollama_service
        self.slack_user_service = slack_user_service

    async def process(
        self,
        event_id: str,
        event: SlackEvent,
        targets: list[SlackMentionTarget],
    ) -> None:
        try:
            logger.info("Slack triage started event_id=%s", event_id)
            await run_in_threadpool(
                self.slack_repository.update_webhook_delivery,
                event_id,
                "PROCESSING",
            )

            prepared_text = prepare_slack_message(
                event.text or "",
                [target.slack_user_id for target in targets],
            )
            if not prepared_text:
                await run_in_threadpool(
                    self.slack_repository.update_webhook_delivery,
                    event_id,
                    "COMPLETED",
                    None,
                    "IGNORED_NON_ACTIONABLE",
                    [{"outcome": "IGNORED_EMPTY_MESSAGE"}],
                )
                logger.info("Slack mention-only message ignored event_id=%s", event_id)
                return

            sender_name = event.user or "Slack user"
            if event.user and self.slack_user_service is not None:
                sender_name = await self.slack_user_service.display_name(
                    targets[0].owner_id,
                    event.user,
                )

            message = IncomingMessage(text=prepared_text, user_name=sender_name)
            batch = await self.ollama_service.analyze_tasks(message)
            logger.info(
                "Slack triage analyzed event_id=%s actionable=%s tasks=%s",
                event_id,
                batch.isActionableTask,
                len(batch.tasks),
            )

            results: list[dict[str, object]] = []
            created_count = 0
            if not batch.isActionableTask:
                results = [
                    {
                        "slack_user_id": target.slack_user_id,
                        "outcome": "IGNORED_NON_ACTIONABLE",
                        "analysis": batch.model_dump(mode="json"),
                    }
                    for target in targets
                ]
                logger.info(
                    "Slack message ignored as non-actionable event_id=%s",
                    event_id,
                )
            else:
                for target in targets:
                    ticket_ids: list[str] = []
                    for extracted in batch.tasks:
                        analysis = AIAnalysisResult(
                            isActionableTask=True,
                            extractedTitle=extracted.title,
                            cleanDescription=extracted.description,
                            estimatedPriority=extracted.priority,
                        )
                        ticket_data = create_ticket_from_analysis(
                            owner_id=target.owner_id,
                            message=message,
                            analysis=analysis,
                            source="SLACK",
                            assignee=sender_name,
                        )
                        ticket = await run_in_threadpool(
                            self.ticket_repository.create,
                            ticket_data,
                        )
                        ticket_ids.append(str(ticket.id))
                        created_count += 1
                        logger.info(
                            "Slack ticket created event_id=%s ticket_id=%s owner_id=%s; Supabase Realtime broadcast is now eligible",
                            event_id,
                            ticket.id,
                            target.owner_id,
                        )
                    results.append(
                        {
                            "slack_user_id": target.slack_user_id,
                            "outcome": "TICKET_CREATED",
                            "ticket_ids": ticket_ids,
                            "analysis": batch.model_dump(mode="json"),
                        }
                    )

            outcome = "TICKET_CREATED" if created_count else "IGNORED_NON_ACTIONABLE"
            await run_in_threadpool(
                self.slack_repository.update_webhook_delivery,
                event_id,
                "COMPLETED",
                None,
                outcome,
                results,
            )
            logger.info(
                "Slack triage completed event_id=%s outcome=%s tickets=%s",
                event_id,
                outcome,
                created_count,
            )
        except Exception as error:
            logger.exception("Slack event processing failed", extra={"event_id": event_id})
            try:
                await run_in_threadpool(
                    self.slack_repository.update_webhook_delivery,
                    event_id,
                    "FAILED",
                    str(error)[:1000],
                    "PROCESSING_FAILED",
                )
            except Exception:
                logger.exception(
                    "Could not mark Slack event as failed",
                    extra={"event_id": event_id},
                )
            raise
