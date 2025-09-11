from unittest.mock import MagicMock

from pytest_mock import MockerFixture

from services.rag.src.utils.scientific_context import (
    extract_scientific_terms_from_context,
    format_scientific_context,
    validate_scientific_context,
)


def test_format_scientific_context_success() -> None:
    test_context = "Machine learning is a subset of artificial intelligence."
    result = format_scientific_context(test_context)

    assert "## Scientific Foundation Context" in result
    assert test_context in result
    assert "This context provides foundational scientific concepts" in result


def test_format_scientific_context_empty() -> None:
    result = format_scientific_context("")
    assert result == ""


def test_format_scientific_context_none() -> None:
    result = format_scientific_context(None)  # type: ignore
    assert result == ""


def test_format_scientific_context_template_error(mocker: MockerFixture) -> None:
    mock_template = MagicMock()
    mock_template.substitute.return_value = MagicMock()
    mock_template.substitute.return_value.to_string.side_effect = Exception("Template error")
    mocker.patch("services.rag.src.utils.scientific_context.SCIENTIFIC_CONTEXT_TEMPLATE", mock_template)

    test_context = "Test context"
    result = format_scientific_context(test_context)

    assert result == test_context


def test_extract_scientific_terms_from_context_success() -> None:
    test_context = "**machine learning** is related to **artificial intelligence** and **neural networks**."
    result = extract_scientific_terms_from_context(test_context)

    assert "machine learning" in result
    assert "artificial intelligence" in result
    assert "neural networks" in result
    assert len(result) == 3


def test_extract_scientific_terms_from_context_empty() -> None:
    result = extract_scientific_terms_from_context("")
    assert result == []


def test_extract_scientific_terms_from_context_none() -> None:
    result = extract_scientific_terms_from_context(None)  # type: ignore
    assert result == []


def test_extract_scientific_terms_from_context_no_terms() -> None:
    test_context = "This is a regular text without any scientific terms."
    result = extract_scientific_terms_from_context(test_context)
    assert result == []


def test_extract_scientific_terms_from_context_duplicates() -> None:
    test_context = "**machine learning** and **machine learning** are the same."
    result = extract_scientific_terms_from_context(test_context)

    assert result == ["machine learning"]
    assert len(result) == 1


def test_extract_scientific_terms_from_context_whitespace() -> None:
    test_context = "**  machine learning  ** and **artificial intelligence**"
    result = extract_scientific_terms_from_context(test_context)

    assert "machine learning" in result
    assert "artificial intelligence" in result
    assert len(result) == 2


def test_extract_scientific_terms_from_context_regex_error(mocker: MockerFixture) -> None:
    mocker.patch("re.findall", side_effect=Exception("Regex error"))

    test_context = "**machine learning**"
    result = extract_scientific_terms_from_context(test_context)

    assert result == []


def test_validate_scientific_context_valid() -> None:
    test_context = """## Scientific Foundation Context
**machine learning** and **artificial intelligence** are key concepts.

This context provides foundational scientific concepts and terminology relevant to the research objective."""

    result = validate_scientific_context(test_context)

    assert result["is_valid"] is True
    assert result["has_content"] is True
    assert result["has_scientific_terms"] is True
    assert result["term_count"] == 2
    assert len(result["errors"]) == 0


def test_validate_scientific_context_empty() -> None:
    result = validate_scientific_context("")

    assert result["is_valid"] is False
    assert result["has_content"] is False
    assert result["has_scientific_terms"] is False
    assert result["term_count"] == 0
    assert "Context is empty" in result["errors"]


def test_validate_scientific_context_none() -> None:
    result = validate_scientific_context(None)  # type: ignore

    assert result["is_valid"] is False
    assert result["has_content"] is False
    assert result["has_scientific_terms"] is False
    assert result["term_count"] == 0
    assert "Context is empty" in result["errors"]


def test_validate_scientific_context_missing_header() -> None:
    test_context = "**machine learning** is important."

    result = validate_scientific_context(test_context)

    assert result["is_valid"] is False
    assert result["has_content"] is True
    assert result["has_scientific_terms"] is True
    assert result["term_count"] == 1
    assert "Missing scientific context header" in result["errors"]


def test_validate_scientific_context_no_terms() -> None:
    test_context = """## Scientific Foundation Context
This is a context without any scientific terms."""

    result = validate_scientific_context(test_context)

    assert result["is_valid"] is False
    assert result["has_content"] is True
    assert result["has_scientific_terms"] is False
    assert result["term_count"] == 0
    assert "No scientific terms found" in result["errors"]


def test_validate_scientific_context_multiple_errors() -> None:
    test_context = "This context has no header and no terms."

    result = validate_scientific_context(test_context)

    assert result["is_valid"] is False
    assert result["has_content"] is True
    assert result["has_scientific_terms"] is False
    assert result["term_count"] == 0
    assert len(result["errors"]) == 2
    assert "Missing scientific context header" in result["errors"]
    assert "No scientific terms found" in result["errors"]


def test_validate_scientific_context_extraction_error(mocker: MockerFixture) -> None:
    mocker.patch(
        "services.rag.src.utils.scientific_context.extract_scientific_terms_from_context",
        side_effect=Exception("Extraction error"),
    )

    test_context = """## Scientific Foundation Context
**machine learning** is important."""

    result = validate_scientific_context(test_context)

    assert result["is_valid"] is False
    assert result["has_content"] is True
    assert result["has_scientific_terms"] is False
    assert result["term_count"] == 0
    assert "Validation error: Extraction error" in result["errors"]


def test_validation_result_structure() -> None:
    result = validate_scientific_context("")

    assert isinstance(result, dict)
    assert "is_valid" in result
    assert "has_content" in result
    assert "has_scientific_terms" in result
    assert "term_count" in result
    assert "errors" in result

    assert isinstance(result["is_valid"], bool)
    assert isinstance(result["has_content"], bool)
    assert isinstance(result["has_scientific_terms"], bool)
    assert isinstance(result["term_count"], int)
    assert isinstance(result["errors"], list)
