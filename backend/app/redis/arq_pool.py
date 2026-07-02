import asyncio

from arq.connections import ArqRedis, create_pool

from app.redis.client import get_arq_redis_settings


_pool: ArqRedis | None = None
_pool_lock = asyncio.Lock()


async def get_arq_pool() -> ArqRedis:
    """Lazily create one ARQ Redis pool per FastAPI process."""
    global _pool
    if _pool is None:
        async with _pool_lock:
            if _pool is None:
                _pool = await create_pool(get_arq_redis_settings())
    return _pool


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
