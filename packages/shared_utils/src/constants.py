from typing import Final

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"
ONE_MINUTE_SECONDS: Final[int] = 60

SUPPORTED_FILE_EXTENSIONS = {
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "latex": "text/latex",
    "md": "text/markdown",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "text/rtf",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
