from unittest import TestCase
from uuid import uuid4

from app.organizations.schemas import OrganizationBoardMemberCreate


class OrganizationBoardSchemaTests(TestCase):
    def test_board_member_create_accepts_json_uuid_string(self) -> None:
        user_id = uuid4()
        request = OrganizationBoardMemberCreate.model_validate(
            {"user_id": str(user_id), "role": "MEMBER"}
        )

        self.assertEqual(request.user_id, user_id)
        self.assertEqual(request.role, "MEMBER")
