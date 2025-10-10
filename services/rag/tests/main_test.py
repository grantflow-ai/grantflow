import base64
from typing import Any
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import msgspec
import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import (
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    PubSubMessage,
    RagRequest,
)
from packages.shared_utils.src.serialization import serialize
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.utils.lengths import create_word_constraint

TraceId = str


@pytest.fixture
def trace_id() -> TraceId:
    return "test-trace-id"


def create_pubsub_event(data: RagRequest | dict[str, Any]) -> PubSubEvent:
    serialized_data = serialize(data)
    encoded_data = base64.b64encode(serialized_data).decode("utf-8")
    trace_id = data.trace_id if hasattr(data, "trace_id") else data.get("trace_id", "test-trace-id")
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            publish_time="2025-01-01T00:00:00Z",
            attributes={"trace_id": trace_id},
        ),
        subscription="test-subscription",
    )


@pytest.fixture
def grant_template_id() -> UUID:
    return uuid4()


@pytest.fixture
def grant_application_id() -> UUID:
    return uuid4()


@pytest.fixture
def pubsub_event_grant_template(grant_template_id: UUID, trace_id: TraceId) -> PubSubEvent:
    data = GrantTemplateRagRequest(
        parent_id=grant_template_id,
        trace_id=trace_id,
    )
    return create_pubsub_event(data)


@pytest.fixture
def pubsub_event_grant_application(grant_application_id: UUID, trace_id: TraceId) -> PubSubEvent:
    data = GrantApplicationRagRequest(
        parent_id=grant_application_id,
        trace_id=trace_id,
    )
    return create_pubsub_event(data)


@pytest.fixture
def mock_grant_template_handler(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch(
        "services.rag.src.main.handle_grant_template_pipeline",
        new_callable=AsyncMock,
    )


@pytest.fixture
def mock_grant_application_handler(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch(
        "services.rag.src.main.handle_grant_application_pipeline",
        new_callable=AsyncMock,
    )


@pytest.fixture(autouse=True)
def mock_llm_initialization(mocker: MockerFixture) -> None:
    mocker.patch("services.rag.src.main.init_llm_connection", return_value=None)


async def test_handle_rag_request_grant_template(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_template: PubSubEvent,
    grant_template_id: UUID,
    mock_grant_template_handler: AsyncMock,
    mock_grant_application_handler: AsyncMock,
    trace_id: TraceId,
    test_application_with_template: GrantApplication,
) -> None:
    from services.rag.src.main import app

    template_id = UUID("00000000-0000-0000-0000-000000000001")

    data = GrantTemplateRagRequest(
        parent_id=template_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201

    mock_grant_template_handler.assert_called_once()
    call_args = mock_grant_template_handler.call_args
    assert call_args.kwargs["grant_template"].id == template_id
    assert call_args.kwargs["trace_id"] == trace_id
    mock_grant_application_handler.assert_not_called()


async def test_handle_rag_request_grant_application(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_application: PubSubEvent,
    grant_application_id: UUID,
    mock_grant_template_handler: AsyncMock,
    mock_grant_application_handler: AsyncMock,
    trace_id: TraceId,
    test_application_with_template: GrantApplication,
) -> None:
    from services.rag.src.main import app

    data = GrantApplicationRagRequest(
        parent_id=test_application_with_template.id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201

    mock_grant_application_handler.assert_called_once()
    call_args = mock_grant_application_handler.call_args
    assert call_args.kwargs["grant_application"].id == test_application_with_template.id
    assert call_args.kwargs["trace_id"] == trace_id
    mock_grant_template_handler.assert_not_called()


async def test_handle_rag_request_invalid_message(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"invalid": "data", "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 201


async def test_handle_rag_request_missing_parent_type(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"parent": str(uuid4()), "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 201


async def test_handle_rag_request_missing_parent_id(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"parent_type": "grant_template", "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 201


async def test_handle_rag_request_invalid_parent_type(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {
        "parent_type": "invalid_type",
        "parent": str(uuid4()),
        "trace_id": trace_id,
    }
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 201


async def test_handle_rag_request_handler_error(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
    mock_grant_template_handler: AsyncMock,
    trace_id: TraceId,
) -> None:
    from services.rag.src.main import app

    template_id = UUID("00000000-0000-0000-0000-000000000001")

    data = GrantTemplateRagRequest(
        parent_id=template_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    mock_grant_template_handler.side_effect = Exception("Handler error")

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 500


async def test_handle_rag_request_invalid_base64(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    invalid_event = PubSubEvent(
        message=PubSubMessage(
            data="invalid-base64!@#",
            message_id="test-message-id",
            publish_time="2025-01-01T00:00:00Z",
            attributes={"trace_id": trace_id},
        ),
        subscription="test-subscription",
    )

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 201


def test_handle_pubsub_message_valid(trace_id: TraceId) -> None:
    from services.rag.src.main import handle_pubsub_message

    parent_id = uuid4()
    request = GrantTemplateRagRequest(
        parent_id=parent_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantTemplateRagRequest)
    assert result.parent_id == parent_id
    assert result.trace_id == trace_id


def test_handle_pubsub_message_invalid() -> None:
    from services.rag.src.main import handle_pubsub_message

    data = {"invalid": "data"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError) as exc_info:
        handle_pubsub_message(event)

    assert "Invalid pubsub message" in str(exc_info.value)


async def test_grant_template_missing_template(
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    from services.rag.src.main import app

    nonexistent_id = uuid4()
    data = GrantTemplateRagRequest(
        parent_id=nonexistent_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201


async def test_grant_application_missing_application(
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    from services.rag.src.main import app

    nonexistent_id = uuid4()
    data = GrantApplicationRagRequest(
        parent_id=nonexistent_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201


async def test_grant_application_missing_grant_template(
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    from packages.db.src.tables import GrantApplication
    from testing.factories import OrganizationFactory, ProjectFactory

    from services.rag.src.main import app

    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        application = GrantApplication(
            title="Test Application",
            project_id=project.id,
        )
        session.add(application)
        await session.commit()
        await session.refresh(application)

        data = GrantApplicationRagRequest(
            parent_id=application.id,
            trace_id=trace_id,
        )
        event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201


async def test_grant_application_missing_grant_sections(
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    from packages.db.src.tables import GrantApplication, GrantTemplate
    from testing.factories import OrganizationFactory, ProjectFactory

    from services.rag.src.main import app

    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        application = GrantApplication(
            title="Test Application",
            project_id=project.id,
        )
        session.add(application)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=application.id,
            granting_institution_id=None,
            grant_sections=[],
            cfp_analysis={"test": "data"},
        )
        session.add(template)
        application.grant_template = template

        await session.commit()
        await session.refresh(application)

        data = GrantApplicationRagRequest(
            parent_id=application.id,
            trace_id=trace_id,
        )
        event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201


async def test_grant_application_missing_cfp_analysis(
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    from packages.db.src.tables import GrantApplication, GrantTemplate
    from testing.factories import OrganizationFactory, ProjectFactory

    from services.rag.src.main import app

    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        application = GrantApplication(
            title="Test Application",
            project_id=project.id,
        )
        session.add(application)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=application.id,
            granting_institution_id=None,
            grant_sections=[
                {
                    "id": "test_section",
                    "title": "Test Section",
                    "order": 1,
                    "keywords": ["test"],
                    "topics": ["test"],
                    "generation_instructions": "Test instructions",
                    "depends_on": [],
                    "length_constraint": create_word_constraint(100, "Test"),
                    "queries": ["test"],
                    "is_plan": False,
                    "clinical": False,
                }
            ],
            cfp_analysis=None,
        )
        session.add(template)
        application.grant_template = template

        await session.commit()
        await session.refresh(application)

        data = GrantApplicationRagRequest(
            parent_id=application.id,
            trace_id=trace_id,
        )
        event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201


async def test_grant_application_valid_request(
    test_application_with_template: GrantApplication,
    trace_id: TraceId,
    mock_grant_application_handler: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    from services.rag.src.main import app

    data = GrantApplicationRagRequest(
        parent_id=test_application_with_template.id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(event))

    assert response.status_code == 201
    mock_grant_application_handler.assert_called_once()
    call_args = mock_grant_application_handler.call_args
    assert call_args.kwargs["grant_application"].id == test_application_with_template.id
    assert call_args.kwargs["trace_id"] == trace_id
