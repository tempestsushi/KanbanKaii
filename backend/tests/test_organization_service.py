from datetime import datetime, timezone
from unittest import TestCase
from uuid import uuid4

from app.organizations.schemas import OrganizationInviteCreate, OrganizationInviteResponse
from app.organizations.service import OrganizationService


class FakeOrganizationRepository:
    def __init__(self) -> None:
        self.received = None

    def create_invite(self, organization_id, token_hash, intended_email, role, expires_at):
        self.received = (organization_id, token_hash, intended_email, role, expires_at)
        now = datetime.now(timezone.utc)
        return OrganizationInviteResponse(
            id=uuid4(), organization_id=organization_id, intended_email=intended_email,
            default_role=role, created_by=uuid4(), created_at=now,
            expires_at=datetime.fromisoformat(expires_at),
        )

    def accept_invite(self, token_hash):
        self.received = token_hash
        return uuid4()


class OrganizationServiceTests(TestCase):
    def test_creates_random_invite_and_stores_only_hash(self) -> None:
        repository = FakeOrganizationRepository()
        organization_id = uuid4()
        created = OrganizationService(repository).create_invite(
            organization_id,
            OrganizationInviteCreate(intended_email="MEMBER@example.com"),
        )

        self.assertNotEqual(created.token, repository.received[1])
        self.assertEqual(len(repository.received[1]), 64)
        self.assertEqual(repository.received[2], "member@example.com")

    def test_acceptance_hashes_raw_token(self) -> None:
        repository = FakeOrganizationRepository()
        OrganizationService(repository).accept_invite("raw-invitation-token")
        self.assertEqual(len(repository.received), 64)
        self.assertNotEqual(repository.received, "raw-invitation-token")
