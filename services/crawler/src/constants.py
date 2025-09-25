from typing import Final

from packages.shared_utils.src.env import get_env

FILE_RX: Final[str] = r"\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)(?=$|[/?#])"
MAX_DEPTH: Final[int] = int(get_env("MAX_DEPTH", raise_on_missing=False, fallback="0"))
DOWNLOAD_FILES: Final[bool] = (
    get_env("DOWNLOAD_FILES", raise_on_missing=False, fallback="false").lower()
    == "true"
)
SKIP_DOMAINS: Final[set[str]] = {"x.com", "twitter.com", "facebook.com"}
