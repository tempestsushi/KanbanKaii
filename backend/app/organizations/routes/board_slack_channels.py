from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_user_id
from app.organizations.repository import (
    OrganizationRepository,
    OrganizationRepositoryError,
)
from app.organizations.routes.common import (
    get_organization_repository,
    organization_http_error,
)
from app.organizations.schemas import (
    OrganizationBoardSlackChannelCreate,
    OrganizationBoardSlackChannelResponse,
)


router = APIRouter()


@router.get(
    "/{organization_id}/boards/{board_id}/slack-channels",
    response_model=list[OrganizationBoardSlackChannelResponse],
)
async def list_organization_board_slack_channels(
    organization_id: UUID,
    board_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationBoardSlackChannelResponse]:
    try:
        return await run_in_threadpool(
            repository.list_board_slack_channels,
            organization_id,
            board_id,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.post(
    "/{organization_id}/boards/{board_id}/slack-channels",
    response_model=OrganizationBoardSlackChannelResponse,
    status_code=201,
)
async def add_organization_board_slack_channel(
    organization_id: UUID,
    board_id: UUID,
    request: OrganizationBoardSlackChannelCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationBoardSlackChannelResponse:
    try:
        return await run_in_threadpool(
            repository.add_board_slack_channel,
            organization_id,
            board_id,
            request.slack_team_id,
            request.slack_channel_id,
            request.slack_channel_name,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete(
    "/{organization_id}/boards/{board_id}/slack-channels/{slack_team_id}/{slack_channel_id}",
    status_code=204,
)
async def remove_organization_board_slack_channel(
    organization_id: UUID,
    board_id: UUID,
    slack_team_id: str,
    slack_channel_id: str,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(
            repository.remove_board_slack_channel,
            organization_id,
            board_id,
            slack_team_id,
            slack_channel_id,
        )
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)
