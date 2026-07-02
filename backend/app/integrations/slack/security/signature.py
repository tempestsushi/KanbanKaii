import hashlib
import hmac
import time
from collections.abc import Callable


class SlackSignatureError(ValueError):
    """Raised when a Slack request is unsigned, stale, or tampered with."""


class SlackSignatureVerifier:
    def __init__(
        self,
        signing_secret: str,
        tolerance_seconds: int = 300,
        now: Callable[[], float] = time.time,
    ) -> None:
        self.signing_secret = signing_secret.encode("utf-8")
        self.tolerance_seconds = tolerance_seconds
        self.now = now

    def verify(self, body: bytes, timestamp: str | None, signature: str | None) -> None:
        if not timestamp or not signature:
            raise SlackSignatureError("Slack signature headers are missing")
        try:
            request_time = int(timestamp)
        except ValueError as error:
            raise SlackSignatureError("Slack request timestamp is invalid") from error

        if abs(self.now() - request_time) > self.tolerance_seconds:
            raise SlackSignatureError("Slack request timestamp is too old")

        base = b"v0:" + timestamp.encode("ascii") + b":" + body
        expected = "v0=" + hmac.new(
            self.signing_secret,
            base,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise SlackSignatureError("Slack request signature is invalid")
