from os import getenv
from typing import Final

FILE_RX: Final[str] = r"\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)(?=$|[/?#])"
MAX_DEPTH: Final[int] = int(getenv("MAX_DEPTH", "1"))
CHUNKS_BATCH_SIZE: Final[int] = 30

SKIP_DOMAINS: Final[set[str]] = {
    "extramural-intranet.nih.gov",
    "x.com",
    "twitter.com",
    "www.ninds.nih.gov",
    "www.niams.nih.gov",
    "www.niaid.nih.gov",
    "www.nia.nih.gov",
    "www.hhs.gov",
}

SKIP_URL_PATTERNS: Final[set[str]] = {
    "vulnerability-disclosure-policy",
    "/login",
    "/signin",
    "/auth",
}
