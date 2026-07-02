import hashlib
import secrets
from urllib.parse import urlencode
from uuid import UUID

import httpx

from app.integrations.slack.config import SlackOAuthSettings
from app.integrations.slack.security.encryption import TokenCipher
from app.integrations.slack.data.repository import SlackRepository
from app.integrations.slack.schemas import SlackOAuthAccessResponse
from app.integrations.slack.services.oauth_state import SlackOAuthStateStore


SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
class SlackOAuthError(RuntimeError):
    """Raised when Slack rejects or returns an invalid OAuth exchange."""


class SlackOAuthService:
    def __init__(
        self,
        settings: SlackOAuthSettings,
        repository: SlackRepository,
        token_cipher: TokenCipher,
        state_store: SlackOAuthStateStore,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.token_cipher = token_cipher
        self.state_store = state_store
        self.http_client = http_client

    async def create_authorization_url(self, owner_id: UUID) -> str:
        raw_state = secrets.token_urlsafe(32)
        state_hash = hashlib.sha256(raw_state.encode("utf-8")).hexdigest()
        await self.state_store.create(owner_id, state_hash)

        query = urlencode(
            {
                "client_id": self.settings.client_id,
                "scope": ",".join(self.settings.scopes),
                "redirect_uri": self.settings.redirect_uri,
                "state": raw_state,
            }
        )
        return f"{SLACK_AUTHORIZE_URL}?{query}"

    async def complete_installation(self, code: str, raw_state: str) -> str:
        state_hash = hashlib.sha256(raw_state.encode("utf-8")).hexdigest()
        owner_id = await self.state_store.consume(state_hash)

        request_data = {
            "client_id": self.settings.client_id,
            "client_secret": self.settings.client_secret,
            "code": code,
            "redirect_uri": self.settings.redirect_uri,
        }
        try:
            if self.http_client is not None:
                response = await self.http_client.post(SLACK_TOKEN_URL, data=request_data)
            else:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(SLACK_TOKEN_URL, data=request_data)
            response.raise_for_status()
            oauth_result = SlackOAuthAccessResponse.model_validate(response.json())
        except (httpx.HTTPError, ValueError, TypeError) as error:
            raise SlackOAuthError("Slack OAuth token exchange failed") from error

        if (
            not oauth_result.ok
            or not oauth_result.access_token
            or not oauth_result.team
            or not oauth_result.bot_user_id
            or not oauth_result.authed_user
        ):
            raise SlackOAuthError(
                f"Slack rejected the OAuth request: {oauth_result.error or 'invalid response'}"
            )

        ciphertext = self.token_cipher.encrypt(oauth_result.access_token)
        scopes = [scope for scope in oauth_result.scope.split(",") if scope]
        self.repository.save_installation(
            owner_id=owner_id,
            team_id=oauth_result.team.id,
            team_name=oauth_result.team.name,
            bot_user_id=oauth_result.bot_user_id,
            slack_user_id=oauth_result.authed_user.id,
            token_ciphertext=ciphertext,
            scopes=scopes,
        )
        return oauth_result.team.name
