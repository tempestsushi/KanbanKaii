import os
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.redis.client import (
    RedisConfigurationError,
    get_arq_redis_settings,
    get_redis_client,
    validated_redis_url,
)
from app.routes.health import get_configured_redis_client


client = TestClient(app)


class FakeRedis:
    def __init__(self, healthy=True) -> None:
        self.healthy = healthy

    async def ping(self):
        return self.healthy


class RedisConfigurationTests(TestCase):
    def tearDown(self) -> None:
        get_redis_client.cache_clear()
        app.dependency_overrides.clear()

    def test_requires_redis_url(self) -> None:
        with patch.dict(os.environ, {"REDIS_URL": ""}):
            with self.assertRaisesRegex(
                RedisConfigurationError,
                "REDIS_URL is not configured",
            ):
                validated_redis_url()

    def test_rejects_non_redis_url(self) -> None:
        with patch.dict(os.environ, {"REDIS_URL": "http://localhost:6379"}):
            with self.assertRaisesRegex(RedisConfigurationError, "redis://"):
                validated_redis_url()

    def test_arq_uses_configured_redis_database(self) -> None:
        with patch.dict(os.environ, {"REDIS_URL": "redis://localhost:6379/3"}):
            settings = get_arq_redis_settings()

        self.assertEqual(settings.host, "localhost")
        self.assertEqual(settings.port, 6379)
        self.assertEqual(settings.database, 3)

    def test_redis_health_route(self) -> None:
        app.dependency_overrides[get_configured_redis_client] = lambda: FakeRedis()

        response = client.get("/health/redis")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "redis"},
        )
