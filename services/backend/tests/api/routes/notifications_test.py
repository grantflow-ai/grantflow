from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any
from uuid import UUID

from packages.db.src.enums import NotificationTypeEnum
from packages.db.src.tables import Notification, Project
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_list_notifications_empty(
    test_client: TestingClientType,
    project_member_user: None,
) -> None:
    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert "notifications" in data
    assert "total" in data
    assert data["notifications"] == []
    assert data["total"] == 0


async def test_list_notifications_with_data(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    firebase_uid = "a" * 128

    async with async_session_maker() as session, session.begin():
        notification1 = Notification(
            firebase_uid=firebase_uid,
            project_id=project.id,
            type=NotificationTypeEnum.DEADLINE,
            title="Grant Deadline Approaching",
            message="Your grant application deadline is in 3 days",
            project_name=project.name,
            read=False,
            dismissed=False,
        )

        notification2 = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.SUCCESS,
            title="Welcome to GrantFlow",
            message="Your account has been successfully created",
            read=True,
            dismissed=False,
        )

        notification3 = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.INFO,
            title="Dismissed Notification",
            message="This should not appear",
            read=False,
            dismissed=True,
        )

        session.add_all([notification1, notification2, notification3])
        await session.commit()

    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert len(data["notifications"]) == 1
    assert data["total"] == 1
    assert data["notifications"][0]["title"] == "Grant Deadline Approaching"
    assert data["notifications"][0]["type"] == NotificationTypeEnum.DEADLINE.value
    assert data["notifications"][0]["read"] is False
    assert data["notifications"][0]["dismissed"] is False
    assert "project_id" in data["notifications"][0]
    assert "project_name" in data["notifications"][0]

    response = await test_client.get(
        "/notifications",
        params={"include_read": True},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert len(data["notifications"]) == 2
    assert data["total"] == 2

    titles = [n["title"] for n in data["notifications"]]
    assert "Welcome to GrantFlow" in titles
    assert "Grant Deadline Approaching" in titles


async def test_list_notifications_excludes_expired(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    firebase_uid = "a" * 128

    async with async_session_maker() as session, session.begin():
        expired_notification = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.INFO,
            title="Expired Notification",
            message="This notification has expired",
            read=False,
            dismissed=False,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )

        active_notification = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.INFO,
            title="Active Notification",
            message="This notification is still active",
            read=False,
            dismissed=False,
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )

        session.add_all([expired_notification, active_notification])
        await session.commit()

    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Active Notification"


async def test_list_notifications_unauthorized(
    test_client: TestingClientType,
) -> None:
    response = await test_client.get("/notifications")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_dismiss_notification_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    firebase_uid = "a" * 128

    async with async_session_maker() as session, session.begin():
        notification = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.INFO,
            title="Test Notification",
            message="This is a test notification",
            read=False,
            dismissed=False,
        )
        session.add(notification)
        await session.commit()
        notification_id = notification.id

    response = await test_client.post(
        f"/notifications/{notification_id}/dismiss",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["success"] is True
    assert data["notification_id"] == str(notification_id)

    async with async_session_maker() as session:
        result = await session.execute(select(Notification).where(Notification.id == notification_id))
        updated_notification = result.scalar_one()
        assert updated_notification.dismissed is True


async def test_dismiss_notification_not_found(
    test_client: TestingClientType,
    project_member_user: None,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.post(
        f"/notifications/{non_existent_id}/dismiss",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
    assert "Notification not found" in response.text


async def test_dismiss_notification_unauthorized(
    test_client: TestingClientType,
) -> None:
    notification_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.post(f"/notifications/{notification_id}/dismiss")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_dismiss_notification_already_dismissed(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    firebase_uid = "a" * 128

    async with async_session_maker() as session, session.begin():
        notification = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.INFO,
            title="Already Dismissed",
            message="This notification is already dismissed",
            read=False,
            dismissed=True,
        )
        session.add(notification)
        await session.commit()
        notification_id = notification.id

    response = await test_client.post(
        f"/notifications/{notification_id}/dismiss",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()
    assert data["success"] is True


async def test_notification_with_extra_data(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    firebase_uid = "a" * 128

    async with async_session_maker() as session, session.begin():
        notification = Notification(
            firebase_uid=firebase_uid,
            type=NotificationTypeEnum.WARNING,
            title="Custom Notification",
            message="Notification with custom data",
            read=False,
            dismissed=False,
            extra_data={
                "action_url": "/projects/123/applications/456",
                "priority": "high",
                "category": "deadline_reminder",
            },
        )
        session.add(notification)
        await session.commit()

    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert len(data["notifications"]) == 1
    notification = data["notifications"][0]
    assert notification["type"] == "WARNING"
    assert "extra_data" in notification
    assert notification["extra_data"]["action_url"] == "/projects/123/applications/456"
    assert notification["extra_data"]["priority"] == "high"
    assert notification["extra_data"]["category"] == "deadline_reminder"


# SOFT-DELETE FILTERING TESTS - Critical security tests for notifications


async def test_list_notifications_excludes_soft_deleted(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test that soft-deleted notifications are not included in list results."""
    firebase_uid = "a" * 128

    # Create multiple notifications
    notifications = []
    async with async_session_maker() as session, session.begin():
        for i in range(3):
            notification = Notification(
                firebase_uid=firebase_uid,
                project_id=project.id,
                type=NotificationTypeEnum.DEADLINE,
                title=f"Test Notification {i}",
                message=f"Test message {i}",
                project_name=project.name,
                read=False,
                dismissed=False,
            )
            session.add(notification)
            notifications.append(notification)
        await session.commit()

        for notification in notifications:
            await session.refresh(notification)

    # Get initial count
    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    initial_data = response.json()
    initial_count = len(initial_data["notifications"])
    assert initial_count == 3

    # Soft-delete one notification
    async with async_session_maker() as session, session.begin():
        notifications[0].soft_delete()
        session.add(notifications[0])

    # Get count again - should be one less
    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    new_data = response.json()
    new_count = len(new_data["notifications"])
    assert new_count == initial_count - 1

    # Verify the soft-deleted notification is not in the results
    notification_ids = {notif["id"] for notif in new_data["notifications"]}
    assert str(notifications[0].id) not in notification_ids

    # Verify the other notifications are still there
    assert str(notifications[1].id) in notification_ids
    assert str(notifications[2].id) in notification_ids


async def test_mark_notification_as_read_ignores_soft_deleted(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test that marking soft-deleted notifications as read fails appropriately."""
    firebase_uid = "a" * 128

    # Create a notification
    async with async_session_maker() as session, session.begin():
        notification = Notification(
            firebase_uid=firebase_uid,
            project_id=project.id,
            type=NotificationTypeEnum.DEADLINE,
            title="Test Notification",
            message="Test message",
            project_name=project.name,
            read=False,
            dismissed=False,
        )
        session.add(notification)
        await session.commit()
        await session.refresh(notification)

    # First verify we can mark it as read normally
    response = await test_client.patch(
        f"/notifications/{notification.id}",
        headers={"Authorization": "Bearer some_token"},
        json={"read": True},
    )

    # This might be 200 or 204 depending on implementation
    assert response.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT]

    # Reset the notification to unread and soft-delete it
    async with async_session_maker() as session, session.begin():
        notification.read = False
        notification.soft_delete()
        session.add(notification)

    # Try to mark the soft-deleted notification as read
    response = await test_client.patch(
        f"/notifications/{notification.id}",
        headers={"Authorization": "Bearer some_token"},
        json={"read": True},
    )

    # Should fail because the notification is soft-deleted
    assert response.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST]


async def test_expired_notifications_excludes_soft_deleted(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test that expired but soft-deleted notifications are not included."""
    firebase_uid = "a" * 128

    # Create notifications with different expiration states
    async with async_session_maker() as session, session.begin():
        # Active, non-expired notification
        active_notification = Notification(
            firebase_uid=firebase_uid,
            project_id=project.id,
            type=NotificationTypeEnum.DEADLINE,
            title="Active Notification",
            message="Active message",
            project_name=project.name,
            read=False,
            dismissed=False,
            expires_at=datetime.now(UTC) + timedelta(days=1),  # Future expiration
        )

        # Soft-deleted, non-expired notification
        deleted_notification = Notification(
            firebase_uid=firebase_uid,
            project_id=project.id,
            type=NotificationTypeEnum.WARNING,
            title="Deleted Notification",
            message="Deleted message",
            project_name=project.name,
            read=False,
            dismissed=False,
            expires_at=datetime.now(UTC) + timedelta(days=1),  # Future expiration but soft-deleted
        )
        deleted_notification.soft_delete()

        session.add(active_notification)
        session.add(deleted_notification)
        await session.commit()

    # Get notifications
    response = await test_client.get(
        "/notifications",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    # Should only return the active notification
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Active Notification"
