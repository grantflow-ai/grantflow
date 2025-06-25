import math
from functools import lru_cache
from typing import Any, Final

from anthropic import AsyncAnthropic
from google import genai
from google.oauth2.service_account import Credentials

from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize

EVALUATION_MODEL: Final[str] = get_env(
    "EVALUATION_MODEL", fallback="gemini-2.0-flash-001"
)
GENERATION_MODEL: Final[str] = get_env(
    "GENERATION_MODEL", fallback="gemini-2.0-flash-001"
)
ANTHROPIC_SONNET_MODEL: Final[str] = get_env(
    "ANTHROPIC_SONNET_MODEL", fallback="claude-3-5-sonnet-latest"
)
REASONING_MODEL: Final[str] = get_env(
    "REASONING_MODEL", fallback="gemini-2.5-flash-preview-05-20"
)

init_ref = Ref[bool]()
anthropic_client = Ref[AsyncAnthropic]()
google_client = Ref[genai.AsyncClient | None](None)


def get_vertex_credentials() -> Credentials:
    credentials = deserialize(
        get_env("LLM_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any]
    )
    return Credentials.from_service_account_info(credentials)  # type: ignore[no-any-return]


def init_llm_connection() -> None:
    if not init_ref.value:
        google_client.value = genai.AsyncClient(
            vertexai=genai.ClientVertexAiConfig(
                project=get_env("GOOGLE_CLOUD_PROJECT"),
                location=get_env("GOOGLE_CLOUD_REGION"),
                credentials=get_vertex_credentials(),
            )
        )
        init_ref.value = True


def get_google_ai_client() -> genai.AsyncClient:
    if not google_client.value:
        init_llm_connection()
    return google_client.value  # type: ignore[return-value]


def get_anthropic_client() -> AsyncAnthropic:
    if not anthropic_client.value:
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
        response = await client.models.count_tokens(
            model=model,
            contents=text,
        )
        return int(response.total_tokens)
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