from typing import TYPE_CHECKING, Any

import pytest
from pytest_mock import MockFixture

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.post_processing import (
    BM25Ranker,
    SentenceInfo,
    apply_bm25_ranking,
    apply_semantic_ranking,
    parse_documents,
    post_process_documents,
)

if TYPE_CHECKING:
    from collections.abc import MutableMapping


@pytest.fixture
def sample_documents() -> list[DocumentDTO]:
    return [
        {"content": "The quick brown fox jumps over the lazy dog."},
        {"content": "The lazy dog is jumped over by the quick brown fox."},
        {"content": "A completely different sentence about something else."},
    ]


@pytest.fixture
def sample_sentences() -> list[str]:
    return [
        "The quick brown fox jumps over the lazy dog.",
        "The lazy dog is jumped over by the quick brown fox.",
        "A completely different sentence about something else.",
        "This is almost identical to the quick brown fox jumping over the lazy canine.",
    ]


@pytest.fixture
def sample_sentence_infos() -> list[SentenceInfo]:
    return [
        {
            "text": "The quick brown fox jumps over the lazy dog.",
            "processed_text": "quick brown fox jumps lazy dog",
            "content_word_ratio": 0.8,
            "doc_idx": 0,
            "relevance_score": 0.9,
        },
        {
            "text": "A completely different sentence about something else.",
            "processed_text": "completely different sentence something else",
            "content_word_ratio": 0.7,
            "doc_idx": 2,
            "relevance_score": 0.8,
        },
        {
            "text": "This is a new sentence not in any document.",
            "processed_text": "new sentence document",
            "content_word_ratio": 0.5,
            "doc_idx": 1,
            "relevance_score": 0.6,
        },
    ]


async def test_bm25_ranker(mocker: MockFixture) -> None:
    sentences = ["apple banana", "orange grape", "apple orange"]
    query = "apple fruit"

    mock_nlp = mocker.MagicMock()
    mock_token1 = mocker.MagicMock(is_punct=False, is_space=False, text="apple")
    mock_token2 = mocker.MagicMock(is_punct=False, is_space=False, text="banana")
    mock_token3 = mocker.MagicMock(is_punct=False, is_space=False, text="orange")
    mock_token4 = mocker.MagicMock(is_punct=False, is_space=False, text="grape")
    mock_token5 = mocker.MagicMock(is_punct=False, is_space=False, text="fruit")

    sentence_tokens: MutableMapping[str, list[Any]] = {
        "apple banana": [mock_token1, mock_token2],
        "orange grape": [mock_token3, mock_token4],
        "apple orange": [mock_token1, mock_token3],
        "apple fruit": [mock_token1, mock_token5],
    }

    def mock_nlp_side_effect(text: str) -> list[Any]:
        return sentence_tokens.get(text, [])

    mock_nlp.side_effect = mock_nlp_side_effect
    mocker.patch("rank_bm25.BM25Okapi.__init__", return_value=None)
    mock_bm25 = mocker.patch.object(BM25Ranker, "rank")
    mock_bm25.return_value = {"apple banana": 0.8, "orange grape": 0.2, "apple orange": 0.6}

    mocker.patch("services.rag.src.utils.post_processing.get_spacy_model", return_value=mock_nlp)

    result = await apply_bm25_ranking(sentences, query)

    assert len(result) == 3
    assert result["apple banana"] > result["apple orange"] > result["orange grape"]


async def test_apply_semantic_ranking(mocker: MockFixture) -> None:
    sentences = ["apple banana", "orange grape", "apple orange"]
    query = "apple fruit"

    mock_model = mocker.MagicMock()

    mock_query_tensor = mocker.MagicMock()

    mock_sentence_tensors = mocker.MagicMock()

    similarities = [0.8, 0.3, 0.6]

    mock_model.encode.side_effect = lambda text, **_: mock_query_tensor if text == query else mock_sentence_tensors

    mock_cos_sim = mocker.patch("sentence_transformers.util.pytorch_cos_sim")
    mock_cos_sim.return_value = mocker.MagicMock()
    mock_cos_sim.return_value.squeeze.return_value.tolist.return_value = similarities

    mocker.patch("services.rag.src.utils.post_processing.get_embedding_model", return_value=mock_model)

    result = await apply_semantic_ranking(sentences, query)

    assert len(result) == 3
    assert result["apple banana"] == 0.8
    assert result["orange grape"] == 0.3
    assert result["apple orange"] == 0.6
    assert result["apple banana"] > result["apple orange"] > result["orange grape"]


async def test_parse_documents(
    sample_documents: list[DocumentDTO], sample_sentence_infos: list[SentenceInfo], mocker: MockFixture
) -> None:
    mock_count_tokens = mocker.patch("services.rag.src.utils.post_processing.count_tokens")
    mock_count_tokens.side_effect = lambda text, **_: len(text.split())

    result = await parse_documents(sentence_infos=sample_sentence_infos, max_tokens=100, model="test-model")

    assert len(result) == 3
    assert "The quick brown fox jumps over the lazy dog." in result
    assert "A completely different sentence about something else." in result
    assert "This is a new sentence not in any document." in result


async def test_post_process_documents_empty_input() -> None:
    result = await post_process_documents(
        documents=[], query="test query", max_tokens=1000, model="test-model", task_description=""
    )
    assert result == []


async def test_post_process_documents_integration(sample_documents: list[DocumentDTO], mocker: MockFixture) -> None:
    mock_process_sentence = mocker.patch("services.rag.src.utils.post_processing._process_sentence")
    mock_process_sentence.return_value = "Processed text"

    mock_deduplicate = mocker.patch("services.rag.src.utils.post_processing.deduplicate_sentences")
    mock_deduplicate.return_value = ["Sentence 1", "Sentence 2"]

    mock_bm25_ranker = mocker.patch("services.rag.src.utils.post_processing.BM25Ranker")
    mock_bm25_ranker.return_value.rank.return_value = {"Processed text": 0.8}

    mock_semantic = mocker.patch("services.rag.src.utils.post_processing.apply_semantic_ranking")
    mock_semantic.return_value = {"Sentence 1": 0.7, "Sentence 2": 0.6}

    mock_parse = mocker.patch("services.rag.src.utils.post_processing.smart_parse_documents_with_batched_tokens")
    processed_docs = ["Processed content 1", "Processed content 2"]
    mock_parse.return_value = (processed_docs, 100)

    mock_count_tokens = mocker.patch("services.rag.src.utils.post_processing.count_tokens")
    mock_count_tokens.return_value = 10

    mock_nlp = mocker.patch("services.rag.src.utils.post_processing.get_spacy_model")

    mock_token = mocker.MagicMock()
    mock_token.is_alpha = True
    mock_token.is_stop = False

    mock_sent = mocker.MagicMock()
    mock_sent.text = "Sentence 1"
    mock_sent.__iter__.return_value = [mock_token, mock_token, mock_token, mock_token]

    mock_doc = mocker.MagicMock()
    mock_doc.sents = [mock_sent]
    mock_nlp.return_value.return_value = mock_doc

    result = await post_process_documents(
        documents=sample_documents, query="test query", max_tokens=1000, model="test-model", task_description=""
    )

    assert result == processed_docs

    mock_deduplicate.assert_called_once()
    mock_semantic.assert_called_once()
    mock_parse.assert_called_once()
