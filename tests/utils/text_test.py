import pytest

from src.utils.text import (
    concatenate_segments_with_spacy_coherence,
    normalize_markdown,
    normalize_punctuation,
)


@pytest.mark.parametrize(
    ("segments", "expected"),
    [
        ([], ""),
        (["This is a test."], "This is a test."),
        (["This is a test. ", "This is another test. "], "This is a test. This is another test."),
        (
            ["This is a test. ", "This is a test. This is another test."],
            "This is a test. This is another test.",
        ),
        (
            ["Complex sentence with multiple parts. Another part.", "Another part. Final segment."],
            "Complex sentence with multiple parts. Another part. Final segment.",
        ),
    ],
)
def test_concatenate_segments_with_spacy_coherence(segments: list[str], expected: str) -> None:
    result = concatenate_segments_with_spacy_coherence(segments)
    assert result == expected


@pytest.mark.parametrize(
    ("input_text", "expected"),
    [
        # Basic ASCII text
        ("Normal text", "Normal text"),
        # Single quotes
        (f"Text with {chr(0x2018)}single quotes{chr(0x2019)}", "Text with 'single quotes'"),
        # Double quotes
        (f"Text with {chr(0x201C)}double quotes{chr(0x201D)}", 'Text with "double quotes"'),
        # Dashes
        (f"Text with {chr(0x2013)} en dash", "Text with - en dash"),
        (f"Text with {chr(0x2014)} em dash", "Text with - em dash"),
        (f"Text with {chr(0x2015)} horizontal bar", "Text with - horizontal bar"),
        # Ellipsis
        (f"Text with {chr(0x2026)} ellipsis", "Text with ... ellipsis"),
        # Mixed punctuation
        (
            f"Text with {chr(0x201C)}mixed{chr(0x201D)} and {chr(0x2014)} marks",
            'Text with "mixed" and - marks',
        ),
        # Non-ASCII characters should be preserved
        ("Text with ümlaut", "Text with ümlaut"),
        ("Русский текст", "Русский текст"),
        (f"über{chr(0x2019)}s Café", "über's Café"),
        # Multiple instances
        (f"{chr(0x201C)}Quote{chr(0x201D)} and {chr(0x201C)}quote{chr(0x201D)}", '"Quote" and "quote"'),
    ],
)
def test_normalize_punctuation(input_text: str, expected: str) -> None:
    result = normalize_punctuation(input_text)
    assert result == expected


@pytest.mark.parametrize(
    ("input_text", "expected"),
    [
        # Headers
        (
            "# Header 1\n## Header 2\n### Header 3",
            "# Header 1\n\n## Header 2\n\n### Header 3",
        ),
        # Unordered lists
        (
            "* Item 1\n* Item 2\n* Item 3",
            "* Item 1\n* Item 2\n* Item 3",
        ),
        # Ordered lists
        (
            "1. First\n2. Second\n3. Third",
            "1. First\n2. Second\n3. Third",
        ),
        # Mixed lists
        (
            "* Bullet\n1. Number\n* Bullet again",
            "* Bullet\n1. Number\n* Bullet again",
        ),
        # Headers with lists
        (
            "# Header\n* List item 1\n* List item 2",
            "# Header\n\n* List item 1\n* List item 2",
        ),
        # Lists with paragraphs
        (
            "* Item 1\n* Item 2\n\nParagraph text.",
            "* Item 1\n* Item 2\n\nParagraph text.",
        ),
        # Complex nesting
        (
            "# Main\n## Sub\n* List 1\n* List 2\n\nText.\n## Another",
            "# Main\n\n## Sub\n\n* List 1\n* List 2\n\nText.\n\n## Another",
        ),
        # Broken bold fix
        (
            "**Text. **broken\nmore text",
            "**Text.**broken\n\nmore text",
        ),
        # Mixed Unicode and markdown
        (
            f"# Café\n* Crème\n* Brûlée\n\nText with {chr(0x201C)}quotes{chr(0x201D)}",
            '# Café\n\n* Crème\n* Brûlée\n\nText with "quotes"',
        ),
        # Edge cases
        ("", ""),
        ("\n\n\n", ""),
        ("  ", ""),
        # Whitespace handling
        (
            "# Header  with  spaces\n*  List  spaces",
            "# Header with spaces\n\n* List spaces",
        ),
        # Multiple consecutive lists
        (
            "* List 1\n* List 2\n\n1. Num 1\n2. Num 2",
            "* List 1\n* List 2\n\n1. Num 1\n2. Num 2",
        ),
    ],
)
def test_normalize_markdown(input_text: str, expected: str) -> None:
    result = normalize_markdown(input_text)
    assert result == expected


def test_normalize_markdown_complex() -> None:
    input_text = f"""# Main Document
## Section 1

* Bullet 1
* Bullet 2
* Bullet 3

Regular paragraph with {chr(0x201C)}quoted text{chr(0x201D)}.

## Section 2

1. Numbered item
2. Another item

* Mixed list type
* With {chr(0x2014)} dash

Final paragraph.
"""

    expected = """# Main Document

## Section 1

* Bullet 1
* Bullet 2
* Bullet 3

Regular paragraph with "quoted text".

## Section 2

1. Numbered item
2. Another item

* Mixed list type
* With - dash

Final paragraph."""

    assert normalize_markdown(input_text) == expected
