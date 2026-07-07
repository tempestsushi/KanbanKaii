from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from starlette.concurrency import run_in_threadpool

from app.database.supabase_client import (
    SupabaseConfigurationError,
    get_supabase_user_client,
)
from app.auth.dependencies import bearer_scheme, get_current_user_id
from app.database.ticket_repository import (
    TicketRepository,
    TicketRepositoryError,
    TicketPermissionError,
)
from app.schemas.ticket import (
    ManualTicketCreate,
    OrganizationTicketCreate,
    TicketCreate,
    TicketResponse,
    TicketStatus,
    TicketStatusUpdate,
    TicketUpdate,
)


router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def get_ticket_repository(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> TicketRepository:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return TicketRepository(
            get_supabase_user_client(credentials.credentials)
        )
    except SupabaseConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_ticket(
    request: ManualTicketCreate,
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
) -> TicketResponse:
    ticket = TicketCreate(
        **request.model_dump(),
        owner_id=owner_id,
        source="MANUAL",
    )
    try:
        return await run_in_threadpool(ticket_repository.create, ticket)
    except TicketPermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    except TicketRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
    ticket_status: Annotated[
        TicketStatus | None,
        Query(alias="status", description="Optional ticket status filter"),
    ] = None,
) -> list[TicketResponse]:
    try:
        return await run_in_threadpool(
            ticket_repository.list_for_owner,
            owner_id,
            ticket_status,
        )
    except TicketRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.get("/organizations/{organization_id}", response_model=list[TicketResponse])
async def list_organization_tickets(
    organization_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[TicketRepository, Depends(get_ticket_repository)],
    ticket_status: Annotated[TicketStatus | None, Query(alias="status")] = None,
    view: Annotated[
        Literal["overview", "organization_wide"],
        Query(description="Returns visible organization tickets. Use board_id to filter one project board."),
    ] = "overview",
    board_id: Annotated[
        UUID | None,
        Query(description="Optional project board filter"),
    ] = None,
) -> list[TicketResponse]:
    try:
        return await run_in_threadpool(
            ticket_repository.list_for_organization,
            organization_id,
            ticket_status,
            view,
            board_id,
        )
    except TicketPermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except TicketRepositoryError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post(
    "/organizations/{organization_id}",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization_ticket(
    organization_id: UUID,
    request: OrganizationTicketCreate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[TicketRepository, Depends(get_ticket_repository)],
) -> TicketResponse:
    try:
        return await run_in_threadpool(
            ticket_repository.create_for_organization,
            organization_id,
            request,
        )
    except TicketPermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except TicketRepositoryError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch(
    "/organizations/{organization_id}/{ticket_id}",
    response_model=TicketResponse,
)
async def update_organization_ticket(
    organization_id: UUID,
    ticket_id: UUID,
    update: TicketUpdate,
    _: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[TicketRepository, Depends(get_ticket_repository)],
) -> TicketResponse:
    try:
        return await run_in_threadpool(
            ticket_repository.update_for_organization,
            organization_id,
            ticket_id,
            update,
        )
    except TicketPermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except TicketRepositoryError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.delete(
    "/organizations/{organization_id}/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_organization_ticket(
    organization_id: UUID,
    ticket_id: UUID,
    _: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[TicketRepository, Depends(get_ticket_repository)],
) -> Response:
    try:
        await run_in_threadpool(
            ticket_repository.delete_for_organization,
            organization_id,
            ticket_id,
        )
        return Response(status_code=204)
    except TicketPermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except TicketRepositoryError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: UUID,
    update: TicketStatusUpdate,
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
) -> TicketResponse:
    try:
        return await run_in_threadpool(
            ticket_repository.update_status,
            ticket_id,
            owner_id,
            update.status,
        )
    except TicketPermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    except TicketRepositoryError as error:
        if str(error) == "Ticket was not found or status update is not permitted":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    update: TicketUpdate,
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
) -> TicketResponse:
    try:
        return await run_in_threadpool(
            ticket_repository.update,
            ticket_id,
            owner_id,
            update,
        )
    except TicketRepositoryError as error:
        if str(error) == "Ticket was not found for this owner":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    ticket_id: UUID,
    owner_id: Annotated[UUID, Depends(get_current_user_id)],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
) -> Response:
    try:
        await run_in_threadpool(
            ticket_repository.delete,
            ticket_id,
            owner_id,
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except TicketRepositoryError as error:
        if str(error) == "Ticket was not found for this owner":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
