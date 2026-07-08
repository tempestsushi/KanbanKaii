import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from starlette.concurrency import run_in_threadpool

from app.organizations.repository import OrganizationRepository
from app.organizations.invite_store import (
    OrganizationInviteStore,
    RedisInviteDraft,
)
from app.organizations.schemas import (
    OrganizationInviteCreate,
    OrganizationInviteCreated,
    OrganizationInviteResponse,
)


class OrganizationService:
    def __init__(self, repository: OrganizationRepository) -> None:
        self.repository = repository

    def create_invite(
        self,
        organization_id: UUID,
        request: OrganizationInviteCreate,
    ) -> OrganizationInviteCreated:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_in_hours)
        invite = self.repository.create_invite(
            organization_id,
            token_hash,
            request.intended_email.lower(),
            request.default_role,
            expires_at.isoformat(),
        )
        return OrganizationInviteCreated(**invite.model_dump(), token=token)

    def accept_invite(self, token: str) -> UUID:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return self.repository.accept_invite(token_hash)


class RedisOrganizationInviteService:
    def __init__(
        self,
        repository: OrganizationRepository,
        invite_store: OrganizationInviteStore,
    ) -> None:
        self.repository = repository
        self.invite_store = invite_store

    async def create_invite(
        self,
        organization_id: UUID,
        request: OrganizationInviteCreate,
        created_by: UUID,
    ) -> OrganizationInviteCreated:
        await run_in_threadpool(
            self.repository.ensure_invite_manager,
            organization_id,
            created_by,
        )
        organization = await run_in_threadpool(self.repository.get, organization_id)
        token = secrets.token_urlsafe(32)
        token_hash = self.hash_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_in_hours)
        invite = await self.invite_store.create(
            RedisInviteDraft(
                organization_id=organization_id,
                organization_name=organization.name,
                organization_slug=organization.slug,
                intended_email=request.intended_email,
                default_role=request.default_role,
                created_by=created_by,
                expires_at=expires_at,
                token_hash=token_hash,
            )
        )
        return OrganizationInviteCreated(**invite.model_dump(), token=token)

    async def accept_invite(self, invite: OrganizationInviteResponse) -> UUID:
        return await run_in_threadpool(
            self.repository.accept_redis_invite,
            invite.organization_id,
            invite.default_role,
            invite.created_by,
            invite.intended_email or "",
        )

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
