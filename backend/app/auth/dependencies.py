from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool
from supabase import Client
from supabase_auth.errors import AuthError

from app.database.supabase_client import (
    SupabaseConfigurationError,
    get_supabase_admin_client,
)


bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_client() -> Client:
    try:
        return get_supabase_admin_client()
    except SupabaseConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


async def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    supabase: Annotated[Client, Depends(get_auth_client)],
) -> UUID:
    """Verify a Supabase access token and return its user UUID claim."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = await run_in_threadpool(
            supabase.auth.get_claims,
            credentials.credentials,
        )
        if response is None:
            raise ValueError("Missing JWT claims")

        claims = response["claims"]
        if claims.get("role") != "authenticated":
            raise ValueError("JWT is not an authenticated user token")
        return UUID(str(claims["sub"]))
    except (AuthError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
