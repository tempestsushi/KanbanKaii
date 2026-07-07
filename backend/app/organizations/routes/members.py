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
    OrganizationMemberResponse,
    OrganizationMemberRoleUpdate,
)


router = APIRouter()


@router.get("/{organization_id}/members", response_model=list[OrganizationMemberResponse])
async def list_organization_members(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationMemberResponse]:
    try:
        await run_in_threadpool(repository.get, organization_id)
        return await run_in_threadpool(repository.list_members, organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.patch("/{organization_id}/members/{user_id}/role", response_model=OrganizationMemberResponse)
async def change_member_role(
    organization_id: UUID,
    user_id: UUID,
    request: OrganizationMemberRoleUpdate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationMemberResponse:
    try:
        return await run_in_threadpool(
            repository.change_role, organization_id, user_id, request.role
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete("/{organization_id}/members/{user_id}", status_code=204)
async def remove_member(
    organization_id: UUID,
    user_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(repository.remove_member, organization_id, user_id)
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)
