import hashlib
import hmac
import json
from unittest import TestCase
from uuid import uuid4

from fastapi.testclient import TestClient

from app.integrations.slack.routes.oauth import get_slack_repository
from app.integrations.slack.data.repository import SlackMentionTarget
from app.integrations.slack.security.signature import SlackSignatureError, SlackSignatureVerifier
from app.integrations.slack.routes.webhooks import (
    get_slack_ai_rate_limiter,
    get_slack_job_queue,
    get_slack_signature_verifier,
)
from app.main import app


client = TestClient(app)
SIGNING_SECRET = "test-signing-secret"
TIMESTAMP = "1700000000"


def signed_headers(body: bytes, signature: str | None = None) -> dict[str, str]:
    base = b"v0:" + TIMESTAMP.encode("ascii") + b":" + body
    calculated = "v0=" + hmac.new(
        SIGNING_SECRET.encode("utf-8"),
        base,
        hashlib.sha256,
    ).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-Slack-Request-Timestamp": TIMESTAMP,
        "X-Slack-Signature": signature or calculated,
    }


class FakeSlackRepository:
    def __init__(self, claimed: bool = True) -> None:
        self.claimed = claimed
        self.delivery = None

    def claim_webhook_delivery(self, event_id, payload) -> bool:
        self.delivery = (event_id, payload)
        return self.claimed

    def find_mentioned_targets(self, team_id, text):
        self.lookup = (team_id, text)
        if "<@U-CONNECTED>" not in text:
            return []
        return [SlackMentionTarget(uuid4(), "U-CONNECTED")]

    def delete_team_installations(self, team_id):
        self.deleted_team_id = team_id

    def delete_revoked_installations(self, team_id, user_ids, bot_revoked):
        self.revocation = (team_id, user_ids, bot_revoked)

    def update_webhook_delivery(self, *values):
        self.updated = values


class FakeSlackJobQueue:
    def __init__(self) -> None:
        self.enqueued = []

    async def enqueue(self, event_id) -> bool:
        self.enqueued.append(event_id)
        return True


class FakeRateLimiter:
    def __init__(self) -> None:
        self.allowed = True
        self.event_id = None
        self.owner_ids = []

    async def acquire(self, event_id, owner_ids) -> bool:
        self.event_id = event_id
        self.owner_ids = list(owner_ids)
        return self.allowed


class SlackWebhookTests(TestCase):
    def setUp(self) -> None:
        self.repository = FakeSlackRepository()
        self.verifier = SlackSignatureVerifier(
            SIGNING_SECRET,
            now=lambda: float(TIMESTAMP),
        )
        self.job_queue = FakeSlackJobQueue()
        self.rate_limiter = FakeRateLimiter()
        app.dependency_overrides[get_slack_repository] = lambda: self.repository
        app.dependency_overrides[get_slack_signature_verifier] = lambda: self.verifier
        app.dependency_overrides[get_slack_job_queue] = lambda: self.job_queue
        app.dependency_overrides[get_slack_ai_rate_limiter] = lambda: self.rate_limiter

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def post_payload(self, payload, signature: str | None = None):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        return client.post(
            "/api/webhooks/slack/events",
            content=body,
            headers=signed_headers(body, signature),
        )

    def test_returns_url_verification_challenge(self) -> None:
        response = self.post_payload(
            {"type": "url_verification", "challenge": "challenge-value"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"challenge": "challenge-value"})
        self.assertIsNone(self.repository.delivery)

    def test_rejects_invalid_signature_before_parsing(self) -> None:
        response = self.post_payload(
            {"type": "url_verification", "challenge": "challenge-value"},
            signature="v0=invalid",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Slack request signature is invalid"})

    def test_signature_verifier_rejects_stale_timestamp(self) -> None:
        verifier = SlackSignatureVerifier(SIGNING_SECRET, now=lambda: 1700001000.0)

        with self.assertRaisesRegex(SlackSignatureError, "timestamp is too old"):
            verifier.verify(b"{}", TIMESTAMP, "v0=unused")

    def test_accepts_connected_user_mention(self) -> None:
        payload = {
            "type": "event_callback",
            "team_id": "T123",
            "event_id": "Ev123",
            "event": {
                "type": "message",
                "user": "U123",
                "text": "<@U-CONNECTED> Please fix checkout",
                "channel": "C123",
                "ts": "123.456",
            },
        }

        response = self.post_payload(payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "accepted"})
        self.assertEqual(self.repository.delivery, ("Ev123", payload))
        self.assertEqual(self.job_queue.enqueued, ["Ev123"])

    def test_reports_duplicate_without_recording_twice(self) -> None:
        self.repository.claimed = False
        payload = {
            "type": "event_callback",
            "team_id": "T123",
            "event_id": "Ev123",
            "event": {
                "type": "message",
                "text": "<@U-CONNECTED> Do the task",
            },
        }

        response = self.post_payload(payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "duplicate"})
        self.assertEqual(self.job_queue.enqueued, ["Ev123"])
        self.assertEqual(self.rate_limiter.event_id, "Ev123")

    def test_rate_limited_event_is_completed_without_being_queued(self) -> None:
        self.rate_limiter.allowed = False
        payload = {
            "type": "event_callback",
            "team_id": "T123",
            "event_id": "Ev-limited",
            "event": {
                "type": "message",
                "text": "<@U-CONNECTED> Do the task",
            },
        }

        response = self.post_payload(payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "rate_limited"})
        self.assertEqual(self.job_queue.enqueued, [])
        self.assertEqual(self.repository.updated[1], "COMPLETED")
        self.assertEqual(self.repository.updated[3], "IGNORED_NON_ACTIONABLE")
        self.assertEqual(self.repository.updated[4], [{"outcome": "RATE_LIMITED"}])

    def test_ignores_non_mention_events(self) -> None:
        response = self.post_payload(
            {
                "type": "event_callback",
                "team_id": "T123",
                "event_id": "Ev123",
                "event": {"type": "message", "text": "casual chat"},
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ignored"})
        self.assertIsNone(self.repository.delivery)

    def test_ignores_mention_only_message_before_storage(self) -> None:
        response = self.post_payload(
            {
                "type": "event_callback",
                "team_id": "T123",
                "event_id": "Ev-empty",
                "event": {
                    "type": "message",
                    "text": "<@U-CONNECTED> ...",
                },
            }
        )

        self.assertEqual(response.json(), {"status": "ignored"})
        self.assertIsNone(self.repository.delivery)
        self.assertEqual(self.job_queue.enqueued, [])

    def test_ignores_bot_messages(self) -> None:
        response = self.post_payload(
            {
                "type": "event_callback",
                "team_id": "T123",
                "event_id": "Ev123",
                "event": {
                    "type": "message",
                    "bot_id": "B123",
                    "text": "<@U-CONNECTED> do something",
                },
            }
        )

        self.assertEqual(response.json(), {"status": "ignored"})
        self.assertIsNone(self.repository.delivery)

    def test_app_uninstall_removes_workspace_connections(self) -> None:
        response = self.post_payload(
            {
                "type": "event_callback",
                "team_id": "T123",
                "event_id": "Ev-uninstall",
                "event": {"type": "app_uninstalled"},
            }
        )

        self.assertEqual(response.json(), {"status": "disconnected"})
        self.assertEqual(self.repository.deleted_team_id, "T123")

    def test_token_revocation_removes_affected_connection(self) -> None:
        response = self.post_payload(
            {
                "type": "event_callback",
                "team_id": "T123",
                "event_id": "Ev-revoked",
                "event": {
                    "type": "tokens_revoked",
                    "tokens": {"oauth": ["U-CONNECTED"], "bot": []},
                },
            }
        )

        self.assertEqual(response.json(), {"status": "disconnected"})
        self.assertEqual(
            self.repository.revocation,
            ("T123", ["U-CONNECTED"], False),
        )
