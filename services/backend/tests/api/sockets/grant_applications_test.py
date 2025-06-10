from collections.abc import Generator
from typing import Any, cast
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from litestar.exceptions import WebSocketDisconnect
from litestar.testing import TestClient
from packages.db.src.enums import ApplicationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    Workspace,
    WorkspaceUser,
)
from packages.shared_utils.src.pubsub import SourceProcessingResult, WebsocketMessage
from services.backend.src.main import app
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def sync_test_client() -> TestClient[Any]:
    return TestClient(app=app)


@pytest.fixture(autouse=True)
def mock_server_start() -> Generator[None]:
    with (
        patch("services.backend.src.main.get_firebase_app"),
        patch("services.backend.src.main.init_llm_connection"),
    ):
        yield


@pytest.fixture
async def application(workspace: Workspace, async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    application_id = uuid4()

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(GrantApplication).values(
                id=application_id,
                workspace_id=workspace.id,
                title="Test Application",
                status=ApplicationStatusEnum.DRAFT,
            )
        )

        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))
        return cast("GrantApplication", result)


@pytest.fixture
def mock_pull_notifications() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.sockets.grant_applications.pull_notifications") as mock:
        yield mock


async def test_handle_grant_application_notifications_unauthorized_error_no_otp(
    workspace: Workspace,
    application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp=") as ws,
    ):
        ws.receive_json()


async def test_handle_grant_application_notifications_unauthorized_error_no_workspace_user(
    workspace: Workspace,
    application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
    sync_test_client: TestClient[Any],
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ) as ws,
    ):
        ws.receive_json()


async def test_handle_grant_application_notifications_success(
    workspace: Workspace,
    application: GrantApplication,
    workspace_member_user: WorkspaceUser,
    otp_code: str,
    sync_test_client: TestClient[Any],
    mock_pull_notifications: AsyncMock,
) -> None:
    test_notifications = [
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            identifier="test_document.pdf",
        ),
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("223e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            identifier="https://example.com/resource",
        ),
    ]

    wrapped_notifications = [
        WebsocketMessage(
            type="data",
            parent_id=notification["parent_id"],
            event="source_processing",
            data=notification,
        )
        for notification in test_notifications
    ]

    mock_pull_notifications.side_effect = [
        wrapped_notifications,
        [],
    ]

    with (
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ) as ws,
    ):
        message1 = ws.receive_json()
        assert message1["type"] == "data"
        assert message1["event"] == "source_processing"
        assert message1["parent_id"] == str(application.id)
        notification1 = message1["data"]
        assert notification1["parent_id"] == str(application.id)
        assert notification1["parent_type"] == "grant_application"
        assert notification1["rag_source_id"] == "123e4567-e89b-12d3-a456-426614174000"
        assert notification1["indexing_status"] == "FINISHED"
        assert notification1["identifier"] == "test_document.pdf"

        message2 = ws.receive_json()
        assert message2["type"] == "data"
        assert message2["event"] == "source_processing"
        assert message2["parent_id"] == str(application.id)
        notification2 = message2["data"]
        assert notification2["parent_id"] == str(application.id)
        assert notification2["parent_type"] == "grant_application"
        assert notification2["rag_source_id"] == "223e4567-e89b-12d3-a456-426614174000"
        assert notification2["indexing_status"] == "INDEXING"
        assert notification2["identifier"] == "https://example.com/resource"

    assert mock_pull_notifications.call_count >= 1
    call_kwargs = mock_pull_notifications.call_args_list[0].kwargs
    assert call_kwargs["parent_id"] == application.id


async def test_handle_grant_application_notifications_failed_status(
    workspace: Workspace,
    application: GrantApplication,
    workspace_member_user: WorkspaceUser,
    otp_code: str,
    sync_test_client: TestClient[Any],
    mock_pull_notifications: AsyncMock,
) -> None:
    test_notifications = [
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("323e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.FAILED,
            identifier="error_document.pdf",
        ),
    ]

    wrapped_notifications = [
        WebsocketMessage(
            type="data",
            parent_id=notification["parent_id"],
            event="source_processing",
            data=notification,
        )
        for notification in test_notifications
    ]

    mock_pull_notifications.side_effect = [
        wrapped_notifications,
        [],
    ]

    with (
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ) as ws,
    ):
        message = ws.receive_json()
        assert message["type"] == "data"
        assert message["event"] == "source_processing"
        notification = message["data"]
        assert notification["rag_source_id"] == "323e4567-e89b-12d3-a456-426614174000"
        assert notification["indexing_status"] == "FAILED"
        assert notification["identifier"] == "error_document.pdf"


async def test_handle_grant_application_notifications_empty_notifications(
    workspace: Workspace,
    application: GrantApplication,
    workspace_member_user: WorkspaceUser,
    otp_code: str,
    sync_test_client: TestClient[Any],
    mock_pull_notifications: AsyncMock,
) -> None:
    mock_pull_notifications.return_value = []

    with (
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ),
    ):
        pass

    mock_pull_notifications.assert_called()


async def test_handle_grant_application_notifications_different_roles(
    workspace: Workspace,
    application: GrantApplication,
    workspace_admin_user: WorkspaceUser,
    otp_code: str,
    sync_test_client: TestClient[Any],
    mock_pull_notifications: AsyncMock,
) -> None:
    test_notifications = [
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("423e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            identifier="admin_test.pdf",
        ),
    ]

    wrapped_notifications = [
        WebsocketMessage(
            type="data",
            parent_id=notification["parent_id"],
            event="source_processing",
            data=notification,
        )
        for notification in test_notifications
    ]

    mock_pull_notifications.side_effect = [
        wrapped_notifications,
        [],
    ]

    with (
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ) as ws,
    ):
        message = ws.receive_json()
        assert message["type"] == "data"
        assert message["event"] == "source_processing"
        notification = message["data"]
        assert notification["identifier"] == "admin_test.pdf"


async def test_handle_grant_application_notifications_continuous_updates(
    workspace: Workspace,
    application: GrantApplication,
    workspace_member_user: WorkspaceUser,
    otp_code: str,
    sync_test_client: TestClient[Any],
    mock_pull_notifications: AsyncMock,
) -> None:
    round1 = [
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("523e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            identifier="doc1.pdf",
        ),
    ]

    round2 = [
        SourceProcessingResult(
            parent_id=application.id,
            parent_type="grant_application",
            rag_source_id=UUID("523e4567-e89b-12d3-a456-426614174000"),
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            identifier="doc1.pdf",
        ),
    ]

    wrapped_round1 = [
        WebsocketMessage(
            type="data",
            parent_id=notification["parent_id"],
            event="source_processing",
            data=notification,
        )
        for notification in round1
    ]

    wrapped_round2 = [
        WebsocketMessage(
            type="data",
            parent_id=notification["parent_id"],
            event="source_processing",
            data=notification,
        )
        for notification in round2
    ]

    mock_pull_notifications.side_effect = [
        wrapped_round1,
        wrapped_round2,
        [],
    ]

    with (
        sync_test_client as client,
        client.websocket_connect(
            f"/workspaces/{workspace.id}/applications/{application.id}/notifications?otp={otp_code}"
        ) as ws,
    ):
        message1 = ws.receive_json()
        assert message1["type"] == "data"
        assert message1["event"] == "source_processing"
        notification1 = message1["data"]
        assert notification1["rag_source_id"] == "523e4567-e89b-12d3-a456-426614174000"
        assert notification1["indexing_status"] == "INDEXING"

        message2 = ws.receive_json()
        assert message2["type"] == "data"
        assert message2["event"] == "source_processing"
        notification2 = message2["data"]
        assert notification2["rag_source_id"] == "523e4567-e89b-12d3-a456-426614174000"
        assert notification2["indexing_status"] == "FINISHED"

    assert mock_pull_notifications.call_count >= 2
