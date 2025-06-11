from os import getenv
from typing import Final

FILE_RX: Final[str] = r"\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)(?=$|[/?#])"
MAX_DEPTH: Final[int] = int(getenv("MAX_DEPTH", "1"))
SKIP_DOMAINS: Final[set[str]] = {"x.com", "twitter.com", "facebook.com"}
