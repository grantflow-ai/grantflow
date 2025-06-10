import json
from base64 import b64encode
from typing import Any
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from litestar.testing import AsyncTestClient
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import PubSubEvent
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.main import app, handle_pubsub_message


def create_pubsub_event(data: dict[str, Any]) -> PubSubEvent:
    return {
        "message": {
            "data": b64encode(json.dumps(data).encode("utf-8")).decode("utf-8"),
            "messageId": "test-message-id",
            "publishTime": "2025-01-01T00:00:00Z",
            "attributes": {},
        },
        "subscription": "test-subscription",
    }


@pytest.fixture
def grant_template_id() -> UUID:
    return uuid4()


@pytest.fixture
def grant_application_id() -> UUID:
    return uuid4()


@pytest.fixture
def pubsub_event_grant_template(grant_template_id: UUID) -> PubSubEvent:
    data = {
        "parent_type": "grant_template",
        "parent_id": str(grant_template_id),
    }
    return create_pubsub_event(data)


@pytest.fixture
def pubsub_event_grant_application(grant_application_id: UUID) -> PubSubEvent:
    data = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application_id),
    }
    return create_pubsub_event(data)


@pytest.fixture
def mock_grant_template_handler(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch(
        "services.rag.src.main.grant_template_generation_pipeline_handler",
        new_callable=AsyncMock,
    )


@pytest.fixture
def mock_grant_application_handler(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch(
        "services.rag.src.main.grant_application_text_generation_pipeline_handler",
        new_callable=AsyncMock,
    )


async def test_handle_rag_request_grant_template(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_template: PubSubEvent,
    grant_template_id: UUID,
    mock_grant_template_handler: AsyncMock,
    mock_grant_application_handler: AsyncMock,
) -> None:
    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=pubsub_event_grant_template)

    assert response.status_code == 201

    mock_grant_template_handler.assert_called_once_with(
        grant_template_id=grant_template_id,
        session_maker=async_session_maker,
    )
    mock_grant_application_handler.assert_not_called()


async def test_handle_rag_request_grant_application(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_application: PubSubEvent,
    grant_application_id: UUID,
    mock_grant_template_handler: AsyncMock,
    mock_grant_application_handler: AsyncMock,
) -> None:
    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=pubsub_event_grant_application)

    assert response.status_code == 201

    mock_grant_application_handler.assert_called_once_with(
        grant_application_id=grant_application_id,
        session_maker=async_session_maker,
    )
    mock_grant_template_handler.assert_not_called()


async def test_handle_rag_request_invalid_message() -> None:
    data = {"invalid": "data"}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=invalid_event)

    assert response.status_code == 500
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_missing_parent_type() -> None:
    data = {"parent_id": str(uuid4())}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=invalid_event)

    assert response.status_code == 500
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_missing_parent_id() -> None:
    data = {"parent_type": "grant_template"}
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=invalid_event)

    assert response.status_code == 500
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_invalid_parent_type() -> None:
    data = {
        "parent_type": "invalid_type",
        "parent_id": str(uuid4()),
    }
    invalid_event = create_pubsub_event(data)

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=invalid_event)

    assert response.status_code == 500
    assert "Invalid pubsub message" in response.json()["detail"]


async def test_handle_rag_request_handler_error(
    async_session_maker: async_sessionmaker[Any],
    pubsub_event_grant_template: PubSubEvent,
    mock_grant_template_handler: AsyncMock,
) -> None:
    mock_grant_template_handler.side_effect = Exception("Handler error")

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=pubsub_event_grant_template)

    assert response.status_code == 500

    assert response.json()["detail"] == "Internal Server Error"


async def test_handle_rag_request_invalid_base64() -> None:
    invalid_event: PubSubEvent = {
        "message": {
            "data": "invalid-base64!@#",
            "messageId": "test-message-id",
            "publishTime": "2025-01-01T00:00:00Z",
            "attributes": {},
        },
        "subscription": "test-subscription",
    }

    async with AsyncTestClient(app=app) as client:
        response = await client.post("/", json=invalid_event)

    assert response.status_code == 500
    assert "Invalid pubsub message" in response.json()["detail"]


def test_handle_pubsub_message_valid() -> None:
    data = {
        "parent_type": "grant_template",
        "parent_id": str(uuid4()),
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert result["parent_type"] == "grant_template"
    assert isinstance(result["parent_id"], UUID)


def test_handle_pubsub_message_invalid() -> None:
    data = {"invalid": "data"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError) as exc_info:
        handle_pubsub_message(event)

    assert "Invalid pubsub message" in str(exc_info.value)
