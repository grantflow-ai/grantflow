from typing import Final

FILE_RX: Final[str] = r"\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)(?=$|[/?#])"
CHUNKS_BATCH_SIZE: Final[int] = 30
