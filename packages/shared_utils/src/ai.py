from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from types import SimpleNamespace
from typing import Any, Callable, Final

from anthropic import AsyncAnthropic
from google import genai
from google.oauth2.service_account import Credentials

from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize


class OfflineAnthropicResponse:
    def __init__(self, text: str) -> None:
        self.content = [SimpleNamespace(text=text)]


class OfflineAnthropicMessages:
    def __init__(self, score_calculator: Callable[[str], float]) -> None:
        self._score_calculator = score_calculator

    @staticmethod
    def _extract_prompt(messages: list[dict[str, Any]]) -> str:
        for message in reversed(messages):
            content = message.get("content")
            if isinstance(content, str):
                return content
        return ""

    async def create(
        self, *, messages: list[dict[str, Any]], **_: Any
    ) -> OfflineAnthropicResponse:
        prompt = self._extract_prompt(messages)
        response_text = _build_offline_response(prompt, self._score_calculator)
        return OfflineAnthropicResponse(response_text)


class OfflineAnthropicClient:
    def __init__(self) -> None:
        self.messages = OfflineAnthropicMessages(_calculate_offline_quality_score)


def _calculate_offline_quality_score(prompt: str) -> float:
    if not prompt:
        return 7.0

    chunk_lengths: list[int] = []
    for marker in ("Chunk 1:", "Chunk 2:", "Chunk 3:"):
        if marker in prompt:
            start = prompt.index(marker) + len(marker)
            end = prompt.find("Chunk", start)
            if end == -1:
                end = len(prompt)
            chunk = prompt[start:end]
            chunk_lengths.append(len(chunk.strip()))

    if not chunk_lengths:
        chunk_lengths.append(len(prompt.strip()))

    average_length = sum(chunk_lengths) / len(chunk_lengths)
    normalized = min(max(average_length / 500.0, 0.0), 1.0)
    return round(6.0 + normalized * 2.0, 1)


def _build_offline_response(
    prompt: str, score_calculator: Callable[[str], float]
) -> str:
    if not prompt:
        return f"{score_calculator(prompt):.1f}"

    normalized_prompt = prompt.lower()

    if (
        "respond with just a number" in normalized_prompt
        or "respond with a number" in normalized_prompt
    ):
        return f"{score_calculator(prompt):.1f}"

    if (
        "respond with only a json object" in normalized_prompt
        and "chunk" in normalized_prompt
    ):
        base_score = score_calculator(prompt)
        primary = max(6, min(9, int(round(base_score))))
        secondary = max(5, primary - 1)
        tertiary = max(4, primary - 2)
        payload = {
            "chunk1": {
                "coherence": primary,
                "relevance": primary,
                "specificity": secondary,
            },
            "chunk2": {
                "coherence": primary,
                "relevance": secondary,
                "specificity": secondary,
            },
            "chunk3": {
                "coherence": tertiary,
                "relevance": tertiary,
                "specificity": max(3, tertiary - 1),
            },
        }
        return json.dumps(payload)

    if "hallucination" in normalized_prompt or "fabricated" in normalized_prompt:
        payload = {
            "statement1": {"accurate": True, "fabricated": False, "confidence": 9},
            "statement2": {"accurate": False, "fabricated": True, "confidence": 5},
        }
        return json.dumps(payload)

    if "citation" in normalized_prompt and "respond with json" in normalized_prompt:
        payload = {
            "properly_formatted": True,
            "appear_realistic": True,
            "errors_found": "No obvious citation errors detected",
        }
        return json.dumps(payload)

    score = score_calculator(prompt)
    return json.dumps({"score": round(score, 1)})


def _use_offline_anthropic() -> bool:
    flag = os.getenv("USE_OFFLINE_ANTHROPIC", "").lower()
    if flag in {"1", "true", "yes"}:
        return True
    return os.getenv("E2E_TESTS") == "1"


EVALUATION_MODEL: Final[str] = get_env("EVALUATION_MODEL", fallback="gemini-2.5-flash")
GENERATION_MODEL: Final[str] = get_env("GENERATION_MODEL", fallback="gemini-2.5-flash")
ANTHROPIC_SONNET_MODEL: Final[str] = get_env(
    "ANTHROPIC_SONNET_MODEL", fallback="claude-sonnet-4-20250514"
)
REASONING_MODEL: Final[str] = get_env("REASONING_MODEL", fallback="gemini-2.5-flash")

init_ref = Ref[bool]()
anthropic_client = Ref[AsyncAnthropic | OfflineAnthropicClient]()
google_client = Ref[genai.Client | None](None)


def get_vertex_credentials() -> Credentials:
    credentials = deserialize(
        get_env("LLM_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any]
    )

    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    return Credentials.from_service_account_info(credentials, scopes=scopes)  # type: ignore[no-any-return, no-untyped-call]


def init_llm_connection() -> None:
    if not init_ref.value:
        google_client.value = genai.Client(
            api_key=get_env("GOOGLE_AI_API_KEY"),
        )
        init_ref.value = True


def get_google_ai_client() -> genai.Client:
    if not google_client.value:
        init_llm_connection()
    return google_client.value  # type: ignore[return-value]


def get_anthropic_client() -> AsyncAnthropic | OfflineAnthropicClient:
    if not anthropic_client.value:
        if _use_offline_anthropic():
            anthropic_client.value = OfflineAnthropicClient()
        else:
            anthropic_client.value = AsyncAnthropic(
                api_key=get_env("ANTHROPIC_API_KEY"),
            )
    return anthropic_client.value


async def count_tokens(text: str, model: str = ANTHROPIC_SONNET_MODEL) -> int:
    if not text:
        return 0

    if ANTHROPIC_SONNET_MODEL in model:
        return estimate_token_count(text)

    try:
        client = get_google_ai_client()
        response = await client._aio.models.count_tokens(  # noqa: SLF001
            model=model,
            contents=text,
        )
        return int(response.total_tokens or 0)
    except (ValueError, KeyError, AttributeError):
        return estimate_token_count(text)


CHARS_PER_TOKEN: Final[float] = 4.0


@lru_cache(maxsize=1000)
def estimate_token_count(text: str) -> int:
    try:
        from packages.shared_utils.src.nlp import get_word_count

        if not text:
            return 0

        if len(text) < 100:
            return math.ceil(len(text) / CHARS_PER_TOKEN)

        word_count = get_word_count(text)
        char_count = len(text)

        char_tokens = char_count / CHARS_PER_TOKEN
        word_tokens = word_count * 1.3

        return math.ceil((char_tokens + word_tokens) / 2)

    except ImportError as e:
        raise BackendError(
            "The NLP extra must be installed to use this function."
        ) from e
