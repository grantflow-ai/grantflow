from typing import Final

MIN_WORDS_RATIO: Final[float] = 0.8
NUM_CHUNKS: Final[int] = 15
MAX_SOURCE_SIZE: Final[int] = 8000
MAX_CHUNK_SIZE: Final[int] = 800

# Model selection constants
GEMINI_FLASH_MODEL: Final[str] = "gemini-2.5-flash"
GEMINI_FLASH_LITE_MODEL: Final[str] = "gemini-2.5-flash-lite"
MODEL_SELECTION_REASON: Final[str] = "Flash for ≤600w, Flash-Lite for >600w"
CUSTOM_MODEL_REASON: Final[str] = "Custom model specified"
