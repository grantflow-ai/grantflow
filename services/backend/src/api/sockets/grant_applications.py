import asyncio
import time
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from litestar import websocket_stream
from packages.db.src.enums import ApplicationStatusEnum, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.query_helpers import update_active_by_id
from packages.db.src.tables import GenerationNotification, GrantApplication, RagFile, RagUrl
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import WebsocketMessage
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


async def _build_application_response(
    application: GrantApplication,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "id": str(application.id),
        "project_id": str(application.project_id),
        "title": application.title,
        "status": application.status,
        "rag_sources": [],
        "created_at": application.created_at.isoformat(),
        "updated_at": application.updated_at.isoformat(),
        "editor_document_id": str(application.editor_documents[0].id) if application.editor_documents else None,
        "editor_document_init": application.editor_documents[0].crdt is not None
        if application.editor_documents
        else False,
    }

    if application.description:
        response["description"] = application.description

    if application.completed_at:
        response["completed_at"] = application.completed_at.isoformat()

    if application.form_inputs:
        response["form_inputs"] = application.form_inputs

    if application.research_objectives:
        response["research_objectives"] = application.research_objectives

    if application.text:
        response["text"] = application.text

    if application.parent_id:
        response["parent_id"] = str(application.parent_id)

    if application.grant_template:
        template = application.grant_template
        template_response: dict[str, Any] = {
            "id": str(template.id),
            "grant_application_id": str(template.grant_application_id),
            "grant_sections": template.grant_sections,
            "rag_sources": [],
            "created_at": template.created_at.isoformat(),
            "updated_at": template.updated_at.isoformat(),
        }

        if template.granting_institution_id:
            template_response["granting_institution_id"] = str(template.granting_institution_id)

        if template.submission_date:
            template_response["submission_date"] = template.submission_date.isoformat()
            response["deadline"] = template.submission_date.isoformat()

        if template.granting_institution:
            org = template.granting_institution
            granting_institution_response: dict[str, Any] = {
                "id": str(org.id),
                "full_name": org.full_name,
                "created_at": org.created_at.isoformat(),
                "updated_at": org.updated_at.isoformat(),
            }
            if org.abbreviation:
                granting_institution_response["abbreviation"] = org.abbreviation
            template_response["granting_institution"] = granting_institution_response

        if hasattr(template, "rag_sources") and template.rag_sources:
            for template_rag_source in template.rag_sources:
                rag_source = template_rag_source.rag_source
                source_response: dict[str, Any] = {
                    "sourceId": str(rag_source.id),
                    "status": rag_source.indexing_status,
                }
                if isinstance(rag_source, RagUrl):
                    source_response["url"] = rag_source.url
                elif isinstance(rag_source, RagFile):
                    source_response["filename"] = rag_source.filename
                template_response["rag_sources"].append(source_response)

        response["grant_template"] = template_response

    if application.rag_sources:
        for app_rag_source in application.rag_sources:
            rag_source = app_rag_source.rag_source
            app_source_response: dict[str, Any] = {
                "sourceId": str(rag_source.id),
                "status": rag_source.indexing_status,
            }
            if isinstance(rag_source, RagUrl):
                app_source_response["url"] = rag_source.url
            elif isinstance(rag_source, RagFile):
                app_source_response["filename"] = rag_source.filename
            response["rag_sources"].append(app_source_response)

    return response


class ApplicationCache:
    def __init__(self) -> None:
        self.data: dict[str, Any] | None = None
        self.updated_at: datetime | None = None

    def needs_refresh(self, db_updated_at: datetime) -> bool:
        if self.updated_at is None:
            return True
        return db_updated_at > self.updated_at

    def update(self, data: dict[str, Any], updated_at: datetime) -> None:
        self.data = data
        self.updated_at = updated_at


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
            logger.debug(
                "Refreshing application cache",
                application_id=str(application_id),
                cached_timestamp=app_cache.updated_at.isoformat() if app_cache.updated_at else None,
                db_timestamp=app_updated_at.isoformat(),
            )
            try:
                application = await retrieve_application(
                    application_id=application_id,
                    session=session,
                )
                app_data = await _build_application_response(application)
                app_cache.update(app_data, app_updated_at)

                logger.debug(
                    "Application cache refreshed with complete data",
                    application_id=str(application_id),
                    status=app_data["status"].value,
                    updated_at=app_data["updated_at"],
                )
            except ValidationError as e:
                logger.error(
                    "Failed to fetch application data for cache refresh",
                    application_id=str(application_id),
                    error=str(e),
                )
                return []
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
            if app_cache.data is None:
                logger.error(
                    "Application cache is empty, cannot attach application data",
                    application_id=str(application_id),
                )
                return []

            for notification in notifications:
                message: WebsocketMessage[dict[str, Any]] = {
                    "type": notification.notification_type,
                    "parent_id": application_id,
                    "event": notification.event,
                    "data": notification.data if notification.data else {"message": notification.message},
                    "trace_id": "",
                    "application_data": app_cache.data,
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
