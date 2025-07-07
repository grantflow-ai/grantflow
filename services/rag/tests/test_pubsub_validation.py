import base64
import json
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import PubSubEvent, PubSubMessage

from services.rag.src.main import handle_pubsub_message, handle_request

handle_request_fn = handle_request.fn


def create_pubsub_event(data: dict[str, str]) -> PubSubEvent:
    encoded_data = base64.b64encode(json.dumps(data).encode()).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )


def test_handle_pubsub_message_valid_grant_template() -> None:
    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "grant_template"}
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert str(result["parent_id"]) == data["parent_id"]
    assert result["parent_type"] == data["parent_type"]


def test_handle_pubsub_message_valid_grant_application() -> None:
    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "grant_application"}
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert str(result["parent_id"]) == data["parent_id"]
    assert result["parent_type"] == data["parent_type"]


def test_handle_pubsub_message_invalid_parent_type() -> None:
    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "invalid_type"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_missing_data() -> None:
    event = PubSubEvent(
        message=PubSubMessage(
            data=None,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="PubSub message missing data field"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_invalid_json() -> None:
    event = PubSubEvent(
        message=PubSubMessage(
            data=base64.b64encode(b"invalid json").decode(),
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_missing_parent_type() -> None:
    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


@pytest.mark.asyncio
async def test_handle_request_invalid_message_raises_validation_error() -> None:
    mock_session_maker = AsyncMock()

    event = PubSubEvent(
        message=PubSubMessage(
            data=None,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="PubSub message missing data field"):
        await handle_request_fn(data=event, session_maker=mock_session_maker)

    mock_session_maker.assert_not_called()


@pytest.mark.asyncio
async def test_handle_request_grant_template_success() -> None:
    mock_session_maker = AsyncMock()

    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "grant_template"}
    event = create_pubsub_event(data)

    with patch(
        "services.rag.src.main.grant_template_generation_pipeline_handler",
        new_callable=AsyncMock,
    ) as mock_handler:
        await handle_request_fn(data=event, session_maker=mock_session_maker)

        mock_handler.assert_called_once_with(
            grant_template_id=UUID(data["parent_id"]),
            session_maker=mock_session_maker,
        )


@pytest.mark.asyncio
async def test_handle_request_grant_application_success() -> None:
    mock_session_maker = AsyncMock()

    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "grant_application"}
    event = create_pubsub_event(data)

    with patch(
        "services.rag.src.main.grant_application_text_generation_pipeline_handler",
        new_callable=AsyncMock,
    ) as mock_handler:
        await handle_request_fn(data=event, session_maker=mock_session_maker)

        mock_handler.assert_called_once_with(
            grant_application_id=UUID(data["parent_id"]),
            session_maker=mock_session_maker,
        )


@pytest.mark.asyncio
async def test_handle_request_pipeline_error_propagates() -> None:
    mock_session_maker = AsyncMock()

    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000", "parent_type": "grant_template"}
    event = create_pubsub_event(data)

    error = Exception("Pipeline failed")

    with (
        patch(
            "services.rag.src.main.grant_template_generation_pipeline_handler",
            side_effect=error,
        ),
        pytest.raises(Exception, match="Pipeline failed"),
    ):
        await handle_request_fn(data=event, session_maker=mock_session_maker)
