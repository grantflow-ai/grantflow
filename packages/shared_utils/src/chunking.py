from typing import TYPE_CHECKING, Final, cast

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def get_splitter(mime_type: str) -> MarkdownSplitter | TextSplitter:
    if mime_type == "text/markdown":
        return MarkdownSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)
    return TextSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)


def chunk_text(*, text: str, mime_type: str) -> list["Chunk"]:
    splitter = get_splitter(mime_type)

    return [
        cast("Chunk", {"content": chunk})
        for index, chunk in enumerate(splitter.chunks(text))
    ]
