from dataclasses import dataclass
from mimetypes import guess_type
from typing import NotRequired

from pathvalidate import sanitize_filename
from sanic.request import File
from typing_extensions import TypedDict

from src.constants import SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: NotRequired[str]
    """The error details."""


@dataclass
class FileDTO:
    """DTO for a file."""

    """The ID of the file."""
    content: bytes
    """The content of the file."""
    filename: str
    """The name of the file."""
    mime_type: str

    @classmethod
    def from_file(cls, file: File | list[File], filename: str) -> "FileDTO":
        """Create a FileDTO from a Sanic File object.

        Args:
            file: The Sanic File object.
            filename: The name of the file.

        Raises:
            ValueError: If the mime type of the file cannot be determined.

        Returns:
            The FileDTO object.
        """
        file = file[0] if isinstance(file, list) else file
        ext = filename.split(".")[-1]

        if mime_type := (guess_type(filename)[0] or SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP.get(ext)):
            filename = sanitize_filename(filename)
            return cls(content=file.body, filename=filename, mime_type=mime_type)

        raise ValueError("Could not determine the mime type of the file")


@dataclass
class VectorDTO:
    """DTO for embeddings and metadata."""

    chunk_index: int
    """The index of the chunk."""
    content: str
    """The text content of the document."""
    element_type: str | None
    """The type of element the content belongs to."""
    embedding: list[float]
    """The embeddings of the content."""
    page_number: int | None
    """The page number of the document."""
