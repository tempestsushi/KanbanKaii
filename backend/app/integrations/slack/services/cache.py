import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError


logger = logging.getLogger(__name__)


class SlackCacheInvalidator:
    """Best-effort cleanup for derived Slack lookup state stored in Redis."""

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def invalidate_organization(self, organization_id: str) -> None:
        await self._delete_patterns(
            [
                f"slack:organization:{organization_id}:*",
                f"slack:board-channel:{organization_id}:*",
            ]
        )

    async def invalidate_channel_mapping(
        self,
        organization_id: str,
        slack_team_id: str,
        slack_channel_id: str,
    ) -> None:
        await self._delete_patterns(
            [
                f"slack:organization:{organization_id}:*",
                f"slack:board-channel:{organization_id}:{slack_team_id}:{slack_channel_id}",
                f"slack:channel-name:{slack_team_id}:{slack_channel_id}",
            ]
        )

    async def _delete_patterns(self, patterns: list[str]) -> None:
        try:
            async with self.redis.pipeline(transaction=False) as pipeline:
                for pattern in patterns:
                    async for key in self.redis.scan_iter(match=pattern, count=100):
                        pipeline.delete(key)
                await pipeline.execute()
        except (RedisError, OSError):
            logger.warning("Slack Redis cache invalidation failed", exc_info=True)
