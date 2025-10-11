from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import GrantApplication, OrganizationUser, ProjectAccess
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import PubSubEvent, PubSubMessage
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql import insert

from services.backend.src.api.webhooks.email_sending import get_project_users, send_email_to_user
from services.backend.tests.conftest import TestingClientType


@pytest.fixture
def mock_get_user() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_send_email() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_pubsub_event(grant_application: GrantApplication) -> PubSubEvent:
    return PubSubEvent(
        message=PubSubMessage(
            data="",
            message_id="test-message-id",
            publish_time="2023-01-01T00:00:00Z",
            attributes={"application_id": str(grant_application.id), "trace_id": "test-trace-id"},
        )
    )


async def test_get_project_users_with_all_access(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    users = await get_project_users(async_session_maker, grant_application.id)

    firebase_uids = [user.firebase_uid for user in users]
    assert project_owner_user.firebase_uid in firebase_uids


async def test_get_project_users_with_project_access(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    organization: Any,
) -> None:
    collaborator_user = OrganizationUser(
        firebase_uid="collaborator-uid",
        organization_id=organization.id,
        role=UserRoleEnum.COLLABORATOR,
        has_all_projects_access=False,
    )

    async with async_session_maker() as session:
        session.add(collaborator_user)
        await session.execute(
            insert(ProjectAccess).values(
                firebase_uid="collaborator-uid",
                project_id=grant_application.project_id,
                organization_id=organization.id,
            )
        )
        await session.commit()

    users = await get_project_users(async_session_maker, grant_application.id)

    firebase_uids = [user.firebase_uid for user in users]
    assert "collaborator-uid" in firebase_uids


async def test_get_project_users_empty_result_for_nonexistent_application(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    with pytest.raises(ValidationError):
        await get_project_users(async_session_maker, uuid4())


async def test_send_email_to_user_success(mock_get_user: AsyncMock, mock_send_email: AsyncMock) -> None:
    with (
        patch("services.backend.src.api.webhooks.email_sending.get_user", mock_get_user),
        patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email", mock_send_email),
    ):
        mock_get_user.return_value = {"email": "webhook-admin@example.com", "display_name": "Admin User"}
        mock_send_email.return_value = None

        user = OrganizationUser(firebase_uid="test-uid", organization_id=uuid4(), role="admin")
        result = await send_email_to_user(
            user=user,
            application_title="Test Application",
            application_text="Test content",
            project_id="test-project-id",
            application_id="test-app-id",
        )

        assert result is True
        mock_get_user.assert_called_once_with("test-uid")
        mock_send_email.assert_called_once()


async def test_send_email_to_user_no_firebase_user(mock_get_user: AsyncMock) -> None:
    with patch("services.backend.src.api.webhooks.email_sending.get_user", mock_get_user):
        mock_get_user.return_value = None

        user = OrganizationUser(firebase_uid="test-uid", organization_id=uuid4(), role="admin")
        result = await send_email_to_user(
            user=user,
            application_title="Test Application",
            application_text="Test content",
            project_id="test-project-id",
            application_id="test-app-id",
        )

        assert result is False


async def test_send_email_to_user_no_email_address(mock_get_user: AsyncMock) -> None:
    with patch("services.backend.src.api.webhooks.email_sending.get_user", mock_get_user):
        mock_get_user.return_value = {"display_name": "User Without Email"}

        user = OrganizationUser(firebase_uid="test-uid", organization_id=uuid4(), role="admin")
        result = await send_email_to_user(
            user=user,
            application_title="Test Application",
            application_text="Test content",
            project_id="test-project-id",
            application_id="test-app-id",
        )

        assert result is False


async def test_send_email_to_user_exception_handling(mock_get_user: AsyncMock, mock_send_email: AsyncMock) -> None:
    with (
        patch("services.backend.src.api.webhooks.email_sending.get_user", mock_get_user),
        patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email", mock_send_email),
    ):
        mock_get_user.return_value = {"email": "webhook-admin@example.com", "display_name": "Admin"}
        mock_send_email.side_effect = Exception("SMTP error")

        user = OrganizationUser(firebase_uid="test-uid", organization_id=uuid4(), role="admin")
        result = await send_email_to_user(
            user=user,
            application_title="Test Application",
            application_text="Test content",
            project_id="test-project-id",
            application_id="test-app-id",
        )

        assert result is False


async def test_email_notification_webhook_success_multiple_users(
    test_client: TestingClientType,
    mock_pubsub_event: PubSubEvent,
    project_owner_user: OrganizationUser,
) -> None:
    with (
        patch("services.backend.src.api.webhooks.email_sending.get_user") as mock_get_user,
        patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email") as mock_send_email,
        patch("services.backend.src.api.middleware.verify_webhook_oidc_token") as mock_verify_token,
    ):
        mock_get_user.return_value = {"email": "webhook-owner@example.com", "display_name": "Owner User"}
        mock_send_email.return_value = None
        mock_verify_token.return_value = True

        response = await test_client.post(
            "/webhooks/pubsub/email-notifications",
            json={
                "message": {
                    "data": mock_pubsub_event.message.data,
                    "message_id": mock_pubsub_event.message.message_id,
                    "publish_time": mock_pubsub_event.message.publish_time,
                    "attributes": mock_pubsub_event.message.attributes,
                }
            },
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 201
        result = response.json()
        assert result["status"] == "success"
        assert "1/1" in result["message"]


async def test_email_notification_webhook_no_users_found(
    test_client: TestingClientType, async_session_maker: async_sessionmaker[Any]
) -> None:
    event_data = {
        "message": {
            "data": "",
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "attributes": {"application_id": str(uuid4())},
        }
    }

    with patch("services.backend.src.api.middleware.verify_webhook_oidc_token") as mock_verify_token:
        mock_verify_token.return_value = True
        response = await test_client.post(
            "/webhooks/pubsub/email-notifications",
            json=event_data,
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 400


async def test_email_notification_webhook_missing_application_id(test_client: TestingClientType) -> None:
    event_data = {
        "message": {
            "data": "",
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "attributes": {},
        }
    }

    with patch("services.backend.src.api.middleware.verify_webhook_oidc_token") as mock_verify_token:
        mock_verify_token.return_value = True
        response = await test_client.post(
            "/webhooks/pubsub/email-notifications",
            json=event_data,
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 400


async def test_email_notification_webhook_authentication_required(test_client: TestingClientType) -> None:
    event_data = {
        "message": {
            "data": "",
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "attributes": {"application_id": str(uuid4())},
        }
    }

    with patch("services.backend.src.api.middleware.get_env") as mock_get_env:
        mock_get_env.return_value = "test-webhook-token"
        response = await test_client.post("/webhooks/pubsub/email-notifications", json=event_data)

    assert response.status_code == 401


async def test_email_notification_webhook_oidc_authentication_success(
    test_client: TestingClientType,
    mock_pubsub_event: PubSubEvent,
    project_owner_user: OrganizationUser,
) -> None:
    with (
        patch("services.backend.src.api.webhooks.email_sending.get_user") as mock_get_user,
        patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email") as mock_send_email,
        patch("services.backend.src.api.middleware.verify_webhook_oidc_token") as mock_verify_token,
    ):
        mock_get_user.return_value = {"email": "webhook-owner@example.com", "display_name": "Owner User"}
        mock_send_email.return_value = None
        mock_verify_token.return_value = True

        response = await test_client.post(
            "/webhooks/pubsub/email-notifications",
            json={
                "message": {
                    "data": mock_pubsub_event.message.data,
                    "message_id": mock_pubsub_event.message.message_id,
                    "publish_time": mock_pubsub_event.message.publish_time,
                    "attributes": mock_pubsub_event.message.attributes,
                }
            },
            headers={"Authorization": "Bearer valid-oidc-jwt-token"},
        )

    assert response.status_code == 201
    result = response.json()
    assert result["status"] == "success"
    assert "1/1" in result["message"]

    mock_verify_token.assert_called_once_with(
        "valid-oidc-jwt-token",
        "https://testserver.local/webhooks/pubsub/email-notifications",
    )


async def test_email_notification_webhook_oidc_authentication_failure(
    test_client: TestingClientType,
) -> None:
    with patch("services.backend.src.api.middleware.verify_webhook_oidc_token") as mock_verify_token:
        mock_verify_token.return_value = False

        response = await test_client.post(
            "/webhooks/pubsub/email-notifications",
            json={
                "message": {
                    "data": "",
                    "message_id": "test-message-id",
                    "publish_time": "2023-01-01T00:00:00Z",
                    "attributes": {"application_id": str(uuid4())},
                }
            },
            headers={"Authorization": "Bearer invalid-oidc-jwt-token"},
        )

    assert response.status_code == 401
    mock_verify_token.assert_called_once_with(
        "invalid-oidc-jwt-token",
        "https://testserver.local/webhooks/pubsub/email-notifications",
    )


async def test_completion_email_timestamp_field_exists_and_nullable(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        assert app
        assert hasattr(app, "completion_email_sent_at")
        assert app.completion_email_sent_at is None


async def test_completion_email_timestamp_persists_across_sessions(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    timestamp = datetime.now(UTC)

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        assert app
        app.completion_email_sent_at = timestamp
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        assert app
        assert app.completion_email_sent_at is not None
        assert abs((app.completion_email_sent_at - timestamp).total_seconds()) < 1
