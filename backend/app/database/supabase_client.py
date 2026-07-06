from supabase import Client, create_client

from app.core.config import get_supabase_service_role_key, get_supabase_url


class SupabaseConfigurationError(RuntimeError):
    """Raised when backend-only Supabase credentials are missing."""


def get_supabase_admin_client() -> Client:
    """Create a service-role client for trusted backend operations only."""
    url = get_supabase_url()
    service_role_key = get_supabase_service_role_key()

    if not url.strip():
        raise SupabaseConfigurationError("SUPABASE_URL is not configured")
    if not service_role_key.strip():
        raise SupabaseConfigurationError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured"
        )

    return create_client(url, service_role_key)


def get_supabase_user_client(access_token: str) -> Client:
    """Create a PostgREST client that executes queries with one user's JWT."""
    if not access_token.strip():
        raise SupabaseConfigurationError("A Supabase access token is required")

    client = get_supabase_admin_client()
    client.postgrest.auth(access_token)
    return client
