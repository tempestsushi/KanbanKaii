import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.organizations.repository import OrganizationRepository
from app.organizations.schemas import (
    OrganizationInviteCreate,
    OrganizationInviteCreated,
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
