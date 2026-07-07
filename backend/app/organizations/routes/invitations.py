from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Response
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_user_id
from app.organizations.repository import (
    OrganizationNotFoundError,
    OrganizationRepository,
    OrganizationRepositoryError,
)
from app.organizations.routes.common import (
    get_organization_repository,
    organization_http_error,
)
from app.organizations.schemas import (
    MyOrganizationInvitation,
    OrganizationInviteAccepted,
    OrganizationInviteCreate,
    OrganizationInviteCreated,
    OrganizationInviteResponse,
)
from app.organizations.service import OrganizationService


router = APIRouter()


@router.post("/invites/{token}/accept", response_model=OrganizationInviteAccepted)
async def accept_organization_invite(
    token: Annotated[str, Path(min_length=32, max_length=200)],
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationInviteAccepted:
    try:
        organization_id = await run_in_threadpool(
            OrganizationService(repository).accept_invite,
            token,
        )
        return OrganizationInviteAccepted(organization_id=organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.get("/invitations/pending", response_model=list[MyOrganizationInvitation])
async def list_my_organization_invitations(
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[MyOrganizationInvitation]:
    try:
        return await run_in_threadpool(repository.list_my_invitations)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.post("/invitations/{invite_id}/accept", response_model=OrganizationInviteAccepted)
async def accept_in_app_organization_invitation(
    invite_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationInviteAccepted:
    try:
        organization_id = await run_in_threadpool(repository.accept_invite_by_id, invite_id)
        return OrganizationInviteAccepted(organization_id=organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.post("/invitations/{invite_id}/decline", status_code=204)
async def decline_in_app_organization_invitation(
    invite_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(repository.decline_invite, invite_id)
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.post("/{organization_id}/invites", response_model=OrganizationInviteCreated, status_code=201)
async def create_organization_invite(
    organization_id: UUID,
    request: OrganizationInviteCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationInviteCreated:
    try:
        return await run_in_threadpool(
            OrganizationService(repository).create_invite,
            organization_id,
            request,
        )
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.get("/{organization_id}/invites", response_model=list[OrganizationInviteResponse])
async def list_organization_invites(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationInviteResponse]:
    try:
        return await run_in_threadpool(repository.list_invites, organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete("/{organization_id}/invites/{invite_id}", status_code=204)
async def revoke_organization_invite(
    organization_id: UUID,
    invite_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(repository.get, organization_id)
        invites = await run_in_threadpool(repository.list_invites, organization_id)
        if not any(invite.id == invite_id for invite in invites):
            raise OrganizationNotFoundError("Organization invitation was not found")
        await run_in_threadpool(repository.revoke_invite, invite_id)
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)
