import asyncio
import time
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from litestar import websocket_stream
from packages.db.src.enums import ApplicationStatusEnum, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.query_helpers import update_active_by_id
from packages.db.src.tables import GenerationNotification
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import WebsocketMessage
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.grant_applications import build_application_response

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


async def pull_notifications(
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[WebsocketMessage[dict[str, Any]]]:
    notifications_to_send = []

    async with session_maker() as session, session.begin():
        try:
            application = await retrieve_application(
                application_id=application_id,
                session=session,
            )
            app_data = build_application_response(application)

            status_value = None
            updated_at_value = None
            if isinstance(app_data, dict):
                status_field = app_data.get("status")
                status_value = status_field.value if isinstance(status_field, ApplicationStatusEnum) else status_field
                updated_at_value = app_data.get("updated_at")

            logger.debug(
                "Fetched fresh application data for notifications",
                application_id=str(application_id),
                status=status_value,
                updated_at=updated_at_value,
            )
        except ValidationError as e:
            logger.error(
                "Failed to fetch application data for notifications",
                application_id=str(application_id),
                error=str(e),
            )
            return []

        result = await session.execute(
            select(GenerationNotification)
            .where(
                and_(
                    GenerationNotification.grant_application_id == application_id,
                    GenerationNotification.delivered_at.is_(None),
                    GenerationNotification.deleted_at.is_(None),
                )
            )
            .order_by(GenerationNotification.created_at.asc())
        )
        notifications = list(result.scalars())

        if notifications:
            delivered_at = datetime.now(UTC)

            for notif in notifications:
                await session.execute(
                    update_active_by_id(GenerationNotification, notif.id).values(delivered_at=delivered_at)
                )

            for notification in notifications:
                message: WebsocketMessage[dict[str, Any]] = {
                    "type": notification.notification_type,
                    "parent_id": application_id,
                    "event": notification.event,
                    "data": notification.data if notification.data else {"message": notification.message},
                    "trace_id": "",
                    "application_data": dict(app_data),
                }

                notifications_to_send.append(message)

    return notifications_to_send


@websocket_stream(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/notifications",
    opt={"allowed_roles": [UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR]},
    type_encoders={UUID: str, SourceIndexingStatusEnum: lambda x: x.value, ApplicationStatusEnum: lambda x: x.value},
)
async def handle_grant_application_notifications(
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> AsyncGenerator[WebsocketMessage[dict[str, Any]]]:
    logger.info(
        "WebSocket connection established for notifications",
        organization_id=str(organization_id),
        project_id=str(project_id),
        application_id=str(application_id),
    )

    try:
        while True:
            poll_start = time.time()
            logger.debug(
                "Polling for undelivered notifications",
                organization_id=str(organization_id),
                project_id=str(project_id),
                application_id=str(application_id),
            )
            try:
                notifications_to_send = await pull_notifications(
                    application_id=application_id,
                    session_maker=session_maker,
                )

                poll_duration = time.time() - poll_start

                if notifications_to_send:
                    logger.info(
                        "Found and marked undelivered notifications",
                        num_notifications=len(notifications_to_send),
                        application_id=str(application_id),
                        poll_duration_ms=round(poll_duration * 1000, 2),
                    )

                    for message in notifications_to_send:
                        application_data = message.get("application_data")
                        app_status = None
                        app_updated_at = None
                        if isinstance(application_data, dict):
                            status = application_data.get("status")
                            app_status = status.value if isinstance(status, ApplicationStatusEnum) else status
                            app_updated_at = application_data.get("updated_at")

                        logger.debug(
                            "Sending notification to WebSocket client",
                            notification_event=message.get("event"),
                            application_id=str(application_id),
                            app_status=app_status,
                            app_updated_at=app_updated_at,
                        )
                        yield message
                else:
                    logger.debug(
                        "No undelivered notifications found",
                        application_id=str(application_id),
                        poll_duration_ms=round(poll_duration * 1000, 2),
                    )

            except Exception as e:
                logger.error(
                    "Error polling notifications from database, continuing polling",
                    organization_id=str(organization_id),
                    project_id=str(project_id),
                    application_id=str(application_id),
                    error=str(e),
                    error_type=type(e).__name__,
                    exc_info=e,
                )

            await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)
    except asyncio.CancelledError:
        logger.info(
            "WebSocket connection closed, cleaning up",
            organization_id=str(organization_id),
            project_id=str(project_id),
            application_id=str(application_id),
        )
        return
    except Exception as e:
        logger.error(
            "Unexpected error in WebSocket handler",
            organization_id=str(organization_id),
            project_id=str(project_id),
            application_id=str(application_id),
            error=str(e),
            error_type=type(e).__name__,
            exc_info=e,
        )
        raise
