from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest
from google.cloud.exceptions import TooManyRequests
from pytest_mock import MockerFixture

from src.exceptions import ValidationError
from src.rag.utils import handle_completions_request, make_completions_request


@pytest.fixture
def mock_response() -> Mock:
    response = Mock()
    response.text = '{"key": "value"}'
    return response


@pytest.fixture
def mock_client(mock_response: Mock) -> AsyncMock:
    client = AsyncMock()
    client.generate_content_async.return_value = mock_response
    return client


@pytest.fixture
def mock_get_google_ai_client(mock_client: AsyncMock, mocker: MockerFixture) -> AsyncMock:
    return mocker.patch("src.rag.utils.get_google_ai_client", return_value=mock_client)


async def test_make_completions_request_with_string_message(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    result = await make_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages="test message"
    )

    assert result == {"key": "value"}
    mock_client.generate_content_async.assert_called_once()


async def test_make_completions_request_with_list_messages(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    result = await make_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages=["message1", "message2"]
    )

    assert result == {"key": "value"}
    mock_client.generate_content_async.assert_called_once()


async def test_make_completions_request_with_retry(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    mock_client.generate_content_async.side_effect = [
        TooManyRequests("error"),  # type: ignore[no-untyped-call]
        TooManyRequests("error"),  # type: ignore[no-untyped-call]
        Mock(text='{"key": "value"}'),
    ]

    result = await make_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages="test message"
    )

    assert result == {"key": "value"}
    assert mock_client.generate_content_async.call_count == 3


async def test_handle_completions_request_successful(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    result = await handle_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages="test message"
    )

    assert result == {"key": "value"}
    mock_client.generate_content_async.assert_called_once()


async def test_handle_completions_request_with_custom_validator(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    def validator(response: dict[str, Any]) -> None:
        if response["key"] != "value":
            raise ValidationError("Invalid value")

    result = await handle_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages="test message", validator=validator
    )

    assert result == {"key": "value"}
    mock_client.generate_content_async.assert_called_once()


async def test_handle_completions_request_validation_retry(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    def validator(_: Any) -> None:
        raise ValidationError("Invalid")

    with pytest.raises(ValidationError):
        await handle_completions_request(
            prompt_identifier="test", response_type=dict[str, str], messages="test message", validator=validator
        )

    assert mock_client.generate_content_async.call_count == 3


async def test_handle_completions_request_deserialization_retry(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    mock_client.generate_content_async.return_value = Mock(text="invalid json")

    with pytest.raises(ValidationError):
        await handle_completions_request(
            prompt_identifier="test", response_type=dict[str, str], messages="test message"
        )

    assert mock_client.generate_content_async.call_count == 3


async def test_handle_completions_request_with_response_schema(
    mock_get_google_ai_client: AsyncMock,
    mock_client: AsyncMock,
) -> None:
    schema = {"type": "object", "properties": {"key": {"type": "string"}}}

    result = await handle_completions_request(
        prompt_identifier="test", response_type=dict[str, str], messages="test message", response_schema=schema
    )

    assert result == {"key": "value"}
    mock_client.generate_content_async.assert_called_once()
