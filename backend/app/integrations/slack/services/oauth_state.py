from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError


OAUTH_STATE_TTL_SECONDS = 600
OAUTH_STATE_KEY_PREFIX = "oauth:slack:state:"


class SlackOAuthStateStoreError(RuntimeError):
    """Raised when Redis cannot store or consume Slack OAuth state."""


class SlackOAuthStateError(SlackOAuthStateStoreError):
    """Raised when an OAuth state is missing, expired, or already consumed."""


class SlackOAuthStateStore:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def create(self, owner_id: UUID, state_hash: str) -> None:
        try:
            stored = await self.redis.set(
                f"{OAUTH_STATE_KEY_PREFIX}{state_hash}",
                str(owner_id),
                ex=OAUTH_STATE_TTL_SECONDS,
                nx=True,
            )
        except (RedisError, OSError) as error:
            raise SlackOAuthStateStoreError(
                "Redis could not store the Slack OAuth state"
            ) from error
        if stored is not True:
            raise SlackOAuthStateStoreError("Slack OAuth state collision")

    async def consume(self, state_hash: str) -> UUID:
        try:
            owner_id = await self.redis.getdel(
                f"{OAUTH_STATE_KEY_PREFIX}{state_hash}"
            )
        except (RedisError, OSError) as error:
            raise SlackOAuthStateStoreError(
                "Redis could not consume the Slack OAuth state"
            ) from error
        if owner_id is None:
            raise SlackOAuthStateError(
                "Slack OAuth state is invalid, expired, or already used"
            )
        try:
            return UUID(str(owner_id))
        except ValueError as error:
            raise SlackOAuthStateStoreError(
                "Redis returned an invalid Slack OAuth owner"
            ) from error
