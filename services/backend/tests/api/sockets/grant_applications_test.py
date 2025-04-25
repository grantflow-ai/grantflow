from collections.abc import Generator
from datetime import UTC, datetime
from os import environ
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException, WebSocketDisconnect
from litestar.testing import TestClient
from packages.db.src.enums import ApplicationStatusEnum, FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    RagFile,
    Workspace,
    WorkspaceUser,
)
from services.backend.src.api.main import app
from services.backend.src.api.sockets.grant_applications import (
    EVENT_APPLICATION_CANCELLED,
    EVENT_APPLICATION_CREATED,
    EVENT_APPLICATION_SETUP,
    EVENT_CANCEL_APPLICATION,
    EVENT_GENERATE_APPLICATION,
    EVENT_GENERATION_COMPLETE,
    EVENT_KNOWLEDGE_BASE,
    EVENT_KNOWLEDGE_BASE_SUCCESS,
    EVENT_RESEARCH_DEEP_DIVE,
    EVENT_RESEARCH_DEEP_DIVE_SUCCESS,
    EVENT_RESEARCH_PLAN,
    EVENT_RESEARCH_PLAN_SUCCESS,
    EVENT_TEMPLATE_REVIEW,
    EVENT_TEMPLATE_UPDATE_SUCCESS,
    ApplicationSetupInput,
    MessageHandler,
    ResearchDeepDiveInput,
    ResearchObjectiveInput,
    ResearchPlanInput,
    ResearchTask,
    TemplateReviewInput,
    prepare_wizard_response,
)
from services.backend.src.dto import WebsocketDataMessage
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker


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
async def application_with_file(
    application: GrantApplication, async_session_maker: async_sessionmaker[Any]
) -> tuple[GrantApplication, UUID]:
    file_id = uuid4()

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagFile).values(
                id=file_id,
                filename="test_file.pdf",
                mime_type="application/pdf",
                size=1024,
                indexing_status=FileIndexingStatusEnum.FINISHED,
            )
        )

        await session.execute(
            insert(GrantApplicationFile).values(
                rag_file_id=file_id,
                grant_application_id=application.id,
            )
        )

        await session.commit()

    return application, file_id


@pytest.fixture
def mock_template_generation() -> Generator[None, None, None]:
    with patch("src.api.sockets.grant_applications.grant_template_generation_pipeline_handler") as mock:
        mock.return_value = None
        yield


@pytest.fixture
def mock_application_generation() -> Generator[None, None, None]:
    with patch("src.api.sockets.grant_applications.grant_application_text_generation_pipeline_handler") as mock:
        mock.return_value = ("Generated application text", {"section1": "Section 1 content"})
        yield


@pytest.fixture
def mock_extract_file_content() -> Generator[None, None, None]:
    with patch("src.utils.extraction.extract_file_content") as mock:
        mock.return_value = ("Test content", None)
        yield


@pytest.fixture
def mock_extract_webpage_content() -> Generator[None, None, None]:
    with patch("src.utils.extraction.extract_webpage_content") as mock:
        mock.return_value = "Test content"
        yield


@pytest.fixture
async def websocket_message_handler() -> MessageHandler:
    socket_mock = AsyncMock()
    return MessageHandler(socket=socket_mock)


@pytest.fixture
def sync_test_client(valkey_connection_string: str) -> TestClient[Any]:
    environ["VALKEY_CONNECTION_STRING"] = valkey_connection_string
    return TestClient(app=app)


async def test_grant_application_websocket_create_application_unauthorized_error_no_otp(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        sync_test_client.websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp=") as ws,
    ):
        ws.receive_json()


async def test_grant_application_websocket_create_application_unauthorized_error_no_workspace_user(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
    sync_test_client: TestClient[Any],
) -> None:
    with (
        pytest.raises(WebSocketDisconnect),
        sync_test_client.websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp={otp_code}") as ws,
    ):
        ws.receive_json()


async def test_get_cfp_content_validation_error() -> None:
    from services.backend.src.api.sockets.grant_applications import get_cfp_content

    with pytest.raises(ValidationException) as exc_info:
        await get_cfp_content(None, None)

    assert "Either one file or a CFP URL is required" in str(exc_info.value)


async def test_message_handler_send_message(websocket_message_handler: MessageHandler) -> None:
    message = WebsocketDataMessage(
        type="data",
        event="test_event",
        content={"test": "data"},
        message="Test message",
    )

    await websocket_message_handler.send_message(message)

    websocket_message_handler._socket.send_json.assert_called_once_with(message)  # type: ignore[attr-defined] # noqa: SLF001


async def test_grant_application_websocket_create_application_default(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/new?otp={otp_code}") as ws,
    ):
        data = ws.receive_json()

    assert data["type"] == "data"
    assert data["event"] == EVENT_APPLICATION_CREATED

    assert "content" in data
    assert "data" in data["content"]
    assert "id" in data["content"]["data"]

    application_id = data["content"]["data"]["id"]

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == UUID(application_id)))

        assert result is not None
        assert result.workspace_id == workspace.id
        assert result.status == ApplicationStatusEnum.DRAFT


async def test_application_setup(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    mock_template_generation: None,
    mock_extract_webpage_content: None,
    sync_test_client: TestClient[Any],
) -> None:
    setup_data = {
        "type": "data",
        "event": EVENT_APPLICATION_SETUP,
        "content": {
            "title": "Updated Application Title",
            "cfp_url": "https://example.com/cfp",
        },
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(setup_data)

        setup_response = ws.receive_json()
        assert setup_response["type"] == "data"

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application.id))

        assert result is not None
        assert result.title == "Updated Application Title"
        assert result.status == ApplicationStatusEnum.IN_PROGRESS


async def test_application_setup_validation_error_no_title(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    setup_data = {
        "type": "data",
        "event": EVENT_APPLICATION_SETUP,
        "content": {
            "cfp_url": "https://example.com/cfp",
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Application title is required"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(setup_data)
        ws.receive_json()


async def test_application_setup_validation_error_no_cfp(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    setup_data = {
        "type": "data",
        "event": EVENT_APPLICATION_SETUP,
        "content": {
            "title": "Updated Application Title",
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Either a CFP file or URL is required"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(setup_data)
        ws.receive_json()


async def test_research_plan_validation_error_missing_tasks(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    research_objectives = [
        {
            "title": "This is a valid longer title",
            "description": "Research objective description",
            "research_tasks": [],
        }
    ]

    plan_data = {
        "type": "data",
        "event": EVENT_RESEARCH_PLAN,
        "content": {
            "research_objectives": research_objectives,
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Each objective must have at least one research task"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(plan_data)
        ws.receive_json()


async def test_research_plan_validation_error_short_task_title(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    research_objectives = [
        {
            "title": "This is a valid longer title",
            "description": "Research objective description",
            "research_tasks": [
                {
                    "title": "Short",
                    "description": "Research task description",
                }
            ],
        }
    ]

    plan_data = {
        "type": "data",
        "event": EVENT_RESEARCH_PLAN,
        "content": {
            "research_objectives": research_objectives,
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Each task must have a title of at least 10 characters"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(plan_data)
        ws.receive_json()


async def test_template_review_validation_error_no_template_data(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    template_data = {
        "type": "data",
        "event": EVENT_TEMPLATE_REVIEW,
        "content": {
            "funding_organization_id": "some-id",
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Grant template data is required"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(template_data)
        ws.receive_json()


async def test_template_review(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    funding_organization: FundingOrganization,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    sections = [
        {
            "type": "section",
            "title": "Test Section",
            "description": "Test Description",
            "score": 10,
            "section_id": "test-section",
        }
    ]

    template_data = {
        "type": "data",
        "event": EVENT_TEMPLATE_REVIEW,
        "content": {
            "grant_template": {
                "grant_sections": sections,
            },
            "funding_organization_id": str(funding_organization.id),
        },
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(template_data)
        response = ws.receive_json()

    assert response["type"] == "data"
    assert response["event"] == EVENT_TEMPLATE_UPDATE_SUCCESS

    async with async_session_maker() as session:
        template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == application.id)
        )

        assert template is not None
        assert template.funding_organization_id == funding_organization.id
        assert len(template.grant_sections) == 1
        assert template.grant_sections[0]["title"] == "Test Section"


async def test_research_plan(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    research_objectives = [
        {
            "title": "Research Objective Title",
            "description": "Research objective description",
            "research_tasks": [
                {
                    "title": "Research Task Title",
                    "description": "Research task description",
                }
            ],
        }
    ]

    plan_data = {
        "type": "data",
        "event": EVENT_RESEARCH_PLAN,
        "content": {
            "research_objectives": research_objectives,
        },
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(plan_data)
        response = ws.receive_json()

    assert response["type"] == "data"
    assert response["event"] == EVENT_RESEARCH_PLAN_SUCCESS

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application.id))

        assert result is not None
        assert len(result.research_objectives) == 1
        assert result.research_objectives[0]["title"] == "Research Objective Title"
        assert len(result.research_objectives[0]["research_tasks"]) == 1


async def test_research_plan_validation_error_short_title(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    research_objectives = [
        {
            "title": "Short",
            "description": "Research objective description",
            "research_tasks": [],
        }
    ]

    plan_data = {
        "type": "data",
        "event": EVENT_RESEARCH_PLAN,
        "content": {
            "research_objectives": research_objectives,
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="Each objective must have a title of at least 10 characters"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(plan_data)
        ws.receive_json()


async def test_knowledge_base(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application_with_file: tuple[GrantApplication, UUID],
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    application, file_id = application_with_file

    knowledge_base_data = {
        "type": "data",
        "event": EVENT_KNOWLEDGE_BASE,
        "content": {},  # No content needed, it just validates files exist
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(knowledge_base_data)
        response = ws.receive_json()

    assert response["type"] == "data"
    assert response["event"] == EVENT_KNOWLEDGE_BASE_SUCCESS

    # Verify completed steps includes knowledge_base
    assert "completed_steps" in response["content"]
    assert EVENT_KNOWLEDGE_BASE in response["content"]["completed_steps"]


async def test_knowledge_base_validation_error_no_files(
    workspace: Workspace,
    application: GrantApplication,  # Using application without files
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    knowledge_base_data = {
        "type": "data",
        "event": EVENT_KNOWLEDGE_BASE,
        "content": {},
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match="At least one file must be uploaded before proceeding"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(knowledge_base_data)
        ws.receive_json()


async def test_research_deep_dive(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    deep_dive_data = {
        "type": "data",
        "event": EVENT_RESEARCH_DEEP_DIVE,
        "content": {
            "research_deep_dive": {
                "significance": "Significance text",
                "innovation": "Innovation text",
            },
        },
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(deep_dive_data)
        response = ws.receive_json()

    assert response["type"] == "data"
    assert response["event"] == EVENT_RESEARCH_DEEP_DIVE_SUCCESS

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application.id))

        assert result is not None
        assert result.form_inputs == {
            "significance": "Significance text",
            "innovation": "Innovation text",
        }


async def test_generate_application(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    mock_application_generation: None,
    sync_test_client: TestClient[Any],
) -> None:
    generate_data = {
        "type": "data",
        "event": EVENT_GENERATE_APPLICATION,
        "content": {},
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(generate_data)
        info_response = ws.receive_json()
        final_response = ws.receive_json()

    assert info_response["type"] == "info"
    assert final_response["type"] == "data"
    assert final_response["event"] == EVENT_GENERATION_COMPLETE

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application.id))

        assert result is not None
        assert result.status == ApplicationStatusEnum.COMPLETED
        assert result.text == "Generated application text"
        assert result.completed_at is not None


async def test_cancel_application(
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    cancel_data = {
        "type": "data",
        "event": EVENT_CANCEL_APPLICATION,
        "content": {},
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(cancel_data)
        response = ws.receive_json()

    assert response["type"] == "info"
    assert response["event"] == EVENT_APPLICATION_CANCELLED

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == application.id))

        assert result is None


async def test_invalid_event_type(
    workspace: Workspace,
    application: GrantApplication,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    invalid_data = {
        "type": "data",
        "event": "invalid_event_type",
        "content": {},
    }

    with (
        sync_test_client as client,
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{application.id}?otp={otp_code}") as ws,
    ):
        ws.send_json(invalid_data)

        valid_data = {
            "type": "data",
            "event": EVENT_CANCEL_APPLICATION,
            "content": {},
        }
        ws.send_json(valid_data)
        response = ws.receive_json()

        assert response["type"] == "info"
        assert response["event"] == EVENT_APPLICATION_CANCELLED


async def test_application_not_found(
    workspace: Workspace,
    otp_code: str,
    workspace_member_user: WorkspaceUser,
    sync_test_client: TestClient[Any],
) -> None:
    non_existent_id = uuid4()

    setup_data = {
        "type": "data",
        "event": EVENT_APPLICATION_SETUP,
        "content": {
            "title": "Updated Application Title",
            "cfp_url": "https://example.com/cfp",
        },
    }

    client = sync_test_client
    with (
        pytest.raises(WebSocketDisconnect, match=f"Application with ID {non_existent_id} not found"),
        client.websocket_connect(f"/workspaces/{workspace.id}/applications/{non_existent_id}?otp={otp_code}") as ws,
    ):
        ws.send_json(setup_data)
        ws.receive_json()


async def test_store_wizard_state(
    application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    from litestar.stores.valkey import ValkeyStore
    from services.backend.src.api.sockets.grant_applications import store_wizard_state

    mock_store = AsyncMock(spec=ValkeyStore)
    mock_store.get.return_value = None

    completed_steps = await store_wizard_state(mock_store, EVENT_APPLICATION_SETUP)
    assert len(completed_steps) == 1
    assert completed_steps[0] == EVENT_APPLICATION_SETUP

    mock_store.set.assert_called_once()

    from packages.shared_utils.src.serialization import serialize

    mock_store.get.return_value = serialize([EVENT_APPLICATION_SETUP])

    completed_steps = await store_wizard_state(mock_store, EVENT_TEMPLATE_REVIEW)
    assert len(completed_steps) == 2
    assert EVENT_APPLICATION_SETUP in completed_steps
    assert EVENT_TEMPLATE_REVIEW in completed_steps


def test_prepare_wizard_response() -> None:
    application = GrantApplication(
        id=uuid4(),
        title="Test Application",
        status=ApplicationStatusEnum.DRAFT,
        research_objectives=[],
        form_inputs={},
        text=None,
        completed_at=None,
        created_at=datetime.now(tz=UTC),
        updated_at=datetime.now(tz=UTC),
        grant_template=None,
    )

    response = prepare_wizard_response(application)
    assert response["data"]["id"] == str(application.id)
    assert response["data"]["title"] == "Test Application"

    response_with_steps = prepare_wizard_response(application, ["step1", "step2"])
    assert "completed_steps" in response_with_steps
    assert response_with_steps["completed_steps"] == ["step1", "step2"]


def test_valid_input_with_file() -> None:
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.pdf"

    input_data = ApplicationSetupInput(
        title="Test Application",
        cfp_file=mock_file,
    )
    assert input_data.title == "Test Application"
    assert input_data.cfp_file == mock_file
    assert input_data.cfp_url is None


def test_valid_input_with_url() -> None:
    input_data = ApplicationSetupInput(
        title="Test Application",
        cfp_url="https://example.com/cfp",
    )
    assert input_data.title == "Test Application"
    assert input_data.cfp_file is None
    assert input_data.cfp_url == "https://example.com/cfp"


def test_validation_error_no_title() -> None:
    with pytest.raises(ValidationException, match="Application title is required"):
        ApplicationSetupInput(
            title="",
            cfp_url="https://example.com/cfp",
        )


def test_validation_error_no_cfp() -> None:
    with pytest.raises(ValidationException, match="Either a CFP file or URL is required"):
        ApplicationSetupInput(
            title="Test Application",
        )


def test_valid_task() -> None:
    task = ResearchTask(
        title="Research Task With Valid Length",
        description="Task description",
    )
    assert task.title == "Research Task With Valid Length"
    assert task.description == "Task description"


def test_validation_error_short_title() -> None:
    with pytest.raises(ValidationException, match="Each task must have a title of at least 10 characters"):
        ResearchTask(
            title="Too Short",
        )


def test_validation_error_empty_title() -> None:
    with pytest.raises(ValidationException, match="Each task must have a title of at least 10 characters"):
        ResearchTask(
            title="",
        )


def test_valid_objective() -> None:
    task = ResearchTask(
        title="Research Task With Valid Length",
        description="Task description",
    )
    objective = ResearchObjectiveInput(
        title="Research Objective With Valid Length",
        description="Objective description",
        research_tasks=[task],
    )
    assert objective.title == "Research Objective With Valid Length"
    assert objective.description == "Objective description"
    assert len(objective.research_tasks) == 1
    assert objective.research_tasks[0] == task


def test_validation_error_research_task_short_title() -> None:
    task = ResearchTask(
        title="Research Task With Valid Length",
    )
    with pytest.raises(ValidationException, match="Each objective must have a title of at least 10 characters"):
        ResearchObjectiveInput(
            title="Short",
            research_tasks=[task],
        )


def test_validation_error_no_tasks() -> None:
    with pytest.raises(ValidationException, match="Each objective must have at least one research task"):
        ResearchObjectiveInput(
            title="Research Objective With Valid Length",
            research_tasks=[],
        )


def test_valid_plan() -> None:
    task = ResearchTask(
        title="Research Task With Valid Length",
    )
    objective = ResearchObjectiveInput(
        title="Research Objective With Valid Length",
        research_tasks=[task],
    )
    plan = ResearchPlanInput(
        research_objectives=[objective],
    )
    assert len(plan.research_objectives) == 1
    assert plan.research_objectives[0] == objective


def test_validation_error_no_objectives() -> None:
    with pytest.raises(ValidationException, match="At least one research objective is required"):
        ResearchPlanInput(
            research_objectives=[],
        )


def test_valid_template() -> None:
    template = TemplateReviewInput(
        grant_template={"grant_sections": [{"title": "Test Section"}]},
        funding_organization_id="org-123",
    )
    assert template.grant_template == {"grant_sections": [{"title": "Test Section"}]}
    assert template.funding_organization_id == "org-123"


def test_validation_error_no_template() -> None:
    with pytest.raises(ValidationException, match="Grant template data is required"):
        TemplateReviewInput(
            grant_template={},
            funding_organization_id="org-123",
        )


def test_optional_funding_organization() -> None:
    template = TemplateReviewInput(
        grant_template={"grant_sections": [{"title": "Test Section"}]},
    )
    assert template.grant_template == {"grant_sections": [{"title": "Test Section"}]}
    assert template.funding_organization_id is None


def test_default_empty_dict() -> None:
    deep_dive = ResearchDeepDiveInput()
    assert deep_dive.research_deep_dive == {}


def test_with_data() -> None:
    data = {"significance": "Research significance", "innovation": "Innovation details"}
    deep_dive = ResearchDeepDiveInput(research_deep_dive=data)
    assert deep_dive.research_deep_dive == data
