from typing import Any

from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Project
from packages.db.src.tables import ProjectUser as ProjectMember
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.user import (
    USER_DELETION_GRACE_PERIOD_DAYS,
    DeleteUserResponse,
)
from services.backend.tests.conftest import TestingClientType


class TestDeleteUser:
    async def test_delete_user_success(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        firebase_uid: str,
    ) -> None:
        from datetime import UTC, datetime, timedelta

        from google.cloud.firestore import SERVER_TIMESTAMP

        deletion_date = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=USER_DELETION_GRACE_PERIOD_DAYS)
        mock_firestore_data = {
            "firebase_uid": firebase_uid,
            "status": "scheduled",
            "scheduled_at": SERVER_TIMESTAMP,
            "deletion_date": deletion_date,
            "grace_period_days": USER_DELETION_GRACE_PERIOD_DAYS,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        }

        mock_schedule = mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            return_value=mock_firestore_data,
        )

        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        response = await test_client.delete("/user", headers={"Authorization": "Bearer some_token"})

        assert response.status_code == 200, response.text

        result = response.json()
        expected_response: DeleteUserResponse = {
            "grace_period_days": USER_DELETION_GRACE_PERIOD_DAYS,
            "message": "Account scheduled for deletion. You will be removed from all projects immediately.",
            "restoration_info": f"Contact support within {USER_DELETION_GRACE_PERIOD_DAYS} days to restore your account",
            "scheduled_deletion_date": deletion_date.isoformat() + "Z",
        }

        assert result == expected_response

        mock_schedule.assert_called_once_with(firebase_uid, USER_DELETION_GRACE_PERIOD_DAYS)

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

        response = await test_client.delete("/user", headers={"Authorization": "Bearer some_token"})

        assert response.status_code == 500

    async def test_delete_user_no_firebase_uid(self, test_client: TestingClientType) -> None:
        response = await test_client.delete("/user")

        assert response.status_code in [401, 403]

    async def test_delete_user_with_zero_grace_period(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        firebase_uid: str,
    ) -> None:
        from datetime import UTC, datetime

        from google.cloud.firestore import SERVER_TIMESTAMP

        deletion_date = datetime.now(UTC).replace(tzinfo=None)
        mock_firestore_data = {
            "firebase_uid": firebase_uid,
            "status": "scheduled",
            "scheduled_at": SERVER_TIMESTAMP,
            "deletion_date": deletion_date,
            "grace_period_days": 0,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        }

        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            return_value=mock_firestore_data,
        )

        response = await test_client.delete("/user", headers={"Authorization": "Bearer some_token"})

        assert response.status_code == 200, response.text
        result = response.json()
        assert result["grace_period_days"] == 0
        assert "removed from all projects immediately" in result["message"]

    async def test_delete_user_with_sole_owned_projects(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        async_session_maker: async_sessionmaker[Any],
        project: Project,
        project_owner_user: ProjectMember,
        firebase_uid: str,
    ) -> None:
        """Test that user deletion is blocked when user is sole owner of projects."""
        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        response = await test_client.delete(
            "/user",
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "You must transfer ownership of projects before deleting your account"
        assert data["extra"]["error"] == "ownership_transfer_required"
        assert len(data["extra"]["projects"]) == 1
        assert data["extra"]["projects"][0]["id"] == str(project.id)
        assert data["extra"]["projects"][0]["name"] == project.name

    async def test_delete_user_with_multiple_owners(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        async_session_maker: async_sessionmaker[Any],
        project: Project,
        project_owner_user: ProjectMember,
        firebase_uid: str,
    ) -> None:
        """Test that user deletion succeeds when project has multiple owners."""
        from datetime import UTC, datetime, timedelta

        mocker.patch(
            "services.backend.src.api.routes.user.get_user_deletion_status",
            return_value=None,
        )

        deletion_date = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=USER_DELETION_GRACE_PERIOD_DAYS)
        mock_schedule = mocker.patch(
            "services.backend.src.api.routes.user.schedule_user_deletion",
            return_value={
                "firebase_uid": firebase_uid,
                "status": "scheduled",
                "deletion_date": deletion_date,
                "grace_period_days": USER_DELETION_GRACE_PERIOD_DAYS,
            },
        )

        async with async_session_maker() as session, session.begin():
            another_owner = ProjectMember(
                project_id=project.id,
                firebase_uid="another_owner_uid",
                role=UserRoleEnum.OWNER,
            )
            session.add(another_owner)
            await session.commit()

        response = await test_client.delete(
            "/user",
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Account scheduled for deletion. You will be removed from all projects immediately."
        assert mock_schedule.called


class TestGetSoleOwnedProjects:
    async def test_get_sole_owned_projects(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        async_session_maker: async_sessionmaker[Any],
        project: Project,
        project_owner_user: ProjectMember,
        firebase_uid: str,
    ) -> None:
        """Test getting list of sole-owned projects."""

        async with async_session_maker() as session, session.begin():
            shared_project = Project(name="Shared Project", description="Project with multiple owners")
            session.add(shared_project)
            await session.flush()

            session.add(
                ProjectMember(
                    project_id=shared_project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER,
                )
            )

            session.add(
                ProjectMember(
                    project_id=shared_project.id,
                    firebase_uid="another_owner",
                    role=UserRoleEnum.OWNER,
                )
            )
            await session.commit()

        response = await test_client.get(
            "/user/sole-owned-projects",
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert len(data["projects"]) == 1
        assert data["projects"][0]["id"] == str(project.id)
        assert data["projects"][0]["name"] == project.name

    async def test_get_sole_owned_projects_empty(
        self,
        test_client: TestingClientType,
        mocker: MockerFixture,
        async_session_maker: async_sessionmaker[Any],
        firebase_uid: str,
    ) -> None:
        """Test getting sole-owned projects when user has none."""
        response = await test_client.get(
            "/user/sole-owned-projects",
            headers={"Authorization": "Bearer test_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["projects"] == []
