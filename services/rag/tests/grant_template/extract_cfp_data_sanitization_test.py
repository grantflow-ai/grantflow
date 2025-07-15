from services.rag.src.grant_template.extract_cfp_data import sanitize_text_content


def test_removes_excessive_newlines() -> None:
    text = "Line 1\n\n\n\n\nLine 2\n\n\n\n\n\n\n\nLine 3"
    result = sanitize_text_content(text)
    assert result == "Line 1\n\nLine 2\n\nLine 3"


def test_removes_multiple_spaces() -> None:
    text = "Word1    Word2     Word3"
    result = sanitize_text_content(text)
    assert result == "Word1 Word2 Word3"


def test_removes_trailing_whitespace() -> None:
    text = "Line 1   \nLine 2  \nLine 3    "
    result = sanitize_text_content(text)
    assert result == "Line 1\nLine 2\nLine 3"


def test_removes_null_characters() -> None:
    text = "Text with\x00null\x00characters"
    result = sanitize_text_content(text)
    assert result == "Text withnullcharacters"


def test_handles_mixed_issues() -> None:
    text = "Title\n\n\n\n\nContent   with   spaces\n\n\n\nMore\x00content   \n\n\n\n\n\n\nEnd"
    result = sanitize_text_content(text)
    assert result == "Title\n\nContent with spaces\n\nMorecontent\n\nEnd"


def test_handles_empty_string() -> None:
    result = sanitize_text_content("")
    assert result == ""


def test_handles_only_whitespace() -> None:
    text = "   \n\n\n   \t\t   \n\n"
    result = sanitize_text_content(text)
    assert result == ""


def test_preserves_single_newlines() -> None:
    text = "Line 1\nLine 2\nLine 3"
    result = sanitize_text_content(text)
    assert result == "Line 1\nLine 2\nLine 3"


def test_preserves_double_newlines() -> None:
    text = "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
    result = sanitize_text_content(text)
    assert result == "Paragraph 1\n\nParagraph 2\n\nParagraph 3"


def test_handles_windows_line_endings() -> None:
    text = "Line 1\r\n\r\n\r\n\r\nLine 2"
    result = sanitize_text_content(text)
    assert result == "Line 1\n\nLine 2"


def test_handles_excessive_newlines_like_in_error() -> None:
    text = "Content" + "\n" * 1000 + "More content"
    result = sanitize_text_content(text)
    assert result == "Content\n\nMore content"
    assert "\n\n\n" not in result
