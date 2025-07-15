from pytest_mock import MockFixture
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from packages.shared_utils.src.chunking import (
    MAX_CHARACTERS,
    OVERLAP_CHARACTERS,
    chunk_text,
    get_splitter,
)


def test_get_splitter_markdown() -> None:
    splitter = get_splitter(
        "text/markdown", max_chars=MAX_CHARACTERS, overlap_chars=OVERLAP_CHARACTERS
    )
    assert isinstance(splitter, MarkdownSplitter)


def test_get_splitter_text() -> None:
    splitter = get_splitter(
        "text/plain", max_chars=MAX_CHARACTERS, overlap_chars=OVERLAP_CHARACTERS
    )
    assert isinstance(splitter, TextSplitter)


def test_chunk_text_plain(mocker: MockFixture) -> None:
    mock_splitter = mocker.Mock()
    mock_splitter.chunks.return_value = ["chunk1", "chunk2", "chunk3"]
    mocker.patch(
        "packages.shared_utils.src.chunking.get_splitter", return_value=mock_splitter
    )

    text = "This is some plain text content."
    result = chunk_text(text=text, mime_type="text/plain")

    assert len(result) == 3
    assert [chunk["content"] for chunk in result] == ["chunk1", "chunk2", "chunk3"]
    mock_splitter.chunks.assert_called_once_with(text)


def test_chunk_text_markdown(mocker: MockFixture) -> None:
    mock_splitter = mocker.Mock()
    mock_splitter.chunks.return_value = ["# Header", "Paragraph 1", "Paragraph 2"]
    mocker.patch(
        "packages.shared_utils.src.chunking.get_splitter", return_value=mock_splitter
    )

    text = "# Header\n\nParagraph 1\n\nParagraph 2"
    result = chunk_text(text=text, mime_type="text/markdown")

    assert len(result) == 3
    assert [chunk["content"] for chunk in result] == [
        "# Header",
        "Paragraph 1",
        "Paragraph 2",
    ]
    mock_splitter.chunks.assert_called_once_with(text)


def test_chunk_text_integration() -> None:
    text = "A" * (MAX_CHARACTERS + 500)
    result = chunk_text(text=text, mime_type="text/plain")

    assert len(result) >= 2
    assert all(isinstance(chunk, dict) for chunk in result)
    assert all("content" in chunk for chunk in result)
    assert all(len(chunk["content"]) <= MAX_CHARACTERS for chunk in result)

    markdown_text = (
        f"# Header\n\n{'A' * MAX_CHARACTERS}\n\n## Another Header\n\n{'B' * 500}"
    )
    result = chunk_text(text=markdown_text, mime_type="text/markdown")

    assert len(result) >= 2
    assert all(isinstance(chunk, dict) for chunk in result)
    assert all("content" in chunk for chunk in result)
    assert all(len(chunk["content"]) <= MAX_CHARACTERS for chunk in result)
