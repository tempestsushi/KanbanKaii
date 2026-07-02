from collections.abc import Iterable
from dataclasses import dataclass
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError


AI_RATE_LIMIT_KEY_PREFIX = "rate_limit:slack_ai:"
AI_RATE_LIMIT_EVENT_KEY_PREFIX = "rate_limit:slack_ai:event:"

# Check every owner before incrementing any counter. This keeps a multi-recipient
# event all-or-nothing and prevents partially consuming allowances.
_ACQUIRE_SCRIPT = """
local previous = redis.call('GET', KEYS[1])
if previous then
    return tonumber(previous)
end
for i = 2, #KEYS do
    local key = KEYS[i]
    local current = tonumber(redis.call('GET', key) or '0')
    if current >= tonumber(ARGV[1]) then
        redis.call('SET', KEYS[1], 0, 'EX', ARGV[2])
        return 0
    end
end
for i = 2, #KEYS do
    local key = KEYS[i]
    local current = redis.call('INCR', key)
    if current == 1 then
        redis.call('EXPIRE', key, ARGV[2])
    end
end
redis.call('SET', KEYS[1], 1, 'EX', ARGV[2])
return 1
"""


class AIRateLimiterError(RuntimeError):
    """Raised when Redis cannot evaluate the AI allowance."""


@dataclass(frozen=True)
class AIRateLimit:
    requests: int
    window_seconds: int


class PerUserAIRateLimiter:
    def __init__(self, redis: Redis, limit: AIRateLimit) -> None:
        self.redis = redis
        self.limit = limit

    async def acquire(self, event_id: str, owner_ids: Iterable[UUID]) -> bool:
        unique_owner_ids = sorted({str(owner_id) for owner_id in owner_ids})
        if not unique_owner_ids:
            return False
        keys = [
            f"{AI_RATE_LIMIT_EVENT_KEY_PREFIX}{event_id}",
            *(f"{AI_RATE_LIMIT_KEY_PREFIX}{owner_id}" for owner_id in unique_owner_ids),
        ]
        try:
            allowed = await self.redis.eval(
                _ACQUIRE_SCRIPT,
                len(keys),
                *keys,
                self.limit.requests,
                self.limit.window_seconds,
            )
        except (RedisError, OSError) as error:
            raise AIRateLimiterError("Redis could not check the AI rate limit") from error
        return bool(allowed)
