from typing import Final

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"
ONE_MINUTE_SECONDS: Final[int] = 60

# Model constants
EMBEDDINGS_MODEL: Final[str] = "text-embedding-005"
EMBEDDING_DIMENSIONS: Final[int] = 256
FAST_TEXT_GENERATION_MODEL: Final[str] = "gemini-1.5-flash-002"
PREMIUM_TEXT_GENERATION_MODEL: Final[str] = "gemini-1.5-pro-002"

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
