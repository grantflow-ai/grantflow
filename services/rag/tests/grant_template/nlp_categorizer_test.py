from typing import Any
from unittest.mock import patch

import pytest

from services.rag.src.grant_template.nlp_categorizer import (
    CATEGORY_LABELS,
    EXECUTOR_MAX_WORKERS,
    _categorize_text_sync,
    categorize_text_async,
    format_nlp_analysis_for_prompt,
    get_nlp_categorizer_status,
)


def test_categorize_text_sync_basic() -> None:
    text = "The budget must not exceed $50,000. Deadline is March 15, 2025."

    with patch("packages.shared_utils.src.nlp.get_spacy_model") as mock_spacy:
        mock_doc = _create_mock_doc()
        mock_spacy.return_value.return_value = mock_doc

        result = _categorize_text_sync(text)

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)


def test_categorize_text_sync_empty() -> None:
    result = _categorize_text_sync("")

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    assert all(len(sentences) == 0 for sentences in result.values())


@pytest.mark.asyncio
async def test_categorize_text_async() -> None:
    text = "Applications must include budgets of $25,000."

    with patch("services.rag.src.grant_template.nlp_categorizer._categorize_text_sync") as mock_sync:
        expected = {"Money": ["Budget of $25,000"], "Date/Time": []}
        mock_sync.return_value = expected

        result = await categorize_text_async(text)

        assert result == expected


def test_format_nlp_analysis_for_prompt_with_content() -> None:
    analysis = {
        "Money": ["Budget should not exceed $100,000"],
        "Orders": ["You must submit detailed plans"],
        "Date/Time": [],
        "Evaluation Criteria": [],
        "Negative Instructions": [],
    }

    result = format_nlp_analysis_for_prompt(analysis)

    assert "NLP Analysis" in result
    assert "Total: 2 categorized sentences" in result
    assert "Money (1)" in result
    assert "Orders (1)" in result


def test_format_nlp_analysis_for_prompt_empty() -> None:
    analysis: dict[str, list[str]] = {category: [] for category in CATEGORY_LABELS}

    result = format_nlp_analysis_for_prompt(analysis)

    assert result == "No NLP analysis available for this content."


def test_get_nlp_categorizer_status() -> None:
    status = get_nlp_categorizer_status()

    assert isinstance(status, dict)
    assert "spacy_model_loaded" in status
    assert "executor_max_workers" in status
    assert "supported_categories" in status
    assert status["executor_max_workers"] == EXECUTOR_MAX_WORKERS
    assert status["supported_categories"] == CATEGORY_LABELS


def _create_mock_doc() -> Any:
    class MockEntity:
        def __init__(self, label_: str) -> None:
            self.label_ = label_

    class MockToken:
        def __init__(self, text: str, like_num: bool = False) -> None:
            self.text = text
            self.like_num = like_num

    class MockSentence:
        def __init__(self, text: str) -> None:
            self.text = text
            self.ents = [MockEntity("DATE")] if "2025" in text else []

        def __iter__(self) -> Any:
            return iter([MockToken("$50,000", like_num=True)])

    class MockDoc:
        def __init__(self) -> None:
            self.sents = [MockSentence("Budget is $50,000 due March 15, 2025")]

    return MockDoc()
