from dataclasses import dataclass
from mimetypes import guess_type
from typing import NotRequired, TypedDict

from pathvalidate import sanitize_filename
from sanic.request import File

from src.constants import SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP
from src.db.json_objects import Chunk, GrantSection


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: NotRequired[str]
    """The error details."""


@dataclass
class FileDTO:
    """DTO for a file."""

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


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata."""

    embedding: list[float]
    """The embeddings of the content."""
    file_id: str
    """The ID of the file from which the content is derived."""
    chunk: Chunk
    """The chunk of text from which the embeddings are generated."""


class GrantTemplateDTO(TypedDict):
    """The response from the tool call."""

    name: str
    """The name of the grant format."""
    template: str
    """The markdown template for the grant."""
    sections: list[GrantSection]
    """The sections of the grant."""
    organization_id: str | None
    """The organization ID."""
