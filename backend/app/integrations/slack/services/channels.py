import logging
from uuid import UUID

import httpx

from app.integrations.slack.data.repository import SlackRepository, SlackRepositoryError
from app.integrations.slack.security.encryption import TokenCipher, TokenEncryptionError


SLACK_CONVERSATIONS_INFO_URL = "https://slack.com/api/conversations.info"
logger = logging.getLogger(__name__)


class SlackChannelService:
    """Resolve Slack channel IDs to readable names without blocking ticket creation."""

    def __init__(
        self,
        repository: SlackRepository,
        token_cipher: TokenCipher,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.repository = repository
        self.token_cipher = token_cipher
        self.http_client = http_client

    async def display_name(
        self,
        owner_id: UUID,
        slack_channel_id: str | None,
        channel_type: str | None = None,
    ) -> str | None:
        if not slack_channel_id:
            return None
        if channel_type == "im":
            return "Direct message"
        if channel_type == "mpim":
            return "Group direct message"

        try:
            installation = self.repository.get_installation(owner_id)
            if installation is None:
                logger.info(
                    "Slack channel name skipped because installation was not found",
                    extra={"slack_channel_id": slack_channel_id},
                )
                return None
            token = self.token_cipher.decrypt(installation.token_ciphertext)
            payload = await self._get_channel(token, slack_channel_id)
            if payload.get("ok") is not True:
                logger.warning(
                    "Slack channel lookup returned non-ok response",
                    extra={
                        "slack_channel_id": slack_channel_id,
                        "slack_error": payload.get("error"),
                    },
                )
                return None

            channel = payload.get("channel")
            if not isinstance(channel, dict):
                logger.warning(
                    "Slack channel lookup returned invalid channel payload",
                    extra={"slack_channel_id": slack_channel_id},
                )
                return None
            for field in ("name_normalized", "name"):
                value = channel.get(field)
                if isinstance(value, str) and value.strip():
                    resolved = value.strip().lstrip("#")
                    logger.info(
                        "Slack channel name resolved",
                        extra={
                            "slack_channel_id": slack_channel_id,
                            "slack_channel_name": resolved,
                        },
                    )
                    return resolved
            logger.warning(
                "Slack channel lookup did not include a readable name",
                extra={"slack_channel_id": slack_channel_id},
            )
            return None
        except (SlackRepositoryError, TokenEncryptionError, httpx.HTTPError, ValueError, TypeError):
            logger.warning(
                "Could not resolve Slack channel display name",
                extra={"slack_channel_id": slack_channel_id},
            )
            return None

    async def _get_channel(self, token: str, slack_channel_id: str) -> dict:
        if self.http_client is not None:
            response = await self.http_client.get(
                SLACK_CONVERSATIONS_INFO_URL,
                params={"channel": slack_channel_id},
                headers={"Authorization": f"Bearer {token}"},
            )
        else:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    SLACK_CONVERSATIONS_INFO_URL,
                    params={"channel": slack_channel_id},
                    headers={"Authorization": f"Bearer {token}"},
                )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Slack returned invalid channel data")
        return payload
