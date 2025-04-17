from collections.abc import Mapping
from itertools import chain
from typing import Final

from azure.ai.documentintelligence.models import (
    AnalyzeResult,
    DocumentPage,
)
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.db.json_objects import Chunk
from src.utils.logger import get_logger

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def get_splitter(mime_type: str) -> MarkdownSplitter | TextSplitter:
    if mime_type == "text/markdown":
        return MarkdownSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)
    return TextSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)


def extract_page_content(page: DocumentPage) -> str:
    if lines := page.get("lines"):
        return "\n".join(line["content"] for line in lines)

    words_with_breaks: list[str] = []
    previous_offset: int | None = None

    for word in page.get("words") or []:
        span = word.get("span") or {}
        current_offset = span.get("offset", 0)

        if previous_offset is not None and current_offset > previous_offset + 10:
            words_with_breaks.append("\n")

        words_with_breaks.append(word["content"])
        previous_offset = current_offset + (span.get("length") or 0)

    return " ".join(words_with_breaks).replace(" \n ", "\n")


def process_page_chunks(
    page: DocumentPage,
    splitter: MarkdownSplitter | TextSplitter,
) -> list[Chunk]:
    contents = extract_page_content(page)

    chunks = []
    for text_chunk in splitter.chunks(contents):
        chunk: Chunk = {"content": text_chunk}
        if page_number := page.get("pageNumber"):
            chunk["page_number"] = page_number

        chunks.append(chunk)

    return chunks


def chunk_text(*, text: str | AnalyzeResult, mime_type: str) -> list[Chunk]:
    splitter = get_splitter(mime_type)

    if isinstance(text, (Mapping | dict)):
        return chunk_ocr_output(text, splitter)

    return [Chunk(content=chunk) for index, chunk in enumerate(splitter.chunks(text))]


def chunk_ocr_output(
    extracted_data: AnalyzeResult,
    splitter: MarkdownSplitter | TextSplitter,
) -> list[Chunk]:
    chunks: list[Chunk] = list(
        chain(*[process_page_chunks(page, splitter) for page in extracted_data.get("pages", [])])
    )

    if not chunks and "content" in extracted_data:
        chunks = [Chunk(content=text_chunk) for text_chunk in splitter.chunks(extracted_data["content"])]

    return chunks
