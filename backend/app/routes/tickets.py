from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from starlette.concurrency import run_in_threadpool

from app.database.supabase_client import SupabaseConfigurationError
from app.auth.dependencies import get_current_user_id
from app.database.ticket_repository import (
    TicketRepository,
    TicketRepositoryError,
)
from app.schemas.ticket import (
    ManualTicketCreate,
    TicketCreate,
    TicketResponse,
    TicketStatus,
    TicketStatusUpdate,
    TicketUpdate,
)


router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def get_ticket_repository() -> TicketRepository:
    try:
        return TicketRepository()
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
