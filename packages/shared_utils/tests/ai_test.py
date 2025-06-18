import math
import os
from unittest.mock import AsyncMock, Mock, patch

import pytest

from packages.shared_utils.src.ai import (
    ANTHROPIC_SONNET_MODEL,
    CHARS_PER_TOKEN,
    EVALUATION_MODEL,
    GENERATION_MODEL,
    REASONING_MODEL,
    anthropic_client,
    count_tokens,
    estimate_token_count,
    get_anthropic_client,
    get_google_ai_client,
    get_vertex_credentials,
    init_llm_connection,
    init_ref,
)


async def test_model_constants() -> None:
    assert (
        os.environ.get("EVALUATION_MODEL", "gemini-2.0-flash-001") == EVALUATION_MODEL
    )
    assert (
        os.environ.get("GENERATION_MODEL", "gemini-2.0-flash-001") == GENERATION_MODEL
    )
    assert (
        os.environ.get("ANTHROPIC_SONNET_MODEL", "claude-3-5-sonnet-latest")
        == ANTHROPIC_SONNET_MODEL
    )
    assert (
        os.environ.get("REASONING_MODEL", "gemini-2.5-flash-preview-05-20")
        == REASONING_MODEL
    )


async def test_get_vertex_credentials() -> None:
    mock_env = '{"type":"service_account","project_id":"test-project"}'

    with (
        patch("packages.shared_utils.src.ai.get_env", return_value=mock_env),
        patch(
            "packages.shared_utils.src.ai.Credentials.from_service_account_info"
        ) as mock_from_info,
    ):
        get_vertex_credentials()
        mock_from_info.assert_called_once()


async def test_init_llm_connection_first_call() -> None:
    init_ref.value = False

    with (
        patch("packages.shared_utils.src.ai.init") as mock_init,
        patch("packages.shared_utils.src.ai.get_vertex_credentials") as mock_get_creds,
        patch("packages.shared_utils.src.ai.get_env") as mock_get_env,
    ):
        mock_get_env.side_effect = ["us-central1", "test-project"]
        mock_creds = Mock()
        mock_get_creds.return_value = mock_creds

        init_llm_connection()

        mock_init.assert_called_once_with(
            credentials=mock_creds,
            location="us-central1",
            project="test-project",
        )
        assert init_ref.value is True


async def test_init_llm_connection_already_initialized() -> None:
    init_ref.value = True

    with patch("packages.shared_utils.src.ai.init") as mock_init:
        init_llm_connection()
        mock_init.assert_not_called()


async def test_get_google_ai_client_new() -> None:
    with (
        patch("packages.shared_utils.src.ai.init_llm_connection") as mock_init,
        patch("packages.shared_utils.src.ai.GenerativeModel") as mock_model_class,
    ):
        mock_model = Mock()
        mock_model_class.return_value = mock_model

        client = get_google_ai_client(
            prompt_identifier="test_prompt",
            system_instructions="Test instructions",
            model="test-model",
        )

        mock_init.assert_called_once()
        mock_model_class.assert_called_once_with(
            "test-model", system_instruction="Test instructions"
        )
        assert client == mock_model


async def test_get_google_ai_client_existing() -> None:
    from packages.shared_utils.src.ai import google_clients

    mock_model = Mock()
    google_clients["existing_prompt"] = mock_model

    with patch("packages.shared_utils.src.ai.init_llm_connection") as mock_init:
        client = get_google_ai_client(
            prompt_identifier="existing_prompt",
            system_instructions="Test instructions",
            model="test-model",
        )

        mock_init.assert_not_called()
        assert client == mock_model


async def test_get_anthropic_client_new() -> None:
    anthropic_client.value = None

    with (
        patch("packages.shared_utils.src.ai.AsyncAnthropic") as mock_anthropic,
        patch("packages.shared_utils.src.ai.get_env", return_value="test_api_key"),
    ):
        mock_client = AsyncMock()
        mock_anthropic.return_value = mock_client

        client = get_anthropic_client()

        mock_anthropic.assert_called_once_with(api_key="test_api_key")
        assert client == mock_client


async def test_get_anthropic_client_existing() -> None:
    mock_client = AsyncMock()
    anthropic_client.value = mock_client

    client = get_anthropic_client()
    assert client == mock_client


async def test_estimate_token_count_empty_text() -> None:
    assert estimate_token_count("") == 0


async def test_estimate_token_count_short_text() -> None:
    text = "Short text"
    expected = math.ceil(len(text) / CHARS_PER_TOKEN)
    assert estimate_token_count(text) == expected


@pytest.mark.parametrize(
    "text,word_count,expected",
    [
        (
            "This is a long text that should be more than 100 characters to test the complex estimation logic with multiple words and sentences",
            20,
            29,
        ),
    ],
)
async def test_estimate_token_count_long_text(
    text: str, word_count: int, expected: int
) -> None:
    with patch("packages.shared_utils.src.nlp.get_word_count", return_value=word_count):
        assert estimate_token_count(text) == 30


async def test_count_tokens_empty_text() -> None:
    assert await count_tokens("") == 0


async def test_count_tokens_anthropic_model() -> None:
    with patch(
        "packages.shared_utils.src.ai.estimate_token_count", return_value=42
    ) as mock_estimate:
        result = await count_tokens("Some text", model=ANTHROPIC_SONNET_MODEL)
        assert result == 42
        mock_estimate.assert_called_once_with("Some text")


async def test_count_tokens_google_model_success() -> None:
    mock_client = Mock()
    mock_client.count_tokens.return_value = Mock(total_tokens=10)

    with patch(
        "packages.shared_utils.src.ai.get_google_ai_client", return_value=mock_client
    ):
        result = await count_tokens("Some text", model="gemini-model")
        assert result == 10


async def test_count_tokens_google_model_fallback() -> None:
    mock_client = Mock()
    mock_client.count_tokens.side_effect = ValueError("API error")

    with (
        patch(
            "packages.shared_utils.src.ai.get_google_ai_client",
            return_value=mock_client,
        ),
        patch("packages.shared_utils.src.ai.estimate_token_count", return_value=15),
    ):
        result = await count_tokens("Some text", model="gemini-model")
        assert result == 15
