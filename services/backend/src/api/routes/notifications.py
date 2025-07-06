from datetime import UTC, datetime
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import get, post
from litestar.exceptions import HTTPException
from packages.db.src.tables import Notification
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)


class NotificationResponse(TypedDict):
    id: str
    type: str
    title: str
    message: str
    project_id: NotRequired[str]
    project_name: NotRequired[str]
    read: bool
    dismissed: bool
    created_at: str
    expires_at: NotRequired[str]
    extra_data: NotRequired[dict[str, Any]]


class ListNotificationsResponse(TypedDict):
    notifications: list[NotificationResponse]
    total: int


class DismissNotificationResponse(TypedDict):
    success: bool
    notification_id: str


@get(
    "/notifications",
    operation_id="ListNotifications",
    summary="List user's active notifications",
    description="Get all active (non-dismissed) notifications for the authenticated user",
)
async def list_notifications(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
    include_read: bool = False,
) -> ListNotificationsResponse:
    """List user's active notifications.

    Args:
        request: API request with authenticated user
        session_maker: Database session maker
        include_read: Whether to include read notifications (default: False)

    Returns:
        List of active notifications with metadata
    """
    logger.info(
        "Listing notifications", firebase_uid=request.auth, include_read=include_read
    )

    async with session_maker() as session:
        filters = [
            Notification.firebase_uid == request.auth,
            Notification.dismissed == False,  # noqa: E712
        ]

        if not include_read:
            filters.append(Notification.read == False)  # noqa: E712

        filters.append(
            (Notification.expires_at.is_(None))
            | (Notification.expires_at > datetime.now(UTC))
        )

        result = await session.execute(
            select(Notification)
            .where(and_(*filters))
            .order_by(Notification.created_at.desc())
        )
        notifications = result.scalars().all()

        notification_responses: list[NotificationResponse] = []
        for notification in notifications:
            response: NotificationResponse = {
                "id": str(notification.id),
                "type": notification.type.value,
                "title": notification.title,
                "message": notification.message,
                "read": notification.read,
                "dismissed": notification.dismissed,
                "created_at": notification.created_at.isoformat(),
            }

            if notification.project_id:
                response["project_id"] = str(notification.project_id)
            if notification.project_name:
                response["project_name"] = notification.project_name
            if notification.expires_at:
                response["expires_at"] = notification.expires_at.isoformat()
            if notification.extra_data:
                response["extra_data"] = notification.extra_data

            notification_responses.append(response)

        logger.info(
            "Retrieved notifications",
            firebase_uid=request.auth,
            count=len(notification_responses),
        )

        return ListNotificationsResponse(
            notifications=notification_responses, total=len(notification_responses)
        )


@post(
    "/notifications/{notification_id:uuid}/dismiss",
    operation_id="DismissNotification",
    summary="Dismiss a notification",
    description="Mark a notification as dismissed for the authenticated user",
    status_code=200,
)
async def dismiss_notification(
    notification_id: UUID,
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> DismissNotificationResponse:
    """Dismiss a notification.

    Args:
        notification_id: UUID of the notification to dismiss
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Success response with notification ID

    Raises:
        HTTPException: If notification not found or doesn't belong to user
    """
    logger.info(
        "Dismissing notification",
        notification_id=str(notification_id),
        firebase_uid=request.auth,
    )

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.firebase_uid == request.auth,
                )
            )
        )
        notification = result.scalar_one_or_none()

        if not notification:
            logger.warning(
                "Notification not found",
                notification_id=str(notification_id),
                firebase_uid=request.auth,
            )
            raise HTTPException(status_code=404, detail="Notification not found")

        notification.dismissed = True
        notification.updated_at = datetime.now(UTC)

        await session.commit()

        logger.info(
            "Notification dismissed successfully",
            notification_id=str(notification_id),
            firebase_uid=request.auth,
        )

        return DismissNotificationResponse(
            success=True, notification_id=str(notification_id)
        )
