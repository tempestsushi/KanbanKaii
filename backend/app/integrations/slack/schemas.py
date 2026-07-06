from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SlackConnectResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    authorization_url: str


class SlackTeam(BaseModel):
    id: str
    name: str


class SlackAuthedUser(BaseModel):
    id: str


class SlackUserInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    is_owner: bool = False
    is_primary_owner: bool = False


class SlackUserInfoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ok: bool
    error: str | None = None
    user: SlackUserInfo | None = None


class SlackOAuthAccessResponse(BaseModel):
    ok: bool
    error: str | None = None
    access_token: str | None = None
    scope: str = ""
    bot_user_id: str | None = None
    team: SlackTeam | None = None
    authed_user: SlackAuthedUser | None = None


class SlackConnectionStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    connected: bool
    workspace_name: str | None = None


class OrganizationSlackBindingStatus(BaseModel):
    # Supabase/PostgREST serializes timestamptz values as ISO-8601 strings.
    model_config = ConfigDict(extra="forbid")

    connected: bool
    workspace_name: str | None = None
    slack_team_id: str | None = None
    verified_at: datetime | None = None


class SlackStoredInstallation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    integration_id: str
    workspace_name: str
    token_ciphertext: str


class SlackRevokedTokens(BaseModel):
    model_config = ConfigDict(extra="ignore")

    oauth: list[str] = Field(default_factory=list)
    bot: list[str] = Field(default_factory=list)


class SlackEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str
    user: str | None = None
    text: str | None = None
    channel: str | None = None
    ts: str | None = None
    subtype: str | None = None
    bot_id: str | None = None
    tokens: SlackRevokedTokens | None = None


class SlackEventEnvelope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: Literal["url_verification", "event_callback"]
    challenge: str | None = None
    team_id: str | None = None
    event_id: str | None = None
    event: SlackEvent | None = None


class SlackQueuedDelivery(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: str
    payload: dict[str, Any]
