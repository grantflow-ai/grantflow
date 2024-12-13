import logging
from asyncio import sleep
from time import time
from uuid import UUID

from sanic import Websocket
from sqlalchemy import exists, insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationDraftGenerationResponse,
    ChatErrorNotification,
    ChatGenerationResultMessage,
    ChatNotification,
)
from src.db.tables import (
    ApplicationDraft,
    ApplicationFile,
    FileIndexingStatusEnum,
    GrantApplication,
    GrantCfp,
    ResearchAim,
)
from src.rag.application_draft_generation import generate_application_draft
from src.utils.serialization import serialize
from src.utils.ws import NotificationSender

logger = logging.getLogger(__name__)

PROCESSING_SLEEP_INTERVAL = 30  # seconds


async def chat_room_ws_handler(request: APIRequest, ws: Websocket, workspace_id: UUID, application_id: UUID) -> None:
    """Route handler for the application chat room websocket.

    Args:
        request: The request object.
        ws: The websocket object.
        workspace_id: The workspace ID.
        application_id: The application
    """
    logger.info("Web socket request with ID %s", application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    notification_sender = NotificationSender(ws)

    try:
        async with request.ctx.session_maker() as session:
            is_processing_files = True
            while is_processing_files:
                if is_processing_files := await session.scalar(
                    select(
                        exists(
                            select(ApplicationFile)
                            .where(ApplicationFile.application_id == application_id)
                            .where(ApplicationFile.status == FileIndexingStatusEnum.INDEXING)
                        )
                    )
                ):
                    await notification_sender.info("Indexing files...")
                    await sleep(PROCESSING_SLEEP_INTERVAL)

        async with request.ctx.session_maker() as session:
            application = await session.scalar(
                select(GrantApplication)
                .options(
                    selectinload(GrantApplication.cfp).selectinload(GrantCfp.funding_organization),
                    selectinload(GrantApplication.application_files),
                    selectinload(GrantApplication.research_aims).selectinload(ResearchAim.research_tasks),
                )
                .where(GrantApplication.id == application_id)
            )

        start_time = time()
        await notification_sender.info("Beginning Text Generation")

        result = await generate_application_draft(application=application, notification_sender=notification_sender)
        duration = int(time() - start_time)

        async with request.ctx.session_maker() as session, session.begin():
            try:
                insert_statement = insert(ApplicationDraft).values(
                    {"application_id": application_id, "text": result, "duration": duration}
                )
                await session.execute(insert_statement)
                await session.commit()
            except SQLAlchemyError as e:
                logging.error("Error inserting generation result: %s", e)
                await session.rollback()
                await ws.send(
                    serialize(
                        ChatErrorNotification(
                            type="error",
                            text="An error occurred while processing the application.",
                        )
                    ).decode()
                )
                return

        await notification_sender.info("Text Generation Completed.")
        await notification_sender.debug(f"Text Generation took {duration} seconds.")

        await ws.send(
            serialize(
                ChatGenerationResultMessage(
                    type="content",
                    data=ApplicationDraftGenerationResponse(content=result, duration=duration),
                )
            ).decode()
        )

        async for msg in ws:
            logger.info("Received message: %s", msg)
            await ws.send(serialize(ChatNotification(type="notification", text="Received message: " + msg)).decode())

    except Exception as e:  # noqa: BLE001
        logger.error(
            "An error occurred while processing grant application with ID %s application: %s", application_id, e
        )
        await ws.send(
            serialize(
                ChatErrorNotification(
                    type="error",
                    text="An error occurred while processing the application.",
                )
            ).decode()
        )
