from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


OrganizationRole = Literal["OWNER", "TEAM_LEAD", "MEMBER", "VIEWER"]
AssignableRole = Literal["TEAM_LEAD", "MEMBER", "VIEWER"]


class OrganizationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=2, max_length=63)


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: UUID
    name: str
    slug: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class OrganizationDelete(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    confirmation_slug: str = Field(min_length=2, max_length=63)


class OrganizationMemberResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    organization_id: UUID
    user_id: UUID
    role: OrganizationRole
    invited_by: UUID | None = None
    joined_at: datetime


class OrganizationMemberRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    role: AssignableRole


class OrganizationInviteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    intended_email: str | None = Field(default=None, min_length=3, max_length=320)
    default_role: AssignableRole = "MEMBER"
    expires_in_hours: int = Field(default=72, ge=1, le=720)


class OrganizationInviteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: UUID
    organization_id: UUID
    intended_email: str | None = None
    default_role: AssignableRole
    created_by: UUID
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None = None
    accepted_by: UUID | None = None
    revoked_at: datetime | None = None


class OrganizationInviteCreated(OrganizationInviteResponse):
    token: str


class OrganizationInviteAccepted(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    organization_id: UUID
