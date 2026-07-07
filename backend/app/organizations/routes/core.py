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
    OrganizationCreate,
    OrganizationDelete,
    OrganizationResponse,
)


router = APIRouter()


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


@router.post("/{organization_id}/leave", status_code=204)
async def leave_organization(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    repository: Annotated[OrganizationRepository, Depends(get_organization_repository)],
) -> Response:
    try:
        await run_in_threadpool(repository.leave, organization_id)
        return Response(status_code=204)
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
