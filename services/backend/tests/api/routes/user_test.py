from pytest_mock import MockerFixture

from services.backend.src.api.routes.user import DeleteUserResponse
from services.backend.tests.conftest import TestingClientType


class TestDeleteUser:
    async def test_delete_user_success(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        firebase_uid: str,
    ) -> None:
        from datetime import UTC, datetime, timedelta
        from google.cloud import firestore  # type: ignore[attr-defined]

        deletion_date = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=30)
        mock_firestore_data = {
            "firebase_uid": firebase_uid,
            "status": "scheduled",
            "scheduled_at": firestore.SERVER_TIMESTAMP,
            "deletion_date": deletion_date,
            "grace_period_days": 30,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        mock_schedule = mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            return_value=mock_firestore_data,
        )

        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        response = await test_client.delete(
            "/user", headers={"Authorization": "Bearer some_token"}
        )

        assert response.status_code == 200, response.text

        result = response.json()
        expected_response: DeleteUserResponse = {
            "grace_period_days": 30,
            "message": "Account scheduled for deletion. You will be removed from all projects immediately.",
            "restoration_info": "Contact support within 30 days to restore your account",
            "scheduled_deletion_date": deletion_date.isoformat() + "Z",
        }

        assert result == expected_response

        mock_schedule.assert_called_once_with(firebase_uid, 30)

    async def test_delete_user_firestore_error(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        firebase_uid: str,
    ) -> None:
        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            side_effect=Exception("Firestore connection failed"),
        )

        response = await test_client.delete(
            "/user", headers={"Authorization": "Bearer some_token"}
        )

        assert response.status_code == 500

    async def test_delete_user_no_firebase_uid(
        self, test_client: TestingClientType
    ) -> None:
        response = await test_client.delete("/user")

        assert response.status_code in [401, 403]

    async def test_delete_user_with_zero_grace_period(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        firebase_uid: str,
    ) -> None:
        from datetime import UTC, datetime
        from google.cloud import firestore  # type: ignore[attr-defined]

        deletion_date = datetime.now(UTC).replace(tzinfo=None)
        mock_firestore_data = {
            "firebase_uid": firebase_uid,
            "status": "scheduled",
            "scheduled_at": firestore.SERVER_TIMESTAMP,
            "deletion_date": deletion_date,
            "grace_period_days": 0,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            return_value=mock_firestore_data,
        )

        response = await test_client.delete(
            "/user", headers={"Authorization": "Bearer some_token"}
        )

        assert response.status_code == 200, response.text
        result = response.json()
        assert result["grace_period_days"] == 0
        assert "removed from all projects immediately" in result["message"]
