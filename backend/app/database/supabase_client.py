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
