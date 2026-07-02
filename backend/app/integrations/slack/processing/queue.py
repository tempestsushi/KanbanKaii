from arq.connections import ArqRedis
from redis.exceptions import RedisError


SLACK_JOB_FUNCTION = "process_slack_event"


class SlackQueueError(RuntimeError):
    """Raised when a persisted Slack event cannot be queued."""


class SlackJobQueue:
    def __init__(self, redis: ArqRedis) -> None:
        self.redis = redis

    async def enqueue(self, event_id: str) -> bool:
        """Queue one event ID; return False if that ARQ job already exists."""
        try:
            job = await self.redis.enqueue_job(
                SLACK_JOB_FUNCTION,
                event_id,
                _job_id=f"slack:{event_id}",
            )
        except (RedisError, OSError) as error:
            raise SlackQueueError("Redis could not queue the Slack event") from error
        return job is not None
