from __future__ import annotations

import json
import logging
from typing import Any, NoReturn
from uuid import UUID

from postgrest.exceptions import APIError
from pydantic import ValidationError
from supabase import Client

from app.organizations.schemas import (
    AssignableRole,
    MyOrganizationInvitation,
    OrganizationInviteResponse,
    OrganizationMemberResponse,
    OrganizationResponse,
)


logger = logging.getLogger("kanbankaii.organizations.repository")


class OrganizationRepositoryError(RuntimeError):
    pass


class OrganizationPermissionError(OrganizationRepositoryError):
    pass


class OrganizationConflictError(OrganizationRepositoryError):
    pass


class OrganizationNotFoundError(OrganizationRepositoryError):
    pass


class OrganizationInputError(OrganizationRepositoryError):
    pass


def _raise_database_error(error: APIError, fallback: str) -> NoReturn:
    if error.code == "42501":
        raise OrganizationPermissionError(error.message) from error
    if error.code == "23505":
        raise OrganizationConflictError("Organization data already exists") from error
    if error.code in {"22023", "23514"}:
        raise OrganizationInputError(error.message) from error
    raise OrganizationRepositoryError(fallback) from error


def _uuid_result(data: Any) -> UUID:
    value = data[0] if isinstance(data, list) and len(data) == 1 else data
    try:
        return UUID(str(value))
    except (TypeError, ValueError) as error:
        raise OrganizationRepositoryError("Supabase returned an invalid identifier") from error


class OrganizationRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create(self, name: str, slug: str) -> OrganizationResponse:
        try:
            result = self.client.rpc(
                "create_organization", {"p_name": name, "p_slug": slug}
            ).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not create the organization")
        return self.get(_uuid_result(result.data))

    def list(self) -> list[OrganizationResponse]:
        try:
            result = self.client.table("organizations").select("*").order("created_at").execute()
            return [
                OrganizationResponse.model_validate_json(json.dumps(row))
                for row in result.data
            ]
        except (APIError, ValidationError, TypeError) as error:
            raise OrganizationRepositoryError("Supabase could not load organizations") from error

    def get(self, organization_id: UUID) -> OrganizationResponse:
        try:
            result = self.client.table("organizations").select("*").eq("id", str(organization_id)).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not load the organization")
        rows = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise OrganizationNotFoundError("Organization was not found")
        try:
            return OrganizationResponse.model_validate_json(json.dumps(rows[0]))
        except ValidationError as error:
            raise OrganizationRepositoryError("Supabase returned an invalid organization") from error

    def delete(self, organization_id: UUID, confirmation_slug: str) -> None:
        try:
            self.client.rpc(
                "delete_organization",
                {
                    "p_organization_id": str(organization_id),
                    "p_confirmation_slug": confirmation_slug,
                },
            ).execute()
        except APIError as error:
            if error.code == "23503":
                raise OrganizationConflictError(
                    "Organization tickets must be resolved before deletion"
                ) from error
            _raise_database_error(error, "Supabase could not delete the organization")

    def list_members(self, organization_id: UUID) -> list[OrganizationMemberResponse]:
        try:
            result = self.client.rpc(
                "list_organization_members_with_profiles",
                {"p_organization_id": str(organization_id)},
            ).execute()
            return [
                OrganizationMemberResponse.model_validate_json(json.dumps(row))
                for row in result.data
            ]
        except (APIError, ValidationError, TypeError) as error:
            raise OrganizationRepositoryError("Supabase could not load organization members") from error

    def change_role(self, organization_id: UUID, user_id: UUID, role: AssignableRole) -> OrganizationMemberResponse:
        try:
            self.client.rpc("change_organization_member_role", {
                "p_organization_id": str(organization_id), "p_user_id": str(user_id), "p_role": role,
            }).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not change the member role")
        members = [member for member in self.list_members(organization_id) if member.user_id == user_id]
        if len(members) != 1:
            raise OrganizationNotFoundError("Organization member was not found")
        return members[0]

    def remove_member(self, organization_id: UUID, user_id: UUID) -> None:
        try:
            self.client.rpc("remove_organization_member", {
                "p_organization_id": str(organization_id), "p_user_id": str(user_id),
            }).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not remove the member")

    def leave(self, organization_id: UUID) -> None:
        try:
            self.client.rpc(
                "leave_organization",
                {"p_organization_id": str(organization_id)},
            ).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not leave the organization")

    def create_invite(self, organization_id: UUID, token_hash: str, intended_email: str | None, role: AssignableRole, expires_at: str) -> OrganizationInviteResponse:
        try:
            result = self.client.rpc("create_organization_invite", {
                "p_organization_id": str(organization_id), "p_token_hash": token_hash,
                "p_intended_email": intended_email or "", "p_default_role": role,
                "p_expires_at": expires_at,
            }).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not create the invitation")
        invite_id = _uuid_result(result.data)
        invites = [invite for invite in self.list_invites(organization_id) if invite.id == invite_id]
        if len(invites) != 1:
            raise OrganizationRepositoryError("Supabase did not return the invitation")
        return invites[0]

    def list_invites(self, organization_id: UUID) -> list[OrganizationInviteResponse]:
        columns = "id,organization_id,intended_email,default_role,created_by,created_at,expires_at,accepted_at,accepted_by,revoked_at,declined_at,declined_by"
        try:
            result = self.client.table("organization_invites").select(columns).eq(
                "organization_id", str(organization_id)
            ).order("created_at", desc=True).execute()
            return [
                OrganizationInviteResponse.model_validate_json(json.dumps(row))
                for row in result.data
            ]
        except (APIError, ValidationError, TypeError) as error:
            raise OrganizationRepositoryError("Supabase could not load invitations") from error

    def accept_invite(self, token_hash: str) -> UUID:
        try:
            result = self.client.rpc("accept_organization_invite", {"p_token_hash": token_hash}).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not accept the invitation")
        return _uuid_result(result.data)

    def list_my_invitations(self) -> list[MyOrganizationInvitation]:
        try:
            result = self.client.rpc(
                "list_my_organization_invitations", {}
            ).execute()
            return [
                MyOrganizationInvitation.model_validate_json(json.dumps(row))
                for row in result.data
            ]
        except (APIError, ValidationError, TypeError) as error:
            if isinstance(error, APIError):
                logger.error(
                    "Supabase invitation inbox failed code=%s message=%s details=%s hint=%s",
                    error.code,
                    error.message,
                    error.details,
                    error.hint,
                )
                if error.code in {"PGRST202", "42883"}:
                    raise OrganizationRepositoryError(
                        "Invitation inbox is not installed in Supabase. Apply migration 202607060015 and reload the Supabase schema cache."
                    ) from error
                _raise_database_error(error, "Supabase could not load your invitations")
            logger.exception("Supabase returned invalid invitation inbox data")
            raise OrganizationRepositoryError("Supabase could not load your invitations") from error

    def accept_invite_by_id(self, invite_id: UUID) -> UUID:
        try:
            result = self.client.rpc(
                "accept_organization_invitation_by_id",
                {"p_invite_id": str(invite_id)},
            ).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not accept the invitation")
        return _uuid_result(result.data)

    def decline_invite(self, invite_id: UUID) -> None:
        try:
            self.client.rpc(
                "decline_organization_invitation",
                {"p_invite_id": str(invite_id)},
            ).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not decline the invitation")

    def revoke_invite(self, invite_id: UUID) -> None:
        try:
            self.client.rpc("revoke_organization_invite", {"p_invite_id": str(invite_id)}).execute()
        except APIError as error:
            _raise_database_error(error, "Supabase could not revoke the invitation")
