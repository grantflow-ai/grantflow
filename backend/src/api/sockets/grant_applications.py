from asyncio import sleep
from typing import Any
from uuid import UUID

from litestar import websocket
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.api_types import APIWebsocket, WebSocketJsonMessage
from src.api.http.grant_applications import logger
from src.db.enums import UserRoleEnum
from src.utils.db import retrieve_application


@websocket(
    [
        "/workspaces/{workspace_id:uuid}/applications/new",  # for creating a new application ~keep
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",  # for interacting with an existing application ~keep
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GrantApplicationWebsocket",
)
async def handle_application_websocket(
    session_maker: async_sessionmaker[Any],
    socket: APIWebsocket,
    workspace_id: UUID,
    application_id: UUID | None = None,
) -> None:
    logger.info("Retrieving applications for workspace", workspace_id=workspace_id)
    await socket.accept()
    await socket.send_text("Connected")
    if application_id:
        application = await retrieve_application(session_maker=session_maker, application_id=application_id)
        await socket.send_json(WebSocketJsonMessage(type="application", content=application))
    while True:
        await socket.send_text("Waiting for updates...")
        await sleep(10)
