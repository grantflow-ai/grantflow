import logging
from datetime import UTC, datetime
from typing import TypedDict

from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.utils.completion import handle_completions_request


class SimpleTestResponse(TypedDict):
    greeting: str


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
async def test_genai_basic_completion(logger: logging.Logger) -> None:
    """Smoke test to verify GenAI SDK integration works correctly."""
    logger.info("Testing basic GenAI completion functionality")

    start_time = datetime.now(UTC)

    response_schema = {"type": "object", "properties": {"greeting": {"type": "string"}}, "required": ["greeting"]}

    result = await handle_completions_request(
        prompt_identifier="genai_smoke_test",
        response_type=SimpleTestResponse,
        response_schema=response_schema,
        messages="Say hello in a friendly way.",
        system_prompt="You are a helpful assistant that responds in JSON format.",
        temperature=0.1,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    assert isinstance(result, dict)
    assert "greeting" in result
    assert isinstance(result["greeting"], str)
    assert len(result["greeting"]) > 0

    assert elapsed_time < 30

    logger.info("GenAI smoke test completed successfully in %.2fs", elapsed_time)
    logger.info("Response: %s", result)


class AnthropicTestResponse(TypedDict):
    message: str


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
async def test_genai_anthropic_fallback(logger: logging.Logger) -> None:
    """Test that Anthropic fallback still works correctly."""
    logger.info("Testing Anthropic fallback functionality")

    start_time = datetime.now(UTC)

    response_schema = {"type": "object", "properties": {"message": {"type": "string"}}, "required": ["message"]}

    result = await handle_completions_request(
        prompt_identifier="anthropic_smoke_test",
        response_type=AnthropicTestResponse,
        response_schema=response_schema,
        messages="Respond with a brief test message.",
        system_prompt="You are a test assistant.",
        model="claude-3-5-sonnet-latest",
        temperature=0.1,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    assert isinstance(result, dict)
    assert "message" in result
    assert isinstance(result["message"], str)
    assert len(result["message"]) > 0

    assert elapsed_time < 30

    logger.info("Anthropic smoke test completed successfully in %.2fs", elapsed_time)
    logger.info("Response: %s", result)
