import os
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.database.supabase_client import (
    SupabaseConfigurationError,
    get_supabase_admin_client,
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
