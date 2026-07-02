import asyncio
from types import SimpleNamespace
from unittest import TestCase
from uuid import uuid4

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth.dependencies import get_current_user_id


class FakeAuthClient:
    def __init__(self, claims=None, error: Exception | None = None) -> None:
        self.claims = claims
        self.error = error
        self.received_token = None

    def get_claims(self, token: str):
        self.received_token = token
        if self.error:
            raise self.error
        return {"claims": self.claims}


class AuthDependencyTests(TestCase):
    def test_returns_verified_user_uuid(self) -> None:
        user_id = uuid4()
        auth = FakeAuthClient(
            claims={"sub": str(user_id), "role": "authenticated"}
        )
        supabase = SimpleNamespace(auth=auth)

        result = asyncio.run(
            get_current_user_id(
                HTTPAuthorizationCredentials(
                    scheme="Bearer",
                    credentials="verified-token",
                ),
                supabase,
            )
        )

        self.assertEqual(result, user_id)
        self.assertEqual(auth.received_token, "verified-token")

    def test_rejects_missing_bearer_token(self) -> None:
        with self.assertRaises(HTTPException) as context:
            asyncio.run(
                get_current_user_id(
                    None,
                    SimpleNamespace(auth=FakeAuthClient()),
                )
            )

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Authentication required")

    def test_rejects_invalid_claims(self) -> None:
        with self.assertRaises(HTTPException) as context:
            asyncio.run(
                get_current_user_id(
                    HTTPAuthorizationCredentials(
                        scheme="Bearer",
                        credentials="invalid-token",
                    ),
                    SimpleNamespace(
                        auth=FakeAuthClient(
                            claims={"sub": "not-a-uuid", "role": "authenticated"}
                        )
                    ),
                )
            )

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(
            context.exception.detail,
            "Invalid or expired access token",
        )
