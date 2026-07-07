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
    OrganizationBoardCreate,
    OrganizationBoardMemberCreate,
    OrganizationBoardMemberResponse,
    OrganizationBoardMemberRoleUpdate,
    OrganizationBoardResponse,
)


router = APIRouter()


@router.post(
    "/{organization_id}/boards",
    response_model=OrganizationBoardResponse,
    status_code=201,
)
async def create_organization_board(
    organization_id: UUID,
    request: OrganizationBoardCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationBoardResponse:
    try:
        return await run_in_threadpool(
            repository.create_board,
            organization_id,
            request.name,
            request.slug,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.get(
    "/{organization_id}/boards",
    response_model=list[OrganizationBoardResponse],
)
async def list_organization_boards(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationBoardResponse]:
    try:
        return await run_in_threadpool(repository.list_boards, organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete("/{organization_id}/boards/{board_id}", status_code=204)
async def delete_organization_board(
    organization_id: UUID,
    board_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(repository.delete_board, organization_id, board_id)
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.get(
    "/{organization_id}/boards/{board_id}/members",
    response_model=list[OrganizationBoardMemberResponse],
)
async def list_organization_board_members(
    organization_id: UUID,
    board_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationBoardMemberResponse]:
    try:
        return await run_in_threadpool(
            repository.list_board_members,
            organization_id,
            board_id,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.post(
    "/{organization_id}/boards/{board_id}/members",
    response_model=OrganizationBoardMemberResponse,
    status_code=201,
)
async def add_organization_board_member(
    organization_id: UUID,
    board_id: UUID,
    request: OrganizationBoardMemberCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationBoardMemberResponse:
    try:
        return await run_in_threadpool(
            repository.add_board_member,
            organization_id,
            board_id,
            request.user_id,
            request.role,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.patch(
    "/{organization_id}/boards/{board_id}/members/{user_id}/role",
    response_model=OrganizationBoardMemberResponse,
)
async def change_organization_board_member_role(
    organization_id: UUID,
    board_id: UUID,
    user_id: UUID,
    request: OrganizationBoardMemberRoleUpdate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationBoardMemberResponse:
    try:
        return await run_in_threadpool(
            repository.add_board_member,
            organization_id,
            board_id,
            user_id,
            request.role,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete("/{organization_id}/boards/{board_id}/members/{user_id}", status_code=204)
async def remove_organization_board_member(
    organization_id: UUID,
    board_id: UUID,
    user_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(
            repository.remove_board_member,
            organization_id,
            board_id,
            user_id,
        )
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)
