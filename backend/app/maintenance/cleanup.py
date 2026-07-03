from typing import Any

from app.core.logging import get_application_logger


logger = get_application_logger("maintenance.cleanup")


class IntegrationCleanupError(RuntimeError):
    """Raised when transient integration records cannot be cleaned safely."""


class IntegrationCleanupService:
    def __init__(self, supabase_client: Any) -> None:
        self.client = supabase_client

    def run(self) -> dict[str, int]:
        try:
            response = self.client.rpc(
                "cleanup_integration_transient_data",
            ).execute()
        except Exception as error:
            raise IntegrationCleanupError(
                "Supabase transient-data cleanup failed"
            ) from error

        result = response.data
        if not isinstance(result, dict) or not all(
            isinstance(key, str) and isinstance(value, int)
            for key, value in result.items()
        ):
            raise IntegrationCleanupError(
                "Supabase returned an invalid cleanup result"
            )
        logger.info("Integration cleanup completed result=%s", result)
        return result
