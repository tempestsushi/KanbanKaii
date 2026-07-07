from typing import Annotated, NoReturn

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.auth.dependencies import bearer_scheme
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
