from typing import cast
from unittest.mock import AsyncMock, Mock

import pytest
from anthropic.types import ToolUseBlock
from google.cloud.exceptions import TooManyRequests
from packages.shared_utils.src.exceptions import ValidationError
from pytest_mock import MockerFixture
from services.backend.src.constants import ANTHROPIC_SONNET_MODEL
from services.backend.src.rag.completion import (
    BestResponseSelection,
    handle_completions_request,
    make_anthropic_completions_request,
    make_google_completions_request,
    select_best_response,
    validate_select_best_response,
)
from vertexai.generative_models import Part


@pytest.fixture
def mock_google_api_response(mocker: MockerFixture) -> Mock:
    client = AsyncMock()
    response = Mock()
    client.generate_content_async.return_value = response
    mocker.patch("src.rag.completion.get_google_ai_client", return_value=client)
    return response


@pytest.fixture
def mock_anthropic_api_response(mocker: MockerFixture) -> Mock:
    client = AsyncMock()
    response = Mock()
    client.messages.create.return_value = response
    mocker.patch("src.rag.completion.get_anthropic_client", return_value=client)
    return response


async def test_validate_select_best_response_valid() -> None:
    candidates = {1: "response1", 2: "response2"}
    selection = cast("BestResponseSelection", {"best_response": 1})
    validate_select_best_response(selection, candidates=candidates)


async def test_validate_select_best_response_invalid() -> None:
    candidates = {1: "response1", 2: "response2"}
    selection = cast("BestResponseSelection", {"best_response": 3})
    with pytest.raises(ValidationError, match="The selected response id is not in a key in the candidates object"):
        validate_select_best_response(selection, candidates=candidates)


async def test_select_best_response(mock_google_api_response: Mock) -> None:
    candidates = {1: "response1", 2: "response2"}
    mock_google_api_response.text = '{"best_response": 1}'

    result = await select_best_response(candidates=candidates, prompt="test prompt")
    assert result == "response1"


async def test_make_completions_request_with_string_message(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    result = await make_google_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        candidate_count=None,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_make_completions_request_with_part_message(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    result = await make_google_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages=[Part.from_text("test message")],
        candidate_count=None,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_make_completions_request_with_multiple_candidates(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"best_response": 1}'
    candidate1 = Mock()
    candidate1.text = '{"key": "value1"}'
    candidate2 = Mock()
    candidate2.text = '{"key": "value2"}'
    mock_google_api_response.candidates = [candidate1, candidate2]
    result = await make_google_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        candidate_count=2,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value1"}


async def test_make_completions_request_with_schema_validation(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    schema = {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}
    result = await make_google_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        response_schema=schema,
        candidate_count=None,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_make_anthropic_completions_request(mock_anthropic_api_response: Mock) -> None:
    tool_use = Mock(spec=ToolUseBlock)
    tool_use.type = "tool_use"
    tool_use.name = "set_output"
    tool_use.input = {"key": "value"}
    mock_anthropic_api_response.content = [tool_use]
    mock_anthropic_api_response.model = ANTHROPIC_SONNET_MODEL
    schema = {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}
    result = await make_anthropic_completions_request(
        model=ANTHROPIC_SONNET_MODEL,
        response_schema=schema,
        response_type=dict[str, str],
        user_prompt="test message",
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_make_anthropic_completions_request_with_generation_params(mock_anthropic_api_response: Mock) -> None:
    tool_use = Mock(spec=ToolUseBlock)
    tool_use.type = "tool_use"
    tool_use.name = "set_output"
    tool_use.input = {"key": "value"}
    mock_anthropic_api_response.content = [tool_use]
    mock_anthropic_api_response.model = ANTHROPIC_SONNET_MODEL
    schema = {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}
    result = await make_anthropic_completions_request(
        model=ANTHROPIC_SONNET_MODEL,
        response_schema=schema,
        response_type=dict[str, str],
        user_prompt="test message",
        temperature=0.5,
        top_k=10,
        top_p=0.9,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_handle_completions_request_success(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    result = await handle_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_handle_completions_request_with_retry(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    mock_google_api_response.generate_content_async.side_effect = [
        TooManyRequests("error"),  # type: ignore[no-untyped-call]
        TooManyRequests("error"),  # type: ignore[no-untyped-call]
        mock_google_api_response,
    ]

    result = await handle_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        max_attempts=3,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_handle_completions_request_with_custom_validator(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'

    def custom_validator(data: dict[str, str]) -> None:
        if data["key"] != "value":
            raise ValidationError("Invalid value")

    result = await handle_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        validator=custom_validator,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_handle_completions_request_with_schema(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = '{"key": "value"}'
    schema = {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}

    result = await handle_completions_request(
        prompt_identifier="test",
        response_type=dict[str, str],
        messages="test message",
        response_schema=schema,
        system_prompt="You are a helpful assistant.",
    )
    assert result == {"key": "value"}


async def test_handle_completions_request_deserialization_error(mock_google_api_response: Mock) -> None:
    mock_google_api_response.text = "invalid json"
    response_schema = {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}

    from packages.shared_utils.src.exceptions import RagError

    with pytest.raises(RagError, match="Failed to generate text after 3 attempts"):
        await handle_completions_request(
            prompt_identifier="test",
            response_type=dict[str, str],
            messages="test message",
            system_prompt="You are a helpful assistant.",
            response_schema=response_schema,
        )
