from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import bearer_scheme, get_current_user_id
from app.database.supabase_client import (
    SupabaseConfigurationError,
    get_supabase_user_client,
)
from app.organizations.repository import (
    OrganizationConflictError,
    OrganizationInputError,
    OrganizationNotFoundError,
    OrganizationPermissionError,
    OrganizationRepository,
    OrganizationRepositoryError,
)
from app.organizations.schemas import (
    OrganizationCreate,
    OrganizationDelete,
    OrganizationInviteAccepted,
    OrganizationInviteCreate,
    OrganizationInviteCreated,
    OrganizationInviteResponse,
    OrganizationMemberResponse,
    OrganizationMemberRoleUpdate,
    OrganizationResponse,
)
from app.organizations.service import OrganizationService


router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def get_organization_repository(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> OrganizationRepository:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return OrganizationRepository(
            get_supabase_user_client(credentials.credentials)
        )
    except SupabaseConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def organization_http_error(error: OrganizationRepositoryError) -> NoReturn:
    if isinstance(error, OrganizationPermissionError):
        code = status.HTTP_403_FORBIDDEN
    elif isinstance(error, OrganizationNotFoundError):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, OrganizationConflictError):
        code = status.HTTP_409_CONFLICT
    elif isinstance(error, OrganizationInputError):
        code = status.HTTP_400_BAD_REQUEST
    else:
        code = status.HTTP_502_BAD_GATEWAY
    raise HTTPException(status_code=code, detail=str(error)) from error


@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    request: OrganizationCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationResponse:
    try:
        return await run_in_threadpool(repository.create, request.name, request.slug)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> list[OrganizationResponse]:
    try:
        return await run_in_threadpool(repository.list)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


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


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> OrganizationResponse:
    try:
        return await run_in_threadpool(repository.get, organization_id)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(
    organization_id: UUID,
    request: OrganizationDelete,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(
            repository.delete,
            organization_id,
            request.confirmation_slug,
        )
        return Response(status_code=204)
    except OrganizationRepositoryError as error:
        organization_http_error(error)


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
