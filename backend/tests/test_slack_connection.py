import asyncio
from types import SimpleNamespace
from unittest import TestCase
from uuid import uuid4

from cryptography.fernet import Fernet

from app.integrations.slack.services.connection import (
    SLACK_AUTH_REVOKE_URL,
    SLACK_AUTH_TEST_URL,
    SlackConnectionService,
)
from app.integrations.slack.security.encryption import TokenCipher


class FakeRepository:
    def __init__(self, installation=None) -> None:
        self.installation = installation
        self.deleted_owner = None

    def get_installation(self, owner_id):
        self.loaded_owner = owner_id
        return self.installation

    def delete_owner_installation(self, owner_id):
        self.deleted_owner = owner_id


class FakeResponse:
    def __init__(self, payload) -> None:
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeHTTPClient:
    def __init__(self, payload) -> None:
        self.payload = payload
        self.requests = []

    async def post(self, url, headers):
        self.requests.append((url, headers))
        return FakeResponse(self.payload)


def configured_service(payload):
    owner_id = uuid4()
    cipher = TokenCipher(Fernet.generate_key().decode("utf-8"))
    repository = FakeRepository(
        SimpleNamespace(
            workspace_name="Acme Engineering",
            token_ciphertext=cipher.encrypt("test-bot-token"),
        )
    )
    http_client = FakeHTTPClient(payload)
    return owner_id, repository, http_client, SlackConnectionService(
        repository,
        cipher,
        http_client,
    )


class SlackConnectionServiceTests(TestCase):
    def test_valid_token_reports_connected_workspace(self) -> None:
        owner_id, repository, client, service = configured_service({"ok": True})

        workspace = asyncio.run(service.status(owner_id))

        self.assertEqual(workspace, "Acme Engineering")
        self.assertIsNone(repository.deleted_owner)
        self.assertEqual(client.requests[0][0], SLACK_AUTH_TEST_URL)
        self.assertEqual(
            client.requests[0][1]["Authorization"],
            "Bearer test-bot-token",
        )

    def test_revoked_token_removes_stale_installation(self) -> None:
        owner_id, repository, _, service = configured_service(
            {"ok": False, "error": "token_revoked"}
        )

        workspace = asyncio.run(service.status(owner_id))

        self.assertIsNone(workspace)
        self.assertEqual(repository.deleted_owner, owner_id)

    def test_disconnect_revokes_token_then_removes_installation(self) -> None:
        owner_id, repository, client, service = configured_service({"ok": True})

        asyncio.run(service.disconnect(owner_id))

        self.assertEqual(client.requests[0][0], SLACK_AUTH_REVOKE_URL)
        self.assertEqual(repository.deleted_owner, owner_id)
