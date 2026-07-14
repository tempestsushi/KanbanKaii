import os
from dataclasses import dataclass

from app.redis.rate_limiter import AIRateLimit


class SlackConfigurationError(RuntimeError):
    """Raised when required Slack OAuth settings are missing."""


@dataclass(frozen=True)
class SlackOAuthSettings:
    client_id: str
    client_secret: str
    redirect_uri: str
    frontend_return_url: str
    encryption_key: str
    scopes: tuple[str, ...] = (
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "groups:history",
        "groups:read",
        "im:history",
        "mpim:read",
        "users:read",
    )


def get_slack_oauth_settings() -> SlackOAuthSettings:
    client_id = os.environ.get("SLACK_CLIENT_ID", "").strip()
    client_secret = os.environ.get("SLACK_CLIENT_SECRET", "").strip()
    redirect_uri = os.environ.get("SLACK_REDIRECT_URI", "").strip()
    frontend_return_url = os.environ.get(
        "SLACK_FRONTEND_RETURN_URL",
        "http://localhost:5173/settings",
    ).strip()
    encryption_key = os.environ.get("INTEGRATION_ENCRYPTION_KEY", "").strip()

    if not client_id:
        raise SlackConfigurationError("SLACK_CLIENT_ID is not configured")
    if not client_secret:
        raise SlackConfigurationError("SLACK_CLIENT_SECRET is not configured")
    if not redirect_uri:
        raise SlackConfigurationError("SLACK_REDIRECT_URI is not configured")
    if not redirect_uri.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise SlackConfigurationError("SLACK_REDIRECT_URI must be an HTTPS URL")
    if not frontend_return_url.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise SlackConfigurationError("SLACK_FRONTEND_RETURN_URL must be an HTTPS URL")
    if not encryption_key:
        raise SlackConfigurationError("INTEGRATION_ENCRYPTION_KEY is not configured")

    return SlackOAuthSettings(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        frontend_return_url=frontend_return_url,
        encryption_key=encryption_key,
    )


def get_slack_signing_secret() -> str:
    signing_secret = os.environ.get("SLACK_SIGNING_SECRET", "").strip()
    if not signing_secret:
        raise SlackConfigurationError("SLACK_SIGNING_SECRET is not configured")
    return signing_secret


def get_slack_ai_rate_limit() -> AIRateLimit:
    try:
        requests = int(os.environ.get("SLACK_AI_RATE_LIMIT_REQUESTS", "10"))
        window_seconds = int(os.environ.get("SLACK_AI_RATE_LIMIT_WINDOW_SECONDS", "60"))
    except ValueError as error:
        raise SlackConfigurationError(
            "Slack AI rate-limit settings must be integers"
        ) from error
    if requests < 1 or window_seconds < 1:
        raise SlackConfigurationError(
            "Slack AI rate-limit settings must be positive"
        )
    return AIRateLimit(requests=requests, window_seconds=window_seconds)
