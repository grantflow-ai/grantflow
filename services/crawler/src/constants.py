from os import getenv
from typing import Final

FILE_RX: Final[str] = r"\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)(?=$|[/?#])"
MAX_DEPTH: Final[int] = int(getenv("MAX_DEPTH", "1"))
CHUNKS_BATCH_SIZE: Final[int] = 30
