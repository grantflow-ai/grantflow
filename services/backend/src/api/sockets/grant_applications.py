import asyncio
import time
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from litestar import websocket_stream
from packages.db.src.enums import ApplicationStatusEnum, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.query_helpers import update_active_by_id
from packages.db.src.tables import GenerationNotification, GrantApplication
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import WebsocketMessage
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.grant_applications import ApplicationResponse, build_application_response

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


class ApplicationCache:
    def __init__(self) -> None:
        self.data: ApplicationResponse | None = None
        self.updated_at: datetime | None = None

    def needs_refresh(self, db_updated_at: datetime) -> bool:
        if self.updated_at is None:
            return True
        return db_updated_at > self.updated_at

    def update(self, data: ApplicationResponse, updated_at: datetime) -> None:
        self.data = data
        self.updated_at = updated_at


async def _refresh_application_cache(
    application_id: UUID,
    session: Any,
    app_cache: ApplicationCache,
    app_updated_at: datetime,
) -> bool:
    logger.debug(
        "Refreshing application cache before notifications update",
        application_id=str(application_id),
        cached_timestamp=app_cache.updated_at.isoformat() if app_cache.updated_at else None,
        db_timestamp=app_updated_at.isoformat(),
    )
    try:
        application = await retrieve_application(
            application_id=application_id,
            session=session,
        )
        app_data = build_application_response(application)
        app_cache.update(app_data, app_updated_at)

        logger.debug(
            "Application cache for notifications data refreshed with complete data",
            application_id=str(application_id),
            status=app_data["status"].value,
            updated_at=app_data["updated_at"],
        )
        return True
    except ValidationError as e:
        logger.error(
            "Failed to fetch application data for cache refresh before notifications update",
            application_id=str(application_id),
            error=str(e),
        )
        return False


async def pull_notifications(
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
    app_cache: ApplicationCache,
) -> list[WebsocketMessage[dict[str, Any]]]:
    notifications_to_send = []

    async with session_maker() as session, session.begin():
        app_timestamp_result = await session.execute(
            select(GrantApplication.updated_at).where(
                GrantApplication.id == application_id,
                GrantApplication.deleted_at.is_(None),
            )
        )
        app_updated_at = app_timestamp_result.scalar_one_or_none()

        if not app_updated_at:
            logger.warning(
                "Application not found during notification polling",
                application_id=str(application_id),
            )
            return []

        if app_cache.needs_refresh(app_updated_at):
            await _refresh_application_cache(
                application_id=application_id,
                session=session,
                app_cache=app_cache,
                app_updated_at=app_updated_at,
            )
        else:
            logger.debug(
                "Using cached application data",
                application_id=str(application_id),
                cached_timestamp=app_cache.updated_at.isoformat() if app_cache.updated_at else None,
            )

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
                if app_cache.data is None:
                    logger.warning(
                        "Application cache is empty, sending notification without application data",
                        application_id=str(application_id),
                        notification_event=notification.event,
                    )

                message: WebsocketMessage[dict[str, Any]] = {
                    "type": notification.notification_type,
                    "parent_id": application_id,
                    "event": notification.event,
                    "data": notification.data if notification.data else {"message": notification.message},
                    "trace_id": "",
                }

                if app_cache.data is not None:
                    message["application_data"] = dict(app_cache.data)

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

    app_cache = ApplicationCache()

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
                    app_cache=app_cache,
                )

                poll_duration = time.time() - poll_start

                if notifications_to_send:
                    logger.info(
                        "Found and marked undelivered notifications",
                        num_notifications=len(notifications_to_send),
                        application_id=str(application_id),
                        poll_duration_ms=round(poll_duration * 1000, 2),
                        cache_status="refreshed" if app_cache.data and app_cache.updated_at else "empty",
                    )

                    for message in notifications_to_send:
                        logger.debug(
                            "Sending notification to WebSocket client",
                            notification_event=message.get("event"),
                            application_id=str(application_id),
                            app_status=message["application_data"]["status"].value,
                            app_updated_at=message["application_data"]["updated_at"],
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
            cache_final_state="populated" if app_cache.data else "empty",
        )
        raise
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
