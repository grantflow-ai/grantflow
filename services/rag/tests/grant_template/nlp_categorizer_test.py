"""Tests for NLP categorizer functionality."""

import asyncio
from typing import Any
from unittest.mock import patch

import pytest

from services.rag.src.grant_template.nlp_categorizer import (
    CATEGORY_LABELS,
    EXECUTOR_MAX_WORKERS,
    MAX_DISPLAY_ITEMS,
    _categorize_text_sync,
    _is_number,
    _strip_commas,
    categorize_text_async,
    format_nlp_analysis_for_prompt,
    get_nlp_categorizer_status,
)


def test_strip_commas() -> None:
    """Test comma stripping from numbers."""
    assert _strip_commas("The budget is $1,000,000 for this project.") == "The budget is $1000000 for this project."
    assert _strip_commas("No commas here") == "No commas here"
    assert _strip_commas("1,234,567.89 and 2,345") == "1234567.89 and 2345"


def test_is_number_mock_token() -> None:
    """Test number detection with mock token."""

    class MockToken:
        def __init__(self, text: str, like_num: bool = False) -> None:
            self.text = text
            self.like_num = like_num

    # Test with like_num=True
    assert _is_number(MockToken("1000", like_num=True))

    # Test with regex matching
    assert _is_number(MockToken("1,000"))
    assert _is_number(MockToken("123.45"))
    assert _is_number(MockToken("999"))

    # Test non-numbers
    assert not _is_number(MockToken("abc"))
    assert not _is_number(MockToken("12abc"))


def test_get_nlp_categorizer_status() -> None:
    """Test status reporting."""
    status = get_nlp_categorizer_status()

    assert isinstance(status, dict)
    assert "spacy_model_loaded" in status
    assert "model_name" in status
    assert "executor_max_workers" in status
    assert "supported_categories" in status
    assert status["supported_categories"] == CATEGORY_LABELS
    assert status["executor_max_workers"] == EXECUTOR_MAX_WORKERS


def test_category_labels_completeness() -> None:
    """Test that all expected categories are present."""
    expected_categories = [
        "Money",
        "Date/Time",
        "Writing-related",
        "Other Numbers",
        "Recommendations",
        "Orders",
        "Positive Instructions",
        "Negative Instructions",
        "Evaluation Criteria",
    ]
    assert expected_categories == CATEGORY_LABELS


@pytest.fixture
def sample_cfp_text() -> str:
    """Sample CFP text for testing."""
    return """
    The application must not exceed 10 pages in length.
    Applicants should consider submitting a budget of $50,000.
    The deadline for submission is March 15, 2025.
    Applications will be evaluated based on innovation and feasibility.
    You must include a detailed research plan.
    Please provide a bibliography with at least 20 references.
    Collaborative proposals are not allowed under this program.
    The review process involves peer evaluation by expert panels.
    """


def test_categorize_text_sync_basic(sample_cfp_text: str) -> None:
    """Test synchronous categorization with basic text."""
    with patch("services.rag.src.grant_template.nlp_categorizer.nlp") as mock_nlp:
        # Mock spaCy processing
        mock_doc = _create_mock_doc(sample_cfp_text)
        mock_nlp.pipe.return_value = [mock_doc]

        result = _categorize_text_sync(sample_cfp_text)

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)

        # Verify some expected categorizations
        assert len(result.get("Money", [])) > 0  # Budget mention
        assert len(result.get("Date/Time", [])) > 0  # Deadline
        assert len(result.get("Orders", [])) > 0  # Must requirements
        assert len(result.get("Evaluation Criteria", [])) > 0  # Review process


def test_categorize_text_sync_empty() -> None:
    """Test synchronous categorization with empty text."""
    result = _categorize_text_sync("")

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    assert all(len(sentences) == 0 for sentences in result.values())


def test_categorize_text_sync_spacy_unavailable(sample_cfp_text: str) -> None:
    """Test graceful handling when spaCy is unavailable."""
    with patch("services.rag.src.grant_template.nlp_categorizer.nlp", None):
        result = _categorize_text_sync(sample_cfp_text)

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)
        assert all(len(sentences) == 0 for sentences in result.values())


async def test_categorize_text_async(sample_cfp_text: str) -> None:
    """Test async categorization wrapper."""
    with patch("services.rag.src.grant_template.nlp_categorizer._categorize_text_sync") as mock_sync:
        expected_result = {"Money": ["Budget of $50,000"], "Date/Time": ["March 15, 2025"]}
        mock_sync.return_value = expected_result

        result = await categorize_text_async(sample_cfp_text)

        assert result == expected_result
        mock_sync.assert_called_once_with(sample_cfp_text)


async def test_categorize_text_async_empty() -> None:
    """Test async categorization with empty text."""
    result = await categorize_text_async("")

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    assert all(len(sentences) == 0 for sentences in result.values())


async def test_categorize_text_async_exception(sample_cfp_text: str) -> None:
    """Test async categorization exception handling."""
    with patch("services.rag.src.grant_template.nlp_categorizer._categorize_text_sync") as mock_sync:
        mock_sync.side_effect = Exception("Test error")

        result = await categorize_text_async(sample_cfp_text)

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)
        assert all(len(sentences) == 0 for sentences in result.values())


def test_format_nlp_analysis_for_prompt_with_content() -> None:
    """Test formatting analysis with content."""
    analysis = {
        "Money": ["Budget should not exceed $100,000", "Cost-sharing is required"],
        "Date/Time": ["Deadline is April 1, 2025"],
        "Orders": ["You must submit a detailed budget", "Applications are required to include CVs"],
        "Evaluation Criteria": ["Proposals will be evaluated on merit", "Review criteria include innovation"],
        "Recommendations": ["Applicants should consider collaboration"],
        "Writing-related": [],
        "Other Numbers": [],
        "Positive Instructions": [],
        "Negative Instructions": [],
    }

    result = format_nlp_analysis_for_prompt(analysis)

    assert "Structured NLP Analysis" in result
    assert "Total categorized sentences: 8" in result
    assert "Money (2 items)" in result
    assert "Date/Time (1 items)" in result
    assert "Orders (2 items)" in result
    assert "Budget should not exceed $100,000" in result
    assert "Deadline is April 1, 2025" in result


def test_format_nlp_analysis_for_prompt_empty() -> None:
    """Test formatting with empty analysis."""
    analysis: dict[str, list[str]] = {category: [] for category in CATEGORY_LABELS}

    result = format_nlp_analysis_for_prompt(analysis)

    assert result == "No NLP analysis available for this content."


def test_format_nlp_analysis_for_prompt_truncation() -> None:
    """Test formatting with many items (truncation)."""
    analysis = {
        "Orders": [f"Requirement {i}" for i in range(MAX_DISPLAY_ITEMS + 7)],  # More than MAX_DISPLAY_ITEMS
        "Money": ["Budget item"],
    }
    for category in CATEGORY_LABELS:
        if category not in analysis:
            analysis[category] = []

    result = format_nlp_analysis_for_prompt(analysis)

    expected_total = MAX_DISPLAY_ITEMS + 7
    assert f"Orders ({expected_total} items)" in result
    assert "... and 7 more items" in result  # (MAX_DISPLAY_ITEMS + 7) - MAX_DISPLAY_ITEMS = 7
    assert "1. Requirement 0" in result
    assert f"{MAX_DISPLAY_ITEMS}. Requirement {MAX_DISPLAY_ITEMS - 1}" in result


async def test_concurrent_categorization() -> None:
    """Test concurrent async categorization calls."""
    texts = [
        "The budget must not exceed $50,000 and is due March 1, 2025.",
        "Applications should include a 10-page research plan.",
        "Proposals will be evaluated by expert panels.",
    ]

    with patch("services.rag.src.grant_template.nlp_categorizer._categorize_text_sync") as mock_sync:
        # Return different results for each text
        mock_sync.side_effect = [
            {"Money": ["budget $50,000"], "Date/Time": ["March 1, 2025"], "Orders": ["must not exceed"]},
            {"Writing-related": ["10-page research plan"], "Recommendations": ["should include"]},
            {"Evaluation Criteria": ["evaluated by expert panels"]},
        ]

        # Run concurrent categorization
        tasks = [categorize_text_async(text) for text in texts]
        results = await asyncio.gather(*tasks)

        assert len(results) == 3
        assert all(isinstance(result, dict) for result in results)
        assert mock_sync.call_count == 3


def test_categorization_with_special_characters() -> None:
    """Test categorization with special characters and formatting."""
    text_with_special_chars = """
    The application must include:\\n\\t• A budget of $25,000\\n\\t• Due date: 12/31/2024\\n

    Applications won't be accepted after the deadline.
    """

    with patch("services.rag.src.grant_template.nlp_categorizer.nlp") as mock_nlp:
        mock_doc = _create_simple_mock_doc()
        mock_nlp.pipe.return_value = [mock_doc]

        result = _categorize_text_sync(text_with_special_chars)

        assert isinstance(result, dict)
        # Should handle special characters without crashing
        assert all(category in result for category in CATEGORY_LABELS)


def test_categorize_text_sync_with_exception() -> None:
    """Test handling of exceptions in synchronous categorization."""
    with patch("services.rag.src.grant_template.nlp_categorizer.nlp") as mock_nlp:
        mock_nlp.pipe.side_effect = Exception("spaCy processing error")

        result = _categorize_text_sync("Some test text")

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)
        assert all(len(sentences) == 0 for sentences in result.values())


def test_format_nlp_analysis_none_input() -> None:
    """Test formatting with None input."""
    result = format_nlp_analysis_for_prompt({})
    assert result == "No NLP analysis available for this content."


def test_format_nlp_analysis_malformed_input() -> None:
    """Test formatting with malformed input."""
    malformed_analysis: dict[str, list[str]] = {"Invalid": []}

    # Should handle gracefully without crashing
    result = format_nlp_analysis_for_prompt(malformed_analysis)
    assert isinstance(result, str)


def _create_mock_doc(text: str) -> Any:
    """Create a mock spaCy doc for testing."""

    class MockEntity:
        def __init__(self, label_: str) -> None:
            self.label_ = label_

    class MockToken:
        def __init__(self, text: str, pos_: str = "", tag_: str = "", like_num: bool = False) -> None:
            self.text = text
            self.pos_ = pos_
            self.tag_ = tag_
            self.like_num = like_num

    class MockSentence:
        def __init__(self, text: str, tokens: list[MockToken], entities: list[MockEntity]) -> None:
            self.text = text
            self.ents = entities
            self._tokens = tokens

        def __iter__(self) -> Any:
            return iter(self._tokens)

        def __len__(self) -> int:
            return len(self._tokens)

        def __getitem__(self, key: Any) -> Any:
            return self._tokens[key]

    class MockDoc:
        def __init__(self, sentences: list[MockSentence]) -> None:
            self.sents = sentences

    # Create mock sentences with various categorizable content
    sentences = [
        MockSentence(
            "The application must not exceed 10 pages in length.",
            [
                MockToken("The"),
                MockToken("application"),
                MockToken("must"),
                MockToken("not"),
                MockToken("exceed"),
                MockToken("10", like_num=True),
                MockToken("pages"),
                MockToken("in"),
                MockToken("length"),
                MockToken("."),
            ],
            [],
        ),
        MockSentence(
            "Applicants should consider submitting a budget of $50,000.",
            [
                MockToken("Applicants"),
                MockToken("should"),
                MockToken("consider"),
                MockToken("submitting"),
                MockToken("a"),
                MockToken("budget"),
                MockToken("of"),
                MockToken("$50,000", like_num=True),
                MockToken("."),
            ],
            [],
        ),
        MockSentence(
            "The deadline for submission is March 15, 2025.",
            [
                MockToken("The"),
                MockToken("deadline"),
                MockToken("for"),
                MockToken("submission"),
                MockToken("is"),
                MockToken("March"),
                MockToken("15"),
                MockToken(","),
                MockToken("2025"),
                MockToken("."),
            ],
            [MockEntity("DATE")],
        ),
        MockSentence(
            "Applications will be evaluated based on innovation and feasibility.",
            [
                MockToken("Applications"),
                MockToken("will"),
                MockToken("be"),
                MockToken("evaluated"),
                MockToken("based"),
                MockToken("on"),
                MockToken("innovation"),
                MockToken("and"),
                MockToken("feasibility"),
                MockToken("."),
            ],
            [],
        ),
    ]

    return MockDoc(sentences)


def _create_simple_mock_doc() -> Any:
    """Create a simple mock doc for basic testing."""

    class MockSentence:
        def __init__(self) -> None:
            self.text = "Sample sentence for testing."
            self.ents: list[Any] = []
            self._tokens: list[Any] = []

        def __iter__(self) -> Any:
            return iter(self._tokens)

        def __len__(self) -> int:
            return len(self._tokens)

        def __getitem__(self, key: Any) -> Any:
            return self._tokens[key]

    class MockDoc:
        def __init__(self) -> None:
            self.sents = [MockSentence()]

    return MockDoc()
