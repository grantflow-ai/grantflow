from typing import Any

import pytest
from litestar.exceptions import WebSocketDisconnect
from litestar.testing import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.main import app
from src.db.tables import Workspace, WorkspaceUser


async def test_grant_application_websocket_create_application_default(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
    workspace_member_user: WorkspaceUser,
) -> None:
    with (
        TestClient(app=app) as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp={otp_code}") as ws,
    ):
        data = ws.receive_json()

    assert data["type"] == "data"
    assert data["event"] == "application_creation_success"

    assert "content" in data
    assert "application_id" in data["content"]


async def test_grant_application_websocket_create_application_unauthorized_error_no_otp(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: WorkspaceUser,
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        TestClient(app=app).websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp=") as ws,
    ):
        ws.receive_json()


async def test_grant_application_websocket_create_application_unauthorized_error_no_workspace_user(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        TestClient(app=app).websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp={otp_code}") as ws,
    ):
        ws.receive_json()
