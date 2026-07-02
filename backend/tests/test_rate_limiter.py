import asyncio
from unittest import TestCase
from uuid import uuid4

from app.redis.rate_limiter import AIRateLimit, PerUserAIRateLimiter


class FakeRedis:
    def __init__(self, results) -> None:
        self.results = iter(results)
        self.calls = []

    async def eval(self, *args):
        self.calls.append(args)
        return next(self.results)


class PerUserAIRateLimiterTests(TestCase):
    def test_allows_request_and_uses_owner_scoped_key(self) -> None:
        redis = FakeRedis([1])
        owner_id = uuid4()
        limiter = PerUserAIRateLimiter(redis, AIRateLimit(10, 60))

        allowed = asyncio.run(limiter.acquire("Ev123", [owner_id]))

        self.assertTrue(allowed)
        self.assertEqual(redis.calls[0][1], 2)
        self.assertEqual(redis.calls[0][2], "rate_limit:slack_ai:event:Ev123")
        self.assertEqual(redis.calls[0][3], f"rate_limit:slack_ai:{owner_id}")
        self.assertEqual(redis.calls[0][-2:], (10, 60))

    def test_rejects_when_redis_script_reports_exhausted_limit(self) -> None:
        limiter = PerUserAIRateLimiter(FakeRedis([0]), AIRateLimit(10, 60))

        self.assertFalse(asyncio.run(limiter.acquire("Ev123", [uuid4()])))

    def test_deduplicates_recipients_before_atomic_check(self) -> None:
        redis = FakeRedis([1])
        owner_id = uuid4()
        limiter = PerUserAIRateLimiter(redis, AIRateLimit(10, 60))

        asyncio.run(limiter.acquire("Ev123", [owner_id, owner_id]))

        self.assertEqual(redis.calls[0][1], 2)

    def test_empty_owner_list_is_not_allowed(self) -> None:
        redis = FakeRedis([])
        limiter = PerUserAIRateLimiter(redis, AIRateLimit(10, 60))

        self.assertFalse(asyncio.run(limiter.acquire("Ev123", [])))
        self.assertEqual(redis.calls, [])
