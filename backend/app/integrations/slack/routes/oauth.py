from typing import Annotated
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse

from app.auth.dependencies import get_current_user_id
from app.database.supabase_client import SupabaseConfigurationError, get_supabase_admin_client
from app.integrations.slack.config import SlackConfigurationError, get_slack_oauth_settings
from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.services.connection import SlackConnectionError, SlackConnectionService
from app.integrations.slack.services.oauth import SlackOAuthError, SlackOAuthService
from app.integrations.slack.services.oauth_state import (
    SlackOAuthStateError,
    SlackOAuthStateStore,
    SlackOAuthStateStoreError,
)
from app.integrations.slack.data.repository import (
    SlackRepository,
    SlackRepositoryError,
)
from app.integrations.slack.schemas import SlackConnectionStatus, SlackConnectResponse
from app.redis.client import RedisConfigurationError, get_redis_client


router = APIRouter(prefix="/api/integrations/slack", tags=["slack"])


def get_slack_repository() -> SlackRepository:
    try:
        return SlackRepository(get_supabase_admin_client())
    except SupabaseConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def get_slack_oauth_state_store() -> SlackOAuthStateStore:
    try:
        return SlackOAuthStateStore(get_redis_client())
    except RedisConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def get_slack_oauth_service(
    repository: Annotated[SlackRepository, Depends(get_slack_repository)],
    state_store: Annotated[
        SlackOAuthStateStore,
        Depends(get_slack_oauth_state_store),
    ],
) -> SlackOAuthService:
    try:
        settings = get_slack_oauth_settings()
        return SlackOAuthService(
            settings,
            repository,
            TokenCipher(settings.encryption_key),
            state_store,
        )
    except SlackConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def get_slack_connection_service(
    repository: Annotated[SlackRepository, Depends(get_slack_repository)],
) -> SlackConnectionService:
    try:
        settings = get_slack_oauth_settings()
        return SlackConnectionService(
            repository,
            TokenCipher(settings.encryption_key),
        )
    except SlackConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def callback_redirect(result: str, detail: str | None = None) -> RedirectResponse:
    settings = get_slack_oauth_settings()
    query = {"slack": result}
    if detail:
        query["reason"] = detail
    separator = "&" if "?" in settings.frontend_return_url else "?"
    return RedirectResponse(
        f"{settings.frontend_return_url}{separator}{urlencode(query)}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/connect", response_model=SlackConnectResponse)
async def connect_slack(
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    oauth_service: Annotated[SlackOAuthService, Depends(get_slack_oauth_service)],
) -> SlackConnectResponse:
    try:
        authorization_url = await oauth_service.create_authorization_url(owner_id)
        return SlackConnectResponse(authorization_url=authorization_url)
    except SlackOAuthStateStoreError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/callback")
async def slack_callback(
    oauth_service: Annotated[SlackOAuthService, Depends(get_slack_oauth_service)],
    code: Annotated[str | None, Query()] = None,
    state_value: Annotated[str | None, Query(alias="state")] = None,
    oauth_error: Annotated[str | None, Query(alias="error")] = None,
) -> RedirectResponse:
    if oauth_error:
        return callback_redirect("error", "access_denied")
    if not code or not state_value:
        return callback_redirect("error", "missing_callback_parameters")

    try:
        await oauth_service.complete_installation(code, state_value)
        return callback_redirect("connected")
    except SlackOAuthStateError:
        return callback_redirect("error", "invalid_or_expired_state")
    except SlackOAuthStateStoreError:
        return callback_redirect("error", "state_store_unavailable")
    except SlackOAuthError:
        return callback_redirect("error", "oauth_exchange_failed")
    except SlackRepositoryError:
        return callback_redirect("error", "installation_storage_failed")


@router.get("/status", response_model=SlackConnectionStatus)
async def slack_connection_status(
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    connection_service: Annotated[
        SlackConnectionService,
        Depends(get_slack_connection_service),
    ],
) -> SlackConnectionStatus:
    try:
        workspace_name = await connection_service.status(owner_id)
        return SlackConnectionStatus(
            connected=workspace_name is not None,
            workspace_name=workspace_name,
        )
    except (SlackConnectionError, SlackRepositoryError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_slack(
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    connection_service: Annotated[
        SlackConnectionService,
        Depends(get_slack_connection_service),
    ],
) -> Response:
    try:
        await connection_service.disconnect(owner_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (SlackConnectionError, SlackRepositoryError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
