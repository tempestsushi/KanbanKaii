from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.redis.client import RedisConfigurationError, get_redis_client


router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


def get_configured_redis_client() -> Redis:
    try:
        return get_redis_client()
    except RedisConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.get("/health/redis")
async def redis_health_check(
    redis: Annotated[Redis, Depends(get_configured_redis_client)],
) -> dict[str, str]:
    try:
        healthy = await redis.ping()
    except (RedisError, OSError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis is unavailable",
        ) from error
    if healthy is not True:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis health check failed",
        )
    return {"status": "ok", "service": "redis"}
