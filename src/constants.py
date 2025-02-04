from typing import Final

from src.utils.env import get_env

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"

ONE_MINUTE_SECONDS: Final[int] = 60

EMBEDDING_DIMENSIONS: Final[int] = 384

MIN_WORDS_RATIO: Final[float] = 0.8

EVALUATION_MODEL: Final[str] = get_env("EVALUATION_MODEL", fallback="gemini-2.0-flash-exp")
GENERATION_MODEL: Final[str] = get_env("GENERATION_MODEL", fallback="gemini-2.0-flash-exp")
