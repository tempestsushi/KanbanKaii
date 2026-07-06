import asyncio
import json
from unittest import TestCase
from uuid import uuid4

from app.integrations.slack.services.oauth_state import (
    OAUTH_STATE_KEY_PREFIX,
    OAUTH_STATE_TTL_SECONDS,
    SlackOAuthStateError,
    SlackOAuthStateStore,
)


class FakeRedis:
    def __init__(self) -> None:
        self.values = {}
        self.set_call = None

    async def set(self, key, value, ex, nx):
        self.set_call = (key, value, ex, nx)
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def getdel(self, key):
        return self.values.pop(key, None)


class SlackOAuthStateStoreTests(TestCase):
    def test_stores_hashed_state_with_ten_minute_ttl(self) -> None:
        owner_id = uuid4()
        redis = FakeRedis()
        store = SlackOAuthStateStore(redis)

        asyncio.run(store.create(owner_id, "a" * 64))

        self.assertEqual(
            redis.set_call,
            (
                f"{OAUTH_STATE_KEY_PREFIX}{'a' * 64}",
                json.dumps({"owner_id": str(owner_id), "organization_id": None}),
                OAUTH_STATE_TTL_SECONDS,
                True,
            ),
        )

    def test_consumes_state_exactly_once(self) -> None:
        owner_id = uuid4()
        redis = FakeRedis()
        store = SlackOAuthStateStore(redis)
        asyncio.run(store.create(owner_id, "b" * 64))

        context = asyncio.run(store.consume("b" * 64))

        self.assertEqual(context.owner_id, owner_id)
        self.assertIsNone(context.organization_id)
        with self.assertRaisesRegex(SlackOAuthStateError, "already used"):
            asyncio.run(store.consume("b" * 64))

    def test_stores_organization_binding_context(self) -> None:
        owner_id = uuid4()
        organization_id = uuid4()
        redis = FakeRedis()
        store = SlackOAuthStateStore(redis)
        asyncio.run(store.create(owner_id, "c" * 64, organization_id))
        context = asyncio.run(store.consume("c" * 64))
        self.assertEqual(context.owner_id, owner_id)
        self.assertEqual(context.organization_id, organization_id)
        self.assertEqual(context.purpose, "ORGANIZATION_BINDING")

    def test_consumes_legacy_bare_owner_uuid(self) -> None:
        owner_id = uuid4()
        redis = FakeRedis()
        redis.values[f"{OAUTH_STATE_KEY_PREFIX}{'d' * 64}"] = str(owner_id)
        context = asyncio.run(SlackOAuthStateStore(redis).consume("d" * 64))
        self.assertEqual(context.owner_id, owner_id)
        self.assertIsNone(context.organization_id)
