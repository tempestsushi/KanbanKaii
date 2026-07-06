import json
from dataclasses import dataclass
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError


OAUTH_STATE_TTL_SECONDS = 600
OAUTH_STATE_KEY_PREFIX = "oauth:slack:state:"


class SlackOAuthStateStoreError(RuntimeError):
    """Raised when Redis cannot store or consume Slack OAuth state."""


class SlackOAuthStateError(SlackOAuthStateStoreError):
    """Raised when an OAuth state is missing, expired, or already consumed."""


@dataclass(frozen=True)
class SlackOAuthContext:
    owner_id: UUID
    organization_id: UUID | None = None

    @property
    def purpose(self) -> str:
        return "ORGANIZATION_BINDING" if self.organization_id else "PERSONAL_CONNECTION"


class SlackOAuthStateStore:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def create(
        self,
        owner_id: UUID,
        state_hash: str,
        organization_id: UUID | None = None,
    ) -> None:
        payload = json.dumps({
            "owner_id": str(owner_id),
            "organization_id": str(organization_id) if organization_id else None,
        })
        try:
            stored = await self.redis.set(
                f"{OAUTH_STATE_KEY_PREFIX}{state_hash}",
                payload,
                ex=OAUTH_STATE_TTL_SECONDS,
                nx=True,
            )
        except (RedisError, OSError) as error:
            raise SlackOAuthStateStoreError(
                "Redis could not store the Slack OAuth state"
            ) from error
        if stored is not True:
            raise SlackOAuthStateStoreError("Slack OAuth state collision")

    async def consume(self, state_hash: str) -> SlackOAuthContext:
        try:
            payload = await self.redis.getdel(
                f"{OAUTH_STATE_KEY_PREFIX}{state_hash}"
            )
        except (RedisError, OSError) as error:
            raise SlackOAuthStateStoreError(
                "Redis could not consume the Slack OAuth state"
            ) from error
        if payload is None:
            raise SlackOAuthStateError(
                "Slack OAuth state is invalid, expired, or already used"
            )
        raw_payload = str(payload)
        try:
            decoded = json.loads(raw_payload)
            return SlackOAuthContext(
                owner_id=UUID(decoded["owner_id"]),
                organization_id=(
                    UUID(decoded["organization_id"])
                    if decoded.get("organization_id")
                    else None
                ),
            )
        except json.JSONDecodeError:
            try:
                return SlackOAuthContext(owner_id=UUID(raw_payload))
            except ValueError as error:
                raise SlackOAuthStateStoreError(
                    "Redis returned an invalid Slack OAuth owner"
                ) from error
        except (KeyError, TypeError, ValueError) as error:
            raise SlackOAuthStateStoreError(
                "Redis returned an invalid Slack OAuth owner"
            ) from error
