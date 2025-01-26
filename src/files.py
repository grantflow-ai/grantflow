from dataclasses import dataclass
from mimetypes import guess_type

from pathvalidate import sanitize_filename
from sanic.request import File

from src.exceptions import ValidationError

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


@dataclass
class FileDTO:
    """DTO for a file."""

    content: bytes
    """The content of the file."""
    filename: str
    """The name of the file."""
    mime_type: str

    @property
    def size(self) -> int:
        """The size of the file."""
        return len(self.content)

    @classmethod
    def from_file(cls, file: File | list[File], filename: str) -> "FileDTO":
        """Create a FileDTO from a Sanic File object.

        Args:
            file: The Sanic File object.
            filename: The name of the file.

        Raises:
            ValidationError: If the mime type of the file could not be determined.

        Returns:
            The FileDTO object.
        """
        file = file[0] if isinstance(file, list) else file
        ext = filename.split(".")[-1]

        if mime_type := (guess_type(filename)[0] or SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP.get(ext)):
            filename = sanitize_filename(filename)
            return cls(content=file.body, filename=filename, mime_type=mime_type)

        raise ValidationError("Could not determine the mime type of the file")
