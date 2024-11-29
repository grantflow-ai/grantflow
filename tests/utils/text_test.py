import pytest

from src.utils.text import concatenate_segments_with_spacy_coherence, strip_lines


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("  hello world  ", "hello world"),
        ("  hello\nworld  ", "hello\nworld"),
        ("  hello\n\nworld  ", "hello\nworld"),
        ("\n  hello\nworld\n  ", "hello\nworld"),
    ],
)
def test_strip_lines(text: str, expected: str) -> None:
    assert strip_lines(text) == expected


@pytest.mark.parametrize(
    ("segments", "max_overlap_sentences", "expected"),
    [
        ([], 0, ""),
        (["This is a test."], 0, "This is a test."),
        (["This is a test. ", "This is another test. "], 0, "This is a test. This is another test."),
        (["This is a test. ", "This is a test. This is another test."], 2, "This is a test. This is another test."),
    ],
)
def test_concatenate_segments_with_spacy_coherence(
    segments: list[str], max_overlap_sentences: int, expected: str
) -> None:
    result = concatenate_segments_with_spacy_coherence(segments, max_overlap_sentences)
    assert result == expected
