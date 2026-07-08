import asyncio
from types import SimpleNamespace
from unittest import TestCase
from uuid import uuid4

from cryptography.fernet import Fernet

from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.services.users import SlackUserService


class FakeRepository:
    def __init__(self, ciphertext) -> None:
        self.ciphertext = ciphertext

    def get_installation(self, owner_id):
        self.owner_id = owner_id
        return SimpleNamespace(token_ciphertext=self.ciphertext)


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "ok": True,
            "user": {
                "name": "aisha",
                "profile": {
                    "display_name": "Aisha",
                    "real_name": "Aisha Khan",
                },
            },
        }


class FakeHTTPClient:
    async def get(self, url, params, headers):
        self.request = (url, params, headers)
        return FakeResponse()


class SlackUserServiceTests(TestCase):
    def test_resolves_sender_display_name(self) -> None:
        owner_id = uuid4()
        cipher = TokenCipher(Fernet.generate_key().decode("utf-8"))
        repository = FakeRepository(cipher.encrypt("test-bot-token"))
        client = FakeHTTPClient()
        service = SlackUserService(repository, cipher, client)

        name = asyncio.run(service.display_name(owner_id, "U-AISHA"))

        self.assertEqual(name, "Aisha")
        self.assertEqual(repository.owner_id, owner_id)
        self.assertEqual(client.request[1], {"user": "U-AISHA"})
        self.assertEqual(
            client.request[2]["Authorization"],
            "Bearer test-bot-token",
        )
