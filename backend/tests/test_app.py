import os
from unittest import TestCase
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.database.supabase_client import (
    SupabaseConfigurationError,
    get_supabase_admin_client,
    get_supabase_user_client,
)
from app.main import app


client = TestClient(app)


class AppTests(TestCase):
    def test_health_check(self) -> None:
        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_supabase_admin_client_requires_server_credentials(self) -> None:
        with patch.dict(
            os.environ,
            {"SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""},
        ):
            with self.assertRaisesRegex(
                SupabaseConfigurationError,
                "SUPABASE_URL is not configured",
            ):
                get_supabase_admin_client()

    def test_user_client_applies_access_token_to_postgrest(self) -> None:
        admin_client = MagicMock()
        with patch(
            "app.database.supabase_client.get_supabase_admin_client",
            return_value=admin_client,
        ):
            result = get_supabase_user_client("user-access-token")

        self.assertIs(result, admin_client)
        admin_client.postgrest.auth.assert_called_once_with("user-access-token")
