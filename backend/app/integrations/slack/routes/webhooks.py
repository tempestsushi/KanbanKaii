import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.integrations.slack.config import (
    SlackConfigurationError,
    get_slack_ai_rate_limit,
    get_slack_signing_secret,
)
from app.integrations.slack.data.repository import SlackRepository, SlackRepositoryError
from app.integrations.slack.routes.oauth import get_slack_repository
from app.integrations.slack.schemas import SlackEventEnvelope
from app.integrations.slack.security.signature import SlackSignatureError, SlackSignatureVerifier
from app.integrations.slack.processing.queue import SlackJobQueue, SlackQueueError
from app.redis.arq_pool import get_arq_pool
from app.redis.client import RedisConfigurationError, get_redis_client
from app.redis.rate_limiter import AIRateLimiterError, PerUserAIRateLimiter
from redis.exceptions import RedisError
from app.core.logging import get_application_logger
from app.integrations.slack.processing.message import prepare_slack_message


router = APIRouter(prefix="/api/webhooks/slack", tags=["slack-webhooks"])
logger = get_application_logger("slack.webhook")


def get_slack_signature_verifier() -> SlackSignatureVerifier:
    try:
        return SlackSignatureVerifier(get_slack_signing_secret())
    except SlackConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


async def get_slack_job_queue() -> SlackJobQueue:
    try:
        return SlackJobQueue(await get_arq_pool())
    except (RedisConfigurationError, RedisError, OSError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis queue is unavailable",
        ) from error


def get_slack_ai_rate_limiter() -> PerUserAIRateLimiter:
    try:
        return PerUserAIRateLimiter(get_redis_client(), get_slack_ai_rate_limit())
    except (RedisConfigurationError, SlackConfigurationError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis rate limiter is unavailable",
        ) from error


@router.post("/events")
async def receive_slack_event(
    request: Request,
    verifier: Annotated[
        SlackSignatureVerifier,
        Depends(get_slack_signature_verifier),
    ],
    repository: Annotated[SlackRepository, Depends(get_slack_repository)],
    job_queue: Annotated[SlackJobQueue, Depends(get_slack_job_queue)],
    rate_limiter: Annotated[
        PerUserAIRateLimiter,
        Depends(get_slack_ai_rate_limiter),
    ],
    slack_timestamp: Annotated[
        str | None,
        Header(alias="X-Slack-Request-Timestamp"),
    ] = None,
    slack_signature: Annotated[
        str | None,
        Header(alias="X-Slack-Signature"),
    ] = None,
) -> dict[str, Any]:
    body = await request.body()
    try:
        verifier.verify(body, slack_timestamp, slack_signature)
    except SlackSignatureError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error

    try:
        raw_payload = json.loads(body)
        envelope = SlackEventEnvelope.model_validate(raw_payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack sent an invalid event payload",
        ) from error

    if envelope.type == "url_verification":
        if not envelope.challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slack URL verification challenge is missing",
            )
        return {"challenge": envelope.challenge}

    if not envelope.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack event identity is missing",
        )

    if envelope.event is not None and envelope.event.type == "app_uninstalled":
        try:
            await run_in_threadpool(
                repository.delete_team_installations,
                envelope.team_id,
            )
        except SlackRepositoryError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error
        return {"status": "disconnected"}

    if envelope.event is not None and envelope.event.type == "tokens_revoked":
        revoked_tokens = envelope.event.tokens
        try:
            await run_in_threadpool(
                repository.delete_revoked_installations,
                envelope.team_id,
                revoked_tokens.oauth if revoked_tokens else [],
                bool(revoked_tokens and revoked_tokens.bot),
            )
        except SlackRepositoryError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(error),
            ) from error
        return {"status": "disconnected"}

    if (
        envelope.event is None
        or envelope.event.type != "message"
        or envelope.event.subtype is not None
        or envelope.event.bot_id is not None
    ):
        return {"status": "ignored"}
    if not envelope.event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack event identity is missing",
        )

    if not envelope.event.text:
        return {"status": "ignored"}

    try:
        targets = await run_in_threadpool(
            repository.find_mentioned_targets,
            envelope.team_id,
            envelope.event.text,
        )
        if not targets:
            return {"status": "ignored"}
        if not prepare_slack_message(
            envelope.event.text,
            [target.slack_user_id for target in targets],
        ):
            logger.info(
                "Slack mention-only message ignored before persistence event_id=%s",
                envelope.event_id,
            )
            return {"status": "ignored"}
        claimed = await run_in_threadpool(
            repository.claim_webhook_delivery,
            envelope.event_id,
            raw_payload,
        )
    except SlackRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    try:
        allowed = await rate_limiter.acquire(
            envelope.event_id,
            (target.owner_id for target in targets),
        )
    except AIRateLimiterError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    if not allowed:
        if claimed:
            try:
                await run_in_threadpool(
                    repository.update_webhook_delivery,
                    envelope.event_id,
                    "COMPLETED",
                    None,
                    "IGNORED_NON_ACTIONABLE",
                    [{"outcome": "RATE_LIMITED"}],
                )
            except SlackRepositoryError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=str(error),
                ) from error
        logger.warning(
            "Slack AI rate limit reached event_id=%s owner_ids=%s",
            envelope.event_id,
            [str(target.owner_id) for target in targets],
        )
        return {"status": "rate_limited"}

    try:
        await job_queue.enqueue(envelope.event_id)
    except SlackQueueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    logger.info(
        "Slack event queued event_id=%s team_id=%s duplicate=%s",
        envelope.event_id,
        envelope.team_id,
        not claimed,
    )
    return {"status": "accepted" if claimed else "duplicate"}
