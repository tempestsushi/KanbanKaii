from datetime import datetime
from typing import Any
from uuid import UUID
from dataclasses import dataclass

from supabase import Client
from app.integrations.slack.schemas import (
    OrganizationSlackBindingStatus,
    SlackQueuedDelivery,
    SlackStoredInstallation,
)


class SlackRepositoryError(RuntimeError):
    """Raised when Slack integration state cannot be persisted."""


@dataclass(frozen=True)
class SlackMentionTarget:
    owner_id: UUID
    slack_user_id: str


class SlackRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def save_installation(
        self,
        owner_id: UUID,
        team_id: str,
        team_name: str,
        bot_user_id: str,
        slack_user_id: str,
        token_ciphertext: str,
        scopes: list[str],
    ) -> None:
        try:
            result = self.client.rpc(
                "upsert_slack_integration",
                {
                    "p_owner_id": str(owner_id),
                    "p_team_id": team_id,
                    "p_team_name": team_name,
                    "p_bot_user_id": bot_user_id,
                    "p_slack_user_id": slack_user_id,
                    "p_token_ciphertext": token_ciphertext,
                    "p_scopes": scopes,
                },
            ).execute()
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not save the Slack installation"
            ) from exc

        if result.data is None:
            raise SlackRepositoryError(
                "Supabase did not confirm the Slack installation"
            )

    def is_organization_owner(self, owner_id: UUID, organization_id: UUID) -> bool:
        try:
            result = (
                self.client.table("organization_members")
                .select("user_id")
                .eq("organization_id", str(organization_id))
                .eq("user_id", str(owner_id))
                .eq("role", "OWNER")
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not verify the organization owner"
            ) from exc
        return isinstance(result.data, list) and len(result.data) == 1

    def is_organization_member(self, user_id: UUID, organization_id: UUID) -> bool:
        try:
            result = (
                self.client.table("organization_members")
                .select("user_id")
                .eq("organization_id", str(organization_id))
                .eq("user_id", str(user_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not verify organization membership"
            ) from exc
        return isinstance(result.data, list) and len(result.data) == 1

    def bind_organization_workspace(
        self,
        organization_id: UUID,
        owner_id: UUID,
        team_id: str,
        workspace_name: str,
        slack_user_id: str,
        is_primary_owner: bool,
    ) -> None:
        try:
            self.client.rpc(
                "bind_organization_slack_workspace",
                {
                    "p_organization_id": str(organization_id),
                    "p_owner_id": str(owner_id),
                    "p_slack_team_id": team_id,
                    "p_workspace_name": workspace_name,
                    "p_slack_user_id": slack_user_id,
                    "p_is_primary_owner": is_primary_owner,
                },
            ).execute()
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not bind the Slack workspace"
            ) from exc

    def get_organization_binding(
        self,
        organization_id: UUID,
    ) -> OrganizationSlackBindingStatus:
        try:
            result = (
                self.client.table("organization_slack_workspaces")
                .select("slack_team_id,workspace_name,verified_at")
                .eq("organization_id", str(organization_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not load the organization Slack binding"
            ) from exc
        rows = result.data
        if not isinstance(rows, list) or not rows:
            return OrganizationSlackBindingStatus(connected=False)
        return OrganizationSlackBindingStatus(
            connected=True,
            workspace_name=rows[0].get("workspace_name"),
            slack_team_id=rows[0].get("slack_team_id"),
            verified_at=rows[0].get("verified_at"),
        )

    def get_connection_status(self, owner_id: UUID) -> str | None:
        try:
            result = (
                self.client.table("integrations")
                .select("display_name")
                .eq("owner_id", str(owner_id))
                .eq("provider", "SLACK")
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not load the Slack connection"
            ) from exc

        rows: Any = result.data
        if not isinstance(rows, list):
            raise SlackRepositoryError("Supabase returned an invalid Slack connection")
        if not rows:
            return None
        display_name = rows[0].get("display_name")
        if not isinstance(display_name, str) or not display_name:
            raise SlackRepositoryError("Supabase returned an invalid Slack connection")
        return display_name

    def get_installation(self, owner_id: UUID) -> SlackStoredInstallation | None:
        try:
            integration_result = (
                self.client.table("integrations")
                .select("id,display_name")
                .eq("owner_id", str(owner_id))
                .eq("provider", "SLACK")
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not load the Slack installation"
            ) from exc

        rows: Any = integration_result.data
        if not isinstance(rows, list):
            raise SlackRepositoryError("Supabase returned an invalid Slack installation")
        if not rows:
            return None

        integration_id = rows[0].get("id")
        workspace_name = rows[0].get("display_name")
        if not isinstance(integration_id, str) or not isinstance(workspace_name, str):
            raise SlackRepositoryError("Supabase returned an invalid Slack installation")

        try:
            credential_result = (
                self.client.table("integration_credentials")
                .select("access_token_ciphertext")
                .eq("integration_id", integration_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not load Slack credentials"
            ) from exc

        credentials: Any = credential_result.data
        if not isinstance(credentials, list) or len(credentials) != 1:
            raise SlackRepositoryError("Slack credentials were not found")
        ciphertext = credentials[0].get("access_token_ciphertext")
        if not isinstance(ciphertext, str) or not ciphertext:
            raise SlackRepositoryError("Supabase returned invalid Slack credentials")
        return SlackStoredInstallation(
            integration_id=integration_id,
            workspace_name=workspace_name,
            token_ciphertext=ciphertext,
        )

    def delete_owner_installation(self, owner_id: UUID) -> None:
        try:
            result = (
                self.client.table("integrations")
                .delete()
                .eq("owner_id", str(owner_id))
                .eq("provider", "SLACK")
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not remove the Slack installation"
            ) from exc
        if not isinstance(result.data, list):
            raise SlackRepositoryError("Supabase returned an invalid delete result")

    def delete_team_installations(self, team_id: str) -> None:
        try:
            result = (
                self.client.table("integrations")
                .delete()
                .eq("provider", "SLACK")
                .eq("external_account_id", team_id)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not remove uninstalled Slack connections"
            ) from exc
        if not isinstance(result.data, list):
            raise SlackRepositoryError("Supabase returned an invalid delete result")

    def delete_revoked_installations(
        self,
        team_id: str,
        revoked_user_ids: list[str],
        bot_token_revoked: bool,
    ) -> None:
        if bot_token_revoked:
            self.delete_team_installations(team_id)
            return
        if not revoked_user_ids:
            return
        try:
            result = (
                self.client.table("integrations")
                .select("id,metadata")
                .eq("provider", "SLACK")
                .eq("external_account_id", team_id)
                .execute()
            )
            rows: Any = result.data
            if not isinstance(rows, list):
                raise SlackRepositoryError("Supabase returned invalid Slack integrations")
            for row in rows:
                metadata = row.get("metadata")
                if (
                    isinstance(metadata, dict)
                    and metadata.get("slack_user_id") in revoked_user_ids
                    and isinstance(row.get("id"), str)
                ):
                    self.client.table("integrations").delete().eq(
                        "id", row["id"]
                    ).execute()
        except SlackRepositoryError:
            raise
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not remove revoked Slack connections"
            ) from exc

    def claim_webhook_delivery(
        self,
        event_id: str,
        payload: dict[str, Any],
    ) -> bool:
        """Atomically store an event once; return False for a duplicate."""
        try:
            result = self.client.rpc(
                "claim_slack_webhook_delivery",
                {
                    "p_event_id": event_id,
                    "p_payload": payload,
                },
            ).execute()
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not record the Slack event"
            ) from exc

        if not isinstance(result.data, bool):
            raise SlackRepositoryError(
                "Supabase returned an invalid Slack event claim"
            )
        return result.data

    def get_webhook_delivery(self, event_id: str) -> SlackQueuedDelivery:
        try:
            result = (
                self.client.table("webhook_deliveries")
                .select("status,payload")
                .eq("provider", "SLACK")
                .eq("external_event_id", event_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not load the queued Slack event"
            ) from exc

        rows: Any = result.data
        if not isinstance(rows, list) or len(rows) != 1:
            raise SlackRepositoryError("Queued Slack event was not found")
        try:
            return SlackQueuedDelivery.model_validate(rows[0])
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase returned an invalid queued Slack event"
            ) from exc

    def find_mentioned_targets(
        self,
        team_id: str,
        text: str,
    ) -> list[SlackMentionTarget]:
        """Return connected users from this workspace who are mentioned in text."""
        try:
            result = (
                self.client.table("integrations")
                .select("owner_id,metadata")
                .eq("provider", "SLACK")
                .eq("external_account_id", team_id)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not resolve Slack mention owners"
            ) from exc

        rows: Any = result.data
        if not isinstance(rows, list):
            raise SlackRepositoryError("Supabase returned invalid Slack integrations")

        targets: list[SlackMentionTarget] = []
        for row in rows:
            metadata = row.get("metadata")
            slack_user_id = metadata.get("slack_user_id") if isinstance(metadata, dict) else None
            if not isinstance(slack_user_id, str) or f"<@{slack_user_id}>" not in text:
                continue
            try:
                targets.append(
                    SlackMentionTarget(
                        owner_id=UUID(str(row["owner_id"])),
                        slack_user_id=slack_user_id,
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                raise SlackRepositoryError(
                    "Supabase returned an invalid Slack mention owner"
                ) from exc
        return targets

    def update_webhook_delivery(
        self,
        event_id: str,
        delivery_status: str,
        error: str | None = None,
        outcome: str | None = None,
        result: list[dict[str, Any]] | None = None,
    ) -> None:
        payload = {
            "status": delivery_status,
            "error": error,
            "outcome": outcome,
            "result": result,
            "processed_at": datetime.now().astimezone().isoformat()
            if delivery_status in {"COMPLETED", "FAILED"}
            else None,
        }
        try:
            result = (
                self.client.table("webhook_deliveries")
                .update(payload)
                .eq("provider", "SLACK")
                .eq("external_event_id", event_id)
                .execute()
            )
        except Exception as exc:
            raise SlackRepositoryError(
                "Supabase could not update the Slack event"
            ) from exc

        if not isinstance(result.data, list) or len(result.data) != 1:
            raise SlackRepositoryError("Slack event delivery was not found")
