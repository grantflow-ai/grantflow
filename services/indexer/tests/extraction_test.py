from pathlib import Path

import pytest
from packages.shared_utils.src.exceptions import FileParsingError
from services.indexer.src.extraction import (
    extract_file_content,
)
from testing import TEST_DATA_SOURCES


async def test_extract_plain_text() -> None:
    content = b"Hello, World!"
    mime_type = "text/plain"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert result == "Hello, World!"
    assert output_mime_type == mime_type


async def test_extract_markdown() -> None:
    content = b"# Hello\n\nWorld!"
    mime_type = "text/markdown"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert result == "# Hello\n\nWorld!"
    assert output_mime_type == mime_type


async def test_extract_csv() -> None:
    content = b"a,b,c\n1,2,3"
    mime_type = "text/csv"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert "a" in result
    assert "b" in result
    assert "c" in result
    assert output_mime_type == "text/markdown"


@pytest.mark.parametrize("document", TEST_DATA_SOURCES)
async def test_extract_with_kreuzberg(document: Path) -> None:
    content = document.read_bytes()
    mime_type = (
        "application/pdf"
        if document.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert output_mime_type == "text/markdown" if mime_type != "application/pdf" else "text/plain"


async def test_extract_unsupported_mime_type() -> None:
    content = b"Some content"
    mime_type = "application/unsupported"

    with pytest.raises(FileParsingError):
        await extract_file_content(content=content, mime_type=mime_type)
