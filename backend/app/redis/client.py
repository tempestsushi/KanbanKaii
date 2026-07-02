from functools import lru_cache
from urllib.parse import urlparse

from arq.connections import RedisSettings
from redis.asyncio import Redis

from app.core.config import get_redis_url


class RedisConfigurationError(RuntimeError):
    """Raised when the Redis connection URL is absent or invalid."""


def validated_redis_url() -> str:
    url = get_redis_url()
    if not url:
        raise RedisConfigurationError("REDIS_URL is not configured")
    parsed = urlparse(url)
    if parsed.scheme not in {"redis", "rediss"} or not parsed.hostname:
        raise RedisConfigurationError(
            "REDIS_URL must be a valid redis:// or rediss:// URL"
        )
    return url


@lru_cache(maxsize=1)
def get_redis_client() -> Redis:
    """Return one reusable async Redis connection pool per API process."""
    return Redis.from_url(
        validated_redis_url(),
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        health_check_interval=30,
    )


def get_arq_redis_settings() -> RedisSettings:
    """Use the same Redis URL for the upcoming ARQ worker."""
    return RedisSettings.from_dsn(validated_redis_url())


async def close_redis_client() -> None:
    """Close the cached Redis pool without creating one during shutdown."""
    if get_redis_client.cache_info().currsize:
        await get_redis_client().aclose()
        get_redis_client.cache_clear()
