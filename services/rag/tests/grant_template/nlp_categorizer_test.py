from typing import Any
from unittest.mock import patch

import pytest

from services.rag.src.grant_template.nlp_categorizer import (
    CATEGORY_LABELS,
    NLPCategorizationResult,
    categorize_text,
    categorize_text_async,
    format_nlp_analysis_for_prompt,
    get_nlp_categorizer_status,
)


def test_categorize_text_sync_basic() -> None:
    text = "The budget must not exceed $50,000. Deadline is March 15, 2025."

    with patch("packages.shared_utils.src.nlp.get_spacy_model") as mock_spacy:
        mock_doc = _create_mock_doc()
        mock_spacy.return_value.return_value = mock_doc

        result = categorize_text(text)

        assert isinstance(result, dict)
        assert all(category in result for category in CATEGORY_LABELS)


def test_categorize_text_sync_empty() -> None:
    result = categorize_text("")

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    assert all(
        len(sentences) == 0
        for sentences in [
            result["money"],
            result["date_time"],
            result["writing_related"],
            result["other_numbers"],
            result["recommendations"],
            result["orders"],
            result["positive_instructions"],
            result["negative_instructions"],
            result["evaluation_criteria"],
        ]
    )


@pytest.mark.asyncio
async def test_categorize_text_async() -> None:
    text = "Applications must include budgets of $25,000."

    with patch("asyncio.to_thread") as mock_to_thread:
        expected = {"money": ["Budget of $25,000"], "date_time": []}
        mock_to_thread.return_value = expected

        result = await categorize_text_async(text)

        assert result == expected


def test_format_nlp_analysis_for_prompt_with_content() -> None:
    analysis = NLPCategorizationResult(
        money=["Budget should not exceed $100,000"],
        orders=["You must submit detailed plans"],
        date_time=[],
        writing_related=[],
        other_numbers=[],
        recommendations=[],
        positive_instructions=[],
        negative_instructions=[],
        evaluation_criteria=[],
    )

    result = format_nlp_analysis_for_prompt(analysis)

    assert "NLP Analysis" in result
    assert "Total: 2 categorized sentences" in result
    assert "money (1)" in result
    assert "orders (1)" in result


def test_format_nlp_analysis_for_prompt_empty() -> None:
    analysis = NLPCategorizationResult(
        money=[],
        date_time=[],
        writing_related=[],
        other_numbers=[],
        recommendations=[],
        orders=[],
        positive_instructions=[],
        negative_instructions=[],
        evaluation_criteria=[],
    )

    result = format_nlp_analysis_for_prompt(analysis)

    assert result == "No NLP analysis available - no categorized content found."


def test_get_nlp_categorizer_status() -> None:
    status = get_nlp_categorizer_status()

    assert isinstance(status, dict)
    assert "spacy_model_loaded" in status
    assert "supported_categories" in status
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
