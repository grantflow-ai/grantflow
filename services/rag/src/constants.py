from typing import Final

MIN_WORDS_RATIO: Final[float] = 0.8
NUM_CHUNKS: Final[int] = 15
MAX_SOURCE_SIZE: Final[int] = 8000
MAX_CHUNK_SIZE: Final[int] = 800

INITIAL_PASSING_SCORE: Final[int] = 60
MIN_PASSING_SCORE: Final[int] = 40
SCORE_INCREMENT: Final[int] = 10
MAX_RETRIES: Final[int] = 2

MISSING_INFO_PREFIX: Final[str] = "**[MISSING INFORMATION:"
MISSING_INFO_SUFFIX: Final[str] = "]**"
MISSING_INFO_FORMAT: Final[str] = "**[MISSING INFORMATION: {description}]**"
MISSING_INFO_PATTERN: Final[str] = r"\*\*\[MISSING INFORMATION: (.*?)\]\*\*"
MISSING_INFO_INSTRUCTION: Final[str] = (
    "If information is insufficient, indicate with "
    "`**[MISSING INFORMATION: concise but detailed description of the missing information based on the provided context and task requirements]**`"
)
