from typing import Final

from packages.shared_utils.src.env import get_env

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"

ONE_MINUTE_SECONDS: Final[int] = 60
MIN_WORDS_RATIO: Final[float] = 0.8

EVALUATION_MODEL: Final[str] = get_env("EVALUATION_MODEL", fallback="gemini-2.0-flash-001")
GENERATION_MODEL: Final[str] = get_env("GENERATION_MODEL", fallback="gemini-2.0-flash-001")
ANTHROPIC_SONNET_MODEL: Final[str] = get_env("ANTHROPIC_SONNET_MODEL", fallback="claude-3-5-sonnet-latest")
REASONING_MODEL: Final[str] = get_env("REASONING_MODEL", fallback="gemini-2.5-pro-exp-03-25")
