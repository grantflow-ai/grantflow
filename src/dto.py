from dataclasses import dataclass
from mimetypes import guess_type
from typing import NotRequired, TypedDict

from pathvalidate import sanitize_filename
from sanic.request import File

from src.constants import SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: NotRequired[str]
    """The error details."""


class TableContext(TypedDict):
    """Context information for table cells."""

    row_index: int | None
    """Zero-based row index in the table"""
    column_index: int | None
    """Zero-based column index in the table"""
    table_dimensions: str | None
    """Table dimensions in format 'rowsxcolumns'"""


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The actual text content of the chunk."""
    content_hash: str
    """Hash string of the content, meant for deduplication of query results."""
    index: int
    """Sequential index in document order."""
    page_number: NotRequired[int]
    """Page number where the chunk appears"""
    element_type: NotRequired[str]
    """Type of document element (page, table_cell, paragraph, figure, formula)."""
    parent: NotRequired[str]
    """The parent element name or other identifier (e.g., table_1, para_2, formula_3)."""
    table_context: NotRequired[TableContext]
    """Additional context for table cells."""
    role: NotRequired[str]
    """Role or type of the content (e.g., paragraph role, cell kind, formula kind)."""
    languages: NotRequired[list[str]]
    """Detected language for the chunk."""
    confidence: NotRequired[float]
    """Confidence score for the extracted chunk."""


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
