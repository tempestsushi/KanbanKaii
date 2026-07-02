import asyncio
import hashlib
import os
from unittest import TestCase
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user_id
from app.integrations.slack.config import SlackOAuthSettings
from app.integrations.slack.services.connection import SlackConnectionService
from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.services.oauth import SlackOAuthService
from app.integrations.slack.routes.oauth import (
    get_slack_oauth_service,
    get_slack_repository,
    get_slack_connection_service,
)
from app.main import app


client = TestClient(app)


def slack_settings(encryption_key: str | None = None) -> SlackOAuthSettings:
    return SlackOAuthSettings(
        client_id="123.456",
        client_secret="client-secret",
        redirect_uri="http://localhost:8000/api/integrations/slack/callback",
        frontend_return_url="http://localhost:5173/settings",
        encryption_key=encryption_key or Fernet.generate_key().decode("utf-8"),
    )


class FakeSlackRepository:
    def __init__(self) -> None:
        self.saved_installation = None
        self.owner_id = uuid4()
        self.workspace_name = None

    def save_installation(self, **values) -> None:
        self.saved_installation = values

    def get_connection_status(self, owner_id: UUID) -> str | None:
        self.status_owner_id = owner_id
        return self.workspace_name


class FakeOAuthStateStore:
    def __init__(self, owner_id=None) -> None:
        self.owner_id = owner_id or uuid4()
        self.saved_state = None

    async def create(self, owner_id, state_hash) -> None:
        self.saved_state = (owner_id, state_hash)

    async def consume(self, state_hash):
        self.consumed_state_hash = state_hash
        return self.owner_id


class FakeSlackResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self):
        return {
            "ok": True,
            "access_token": "xoxb-secret-token",
            "scope": "app_mentions:read,chat:write",
            "bot_user_id": "U-BOT",
            "team": {"id": "T-WORKSPACE", "name": "Acme Engineering"},
            "authed_user": {"id": "U-INSTALLER"},
        }


class FakeHTTPClient:
    def __init__(self) -> None:
        self.request = None

    async def post(self, url, data):
        self.request = (url, data)
        return FakeSlackResponse()


class FakeSlackOAuthService:
    def __init__(self) -> None:
        self.owner_id = None
        self.callback = None

    async def create_authorization_url(self, owner_id: UUID) -> str:
        self.owner_id = owner_id
        return "https://slack.com/oauth/v2/authorize?state=test"

    async def complete_installation(self, code: str, state: str) -> str:
        self.callback = (code, state)
        return "Acme Engineering"


class FakeSlackConnectionService:
    def __init__(self, workspace_name=None) -> None:
        self.workspace_name = workspace_name
        self.status_owner_id = None
        self.disconnected_owner_id = None

    async def status(self, owner_id):
        self.status_owner_id = owner_id
        return self.workspace_name

    async def disconnect(self, owner_id):
        self.disconnected_owner_id = owner_id


class SlackIntegrationTests(TestCase):
    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_oauth_service_hashes_state_and_builds_authorization_url(self) -> None:
        owner_id = uuid4()
        repository = FakeSlackRepository()
        state_store = FakeOAuthStateStore(owner_id)
        settings = slack_settings()
        service = SlackOAuthService(
            settings,
            repository,
            TokenCipher(settings.encryption_key),
            state_store,
        )

        authorization_url = asyncio.run(service.create_authorization_url(owner_id))
        query = parse_qs(urlparse(authorization_url).query)

        self.assertEqual(query["client_id"], ["123.456"])
        self.assertEqual(query["scope"], ["channels:history,users:read"])
        raw_state = query["state"][0]
        self.assertEqual(state_store.saved_state[0], owner_id)
        self.assertEqual(
            state_store.saved_state[1],
            hashlib.sha256(raw_state.encode("utf-8")).hexdigest(),
        )

    def test_token_cipher_encrypts_and_decrypts_token(self) -> None:
        cipher = TokenCipher(Fernet.generate_key().decode("utf-8"))

        ciphertext = cipher.encrypt("xoxb-secret-token")

        self.assertNotIn("xoxb-secret-token", ciphertext)
        self.assertEqual(cipher.decrypt(ciphertext), "xoxb-secret-token")

    def test_complete_installation_exchanges_and_encrypts_token(self) -> None:
        repository = FakeSlackRepository()
        http_client = FakeHTTPClient()
        settings = slack_settings()
        cipher = TokenCipher(settings.encryption_key)
        state_store = FakeOAuthStateStore(repository.owner_id)
        service = SlackOAuthService(
            settings,
            repository,
            cipher,
            state_store,
            http_client,
        )

        workspace_name = asyncio.run(
            service.complete_installation("oauth-code", "raw-state")
        )

        self.assertEqual(workspace_name, "Acme Engineering")
        self.assertEqual(repository.saved_installation["owner_id"], repository.owner_id)
        self.assertEqual(repository.saved_installation["team_id"], "T-WORKSPACE")
        self.assertEqual(
            repository.saved_installation["slack_user_id"], "U-INSTALLER"
        )
        self.assertEqual(
            cipher.decrypt(repository.saved_installation["token_ciphertext"]),
            "xoxb-secret-token",
        )
        self.assertEqual(
            repository.saved_installation["scopes"],
            ["app_mentions:read", "chat:write"],
        )

    def test_connect_route_uses_authenticated_owner(self) -> None:
        owner_id = uuid4()
        service = FakeSlackOAuthService()
        app.dependency_overrides[get_current_user_id] = lambda: owner_id
        app.dependency_overrides[get_slack_oauth_service] = lambda: service

        response = client.post("/api/integrations/slack/connect")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(service.owner_id, owner_id)

    def test_callback_completes_installation_and_redirects(self) -> None:
        service = FakeSlackOAuthService()
        app.dependency_overrides[get_slack_oauth_service] = lambda: service
        environment = {
            "SLACK_CLIENT_ID": "123.456",
            "SLACK_CLIENT_SECRET": "client-secret",
            "SLACK_REDIRECT_URI": "http://localhost:8000/api/integrations/slack/callback",
            "SLACK_FRONTEND_RETURN_URL": "http://localhost:5173/settings",
            "INTEGRATION_ENCRYPTION_KEY": Fernet.generate_key().decode("utf-8"),
        }

        with patch.dict(os.environ, environment):
            response = client.get(
                "/api/integrations/slack/callback",
                params={"code": "oauth-code", "state": "raw-state"},
                follow_redirects=False,
            )

        self.assertEqual(response.status_code, 303)
        self.assertEqual(service.callback, ("oauth-code", "raw-state"))
        self.assertEqual(
            response.headers["location"],
            "http://localhost:5173/settings?slack=connected",
        )

    def test_status_route_returns_workspace(self) -> None:
        owner_id = uuid4()
        service = FakeSlackConnectionService("Acme Engineering")
        app.dependency_overrides[get_current_user_id] = lambda: owner_id
        app.dependency_overrides[get_slack_connection_service] = lambda: service

        response = client.get("/api/integrations/slack/status")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"connected": True, "workspace_name": "Acme Engineering"},
        )
        self.assertEqual(service.status_owner_id, owner_id)

    def test_disconnect_route_uses_authenticated_owner(self) -> None:
        owner_id = uuid4()
        service = FakeSlackConnectionService("Acme Engineering")
        app.dependency_overrides[get_current_user_id] = lambda: owner_id
        app.dependency_overrides[get_slack_connection_service] = lambda: service

        response = client.delete("/api/integrations/slack")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(service.disconnected_owner_id, owner_id)
