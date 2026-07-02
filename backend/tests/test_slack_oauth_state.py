import asyncio
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
                str(owner_id),
                OAUTH_STATE_TTL_SECONDS,
                True,
            ),
        )

    def test_consumes_state_exactly_once(self) -> None:
        owner_id = uuid4()
        redis = FakeRedis()
        store = SlackOAuthStateStore(redis)
        asyncio.run(store.create(owner_id, "b" * 64))

        consumed_owner = asyncio.run(store.consume("b" * 64))

        self.assertEqual(consumed_owner, owner_id)
        with self.assertRaisesRegex(SlackOAuthStateError, "already used"):
            asyncio.run(store.consume("b" * 64))
