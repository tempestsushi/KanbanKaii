from types import SimpleNamespace
from unittest import TestCase

from app.maintenance.cleanup import (
    IntegrationCleanupError,
    IntegrationCleanupService,
)


class FakeRpc:
    def __init__(self, data) -> None:
        self.data = data

    def execute(self):
        return SimpleNamespace(data=self.data)


class FakeSupabase:
    def __init__(self, data) -> None:
        self.data = data
        self.function = None

    def rpc(self, function):
        self.function = function
        return FakeRpc(self.data)


class IntegrationCleanupServiceTests(TestCase):
    def test_runs_cleanup_rpc_and_returns_counts(self) -> None:
        expected = {
            "stale_marked_failed": 1,
            "ignored_deleted": 2,
            "completed_deleted": 3,
            "failed_deleted": 4,
        }
        supabase = FakeSupabase(expected)

        result = IntegrationCleanupService(supabase).run()

        self.assertEqual(result, expected)
        self.assertEqual(
            supabase.function,
            "cleanup_integration_transient_data",
        )

    def test_rejects_invalid_cleanup_result(self) -> None:
        with self.assertRaisesRegex(
            IntegrationCleanupError,
            "invalid cleanup result",
        ):
            IntegrationCleanupService(FakeSupabase({"deleted": "1"})).run()
