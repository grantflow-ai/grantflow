from typing import Final

from src.utils.env import get_env

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"
ONE_MINUTE_SECONDS: Final[int] = 60

# Model constants
EMBEDDING_DIMENSIONS: Final[int] = 256
EMBEDDINGS_MODEL: Final[str] = get_env("EMBEDDINGS_MODEL", fallback="text-embedding-005")
FAST_TEXT_GENERATION_MODEL: Final[str] = get_env("FAST_TEXT_GENERATION_MODEL", fallback="gemini-2.0-flash-exp")
PREMIUM_TEXT_GENERATION_MODEL: Final[str] = get_env("PREMIUM_TEXT_GENERATION_MODEL", fallback="gemini-2.0-flash-exp")

# File constants
SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP = {
    "bmp": "image/bmp",
    "csv": "text/csv",
    "doc": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "gif": "image/gif",
    "heic": "image/heif",
    "heif": "image/heif",
    "jfif": "image/jpeg",
    "jif": "image/jpeg",
    "jpe": "image/jpeg",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "latex": "application/latex",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "png": "image/png",
    "ppt": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "application/rtf",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "tsv": "text/tab-separated-values",
    "xls": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
