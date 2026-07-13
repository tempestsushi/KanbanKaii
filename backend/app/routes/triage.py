from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from starlette.concurrency import run_in_threadpool

from app.database.supabase_client import SupabaseConfigurationError
from app.database.ticket_repository import (
    TicketRepository,
    TicketRepositoryError,
)
from app.schemas.ticket import TriageResponse
from app.schemas.triage import TriageRequest
from app.services.ai_provider import (
    AIModelConfigurationError,
    AIModelService,
    AIModelServiceError,
    AIModelUnavailableError,
)
from app.services.model_service import get_ai_model_service
from app.services.ticket_factory import create_ticket_from_analysis


router = APIRouter(prefix="/api/webhook", tags=["triage"])


def get_configured_ollama_service() -> AIModelService:
    try:
        return get_ai_model_service()
    except AIModelConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


def get_ticket_repository() -> TicketRepository:
    try:
        return TicketRepository()
    except SupabaseConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.post("/triage", response_model=TriageResponse)
async def triage_message(
    message: TriageRequest,
    response: Response,
    ollama_service: Annotated[
        AIModelService,
        Depends(get_configured_ollama_service),
    ],
    ticket_repository: Annotated[
        TicketRepository,
        Depends(get_ticket_repository),
    ],
) -> TriageResponse:
    try:
        analysis = await ollama_service.analyze(message)
        if not analysis.isActionableTask:
            return TriageResponse(status="ignored", analysis=analysis)

        ticket_data = create_ticket_from_analysis(
            owner_id=message.owner_id,
            message=message,
            analysis=analysis,
            source=message.source,
        )
        ticket = await run_in_threadpool(ticket_repository.create, ticket_data)
        response.status_code = status.HTTP_201_CREATED
        return TriageResponse(
            status="created",
            analysis=analysis,
            ticket=ticket,
        )
    except AIModelUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except AIModelServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    except TicketRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
