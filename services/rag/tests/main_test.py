import base64
from typing import Any
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import msgspec
import pytest
from litestar.testing import AsyncTestClient
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

TraceId = str


@pytest.fixture
def trace_id() -> TraceId:
    return "test-trace-id"


def create_pubsub_event(data: RagRequest) -> PubSubEvent:
    serialized_data = serialize(data)
    encoded_data = base64.b64encode(serialized_data).decode("utf-8")
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            publish_time="2025-01-01T00:00:00Z",
            attributes={"trace_id": data.trace_id},
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
) -> None:
    from services.rag.src.main import app

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(pubsub_event_grant_template))

    assert response.status_code == 201

    mock_grant_template_handler.assert_called_once_with(
        grant_template_id=grant_template_id,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )
    mock_grant_application_handler.assert_not_called()


async def test_handle_rag_request_grant_application(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_application: PubSubEvent,
    grant_application_id: UUID,
    mock_grant_template_handler: AsyncMock,
    mock_grant_application_handler: AsyncMock,
    trace_id: TraceId,
) -> None:
    from services.rag.src.main import app

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(pubsub_event_grant_application))

    assert response.status_code == 201

    mock_grant_application_handler.assert_called_once_with(
        grant_application_id=grant_application_id,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )
    mock_grant_template_handler.assert_not_called()


async def test_handle_rag_request_invalid_message(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"invalid": "data", "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)  # type: ignore

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 400
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_missing_parent_type(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"parent_id": str(uuid4()), "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)  # type: ignore

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 400
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_missing_parent_id(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {"parent_type": "grant_template", "trace_id": trace_id}
    invalid_event = create_pubsub_event(data)  # type: ignore

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 400
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_invalid_parent_type(trace_id: TraceId) -> None:
    from services.rag.src.main import app

    data = {
        "parent_type": "invalid_type",
        "parent_id": str(uuid4()),
        "trace_id": trace_id,
    }
    invalid_event = create_pubsub_event(data)  # type: ignore

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(invalid_event))

    assert response.status_code == 400
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_handler_error(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_template: PubSubEvent,
    mock_grant_template_handler: AsyncMock,
) -> None:
    from services.rag.src.main import app

    mock_grant_template_handler.side_effect = Exception("Handler error")

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=msgspec.to_builtins(pubsub_event_grant_template))

    assert response.status_code == 500

    assert response.json()["detail"] == "Internal Server Error"


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

    assert response.status_code == 400
    assert "Invalid pubsub message" in response.json()["detail"]


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
    event = create_pubsub_event(data)  # type: ignore

    with pytest.raises(ValidationError) as exc_info:
        handle_pubsub_message(event)

    assert "Invalid pubsub message" in str(exc_info.value)
