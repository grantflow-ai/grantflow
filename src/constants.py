from typing import Final

from src.utils.env import get_env

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"
ONE_MINUTE_SECONDS: Final[int] = 60

# Model constants
EMBEDDING_DIMENSIONS: Final[int] = 384

EVALUATION_MODEL: Final[str] = get_env("EVALUATION_MODEL", fallback="gemini-1.5-flash-002")
GENERATION_MODEL: Final[str] = get_env("GENERATION_MODEL", fallback="gemini-2.0-flash-exp")

MIN_WORDS_RATIO: Final[float] = 0.8
