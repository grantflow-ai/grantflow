from asyncio import gather
from typing import Final, TypedDict

from rank_bm25 import BM25Okapi
from sentence_transformers import util
from spacy.language import Language
from spacy.tokens import Span

from src.rag.dto import DocumentDTO
from src.utils.embeddings import get_embedding_model
from src.utils.logger import get_logger
from src.utils.nlp import get_spacy_model
from src.utils.text import count_tokens

logger = get_logger(__name__)


DEFAULT_MAX_TOKENS: Final[int] = 4000
MIN_SENTENCE_LENGTH: Final[int] = 10
SIMILARITY_THRESHOLD: Final[float] = 0.85
MIN_CONTENT_WORD_RATIO: Final[float] = 0.4
BOILERPLATE_PATTERNS: Final[list[str]] = [
    "please note that",
    "as mentioned earlier",
    "it is important to",
    "please be advised",
    "for more information",
    "as described above",
    "for further details",
    "in accordance with",
    "as per the",
    "according to the",
    "pursuant to",
]


class SentenceInfo(TypedDict):
    """Information about a sentence for ranking and filtering."""

    text: str
    processed_text: str
    content_word_ratio: float
    doc_idx: int
    relevance_score: float


class BM25Ranker:
    """Precomputes BM25 scores for faster retrieval.

    Args:
        sentences: List of sentences to rank
        nlp: spaCy NLP model for tokenization
    """

    def __init__(self, sentences: list[str], nlp: Language) -> None:
        self.sentences = sentences
        tokenized_corpus = [
            [token.text.lower() for token in nlp(sentence) if not token.is_punct and not token.is_space]
            for sentence in sentences
        ]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def rank(self, query: str, nlp: Language) -> dict[str, float]:
        """Rank sentences based on BM25 relevance to query.

        Args:
            query: Query to rank against
            nlp: spaCy NLP model for tokenization

        Returns:
            Dictionary mapping sentences to their BM25 scores
        """
        tokenized_query = [token.text.lower() for token in nlp(query) if not token.is_punct and not token.is_space]
        scores = self.bm25.get_scores(tokenized_query)
        max_score = max(scores) if len(scores) > 0 else 1
        normalized_scores = [score / max_score if max_score > 0 else 0 for score in scores]

        return {self.sentences[i]: normalized_scores[i] for i in range(len(self.sentences))}


async def post_process_documents(
    *,
    documents: list[DocumentDTO],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str,
    query: str,
    task_description: str,
) -> list[str]:
    """Post-process retrieved documents to reduce token count and rerank.

    This function:
    1. Deduplicates similar sentences across documents
    2. Removes stopwords and low-value content from sentences
    3. Filters out boilerplate text and redundant phrases
    4. Applies reranking using BM25 and semantic similarity
    5. Trims the result to fit within the max token limit

    Args:
        documents: The retrieved documents to post-process
        max_tokens: Maximum token count for the combined documents
        model: The model to use for token counting
        query: The original query used for retrieval
        task_description: The task description

    Returns:
        List of post-processed document contents
    """
    if not documents:
        return []

    logger.info("Post-processing retrieved documents", document_count=len(documents), query=query)

    nlp = get_spacy_model()
    all_sentences: list[SentenceInfo] = []

    for i, doc in enumerate(documents):
        content = doc["content"]
        spacy_doc = nlp(content)

        for sent in spacy_doc.sents:
            sent_text = sent.text.strip()
            if len(sent_text) >= MIN_SENTENCE_LENGTH and not _is_boilerplate(sent_text):
                processed_text = await _process_sentence(sent=sent)
                content_word_count = len([t for t in sent if t.is_alpha and not t.is_stop])
                total_word_count = len([t for t in sent if t.is_alpha])
                content_ratio = content_word_count / total_word_count if total_word_count > 0 else 0

                if content_ratio >= MIN_CONTENT_WORD_RATIO:
                    all_sentences.append(
                        {
                            "text": sent_text,
                            "processed_text": processed_text,
                            "content_word_ratio": content_ratio,
                            "doc_idx": i,
                            "relevance_score": 0,
                        }
                    )

    unique_sentences = await deduplicate_sentences([s["text"] for s in all_sentences])

    filtered_sentences = [s for s in all_sentences if s["text"] in unique_sentences]

    processed_texts = [s["processed_text"] for s in filtered_sentences]
    bm25_ranker = BM25Ranker(processed_texts, nlp)
    bm25_scores = bm25_ranker.rank(query, nlp)

    original_texts = [s["text"] for s in filtered_sentences]
    semantic_scores = await apply_semantic_ranking(original_texts, query)

    for _, sent_info in enumerate(filtered_sentences):
        sent_info["relevance_score"] = (
            0.4 * bm25_scores.get(sent_info["processed_text"], 0)
            + 0.6 * semantic_scores.get(sent_info["text"], 0)
            + 0.1 * sent_info["content_word_ratio"]
        )

    filtered_sentences.sort(key=lambda s: s["relevance_score"], reverse=True)

    adjusted_max_tokens = max_tokens - await count_tokens(task_description)
    processed_docs = await parse_documents(
        original_docs=documents, sentence_infos=filtered_sentences, max_tokens=adjusted_max_tokens, model=model
    )

    token_count = sum(await gather(*[count_tokens(text=doc, model=model) for doc in processed_docs]))

    logger.info(
        "Post-processing complete",
        original_docs=len(documents),
        processed_docs=len(processed_docs),
        token_count=token_count,
        filtered_docs=len(documents) - len(processed_docs),
    )

    return processed_docs


async def _process_sentence(*, sent: Span) -> str:
    """Process a sentence to remove stopwords and keep only meaningful content.

    Args:
        sent: spaCy sentence

    Returns:
        Processed text with stopwords removed
    """
    content_tokens = [
        token.text
        for token in sent
        if (
            token.pos_ in {"NOUN", "VERB", "ADJ", "ADV", "PROPN", "NUM"}
            or token.ent_type_
            or (token.is_alpha and token.is_title)
        )
    ]

    return " ".join(content_tokens)


def _is_boilerplate(text: str) -> bool:
    """Check if text contains boilerplate phrases.

    Args:
        text: Text to check

    Returns:
        True if text contains boilerplate phrases
    """
    text_lower = text.lower()
    return any(pattern in text_lower for pattern in BOILERPLATE_PATTERNS)


async def deduplicate_sentences(sentences: list[str]) -> list[str]:
    """Remove similar sentences efficiently using batch embedding.

    Args:
        sentences: List of sentences to deduplicate

    Returns:
        List of deduplicated sentences
    """
    if len(sentences) <= 1:
        return sentences

    model = get_embedding_model()

    emb_tensors = model.encode(sentences, convert_to_tensor=True)

    keep_indices = set(range(len(sentences)))
    removed = set()

    for i in range(len(sentences)):
        if i in removed:
            continue

        for j in range(i + 1, len(sentences)):
            if j in removed:
                continue

            tensor_i = emb_tensors[i] if isinstance(emb_tensors, list) else emb_tensors[i, :]
            tensor_j = emb_tensors[j] if isinstance(emb_tensors, list) else emb_tensors[j, :]

            similarity = util.pytorch_cos_sim(tensor_i, tensor_j).item()

            if similarity > SIMILARITY_THRESHOLD:
                words_i = [
                    w for w in sentences[i].split() if w.lower() not in ("the", "a", "an", "is", "are", "was", "were")
                ]
                words_j = [
                    w for w in sentences[j].split() if w.lower() not in ("the", "a", "an", "is", "are", "was", "were")
                ]

                unique_words_i = len({w.lower() for w in words_i})
                unique_words_j = len({w.lower() for w in words_j})

                info_density_i = unique_words_i / len(words_i) if words_i else 0
                info_density_j = unique_words_j / len(words_j) if words_j else 0

                if info_density_i >= info_density_j:
                    keep_indices.discard(j)
                    removed.add(j)
                else:
                    keep_indices.discard(i)
                    removed.add(i)
                    break

    return [sentences[i] for i in keep_indices]


async def apply_bm25_ranking(sentences: list[str], query: str) -> dict[str, float]:
    """Rank sentences using BM25 algorithm.

    Args:
        sentences: List of sentences to rank
        query: Query to rank against

    Returns:
        Dictionary mapping sentences to their BM25 scores
    """
    nlp = get_spacy_model()

    ranker = BM25Ranker(sentences, nlp)
    return ranker.rank(query, nlp)


async def apply_semantic_ranking(sentences: list[str], query: str) -> dict[str, float]:
    """Ranks sentences based on similarity to query, using batch encoding.

    Args:
        sentences: List of sentences to rank
        query: Query to rank against

    Returns:
        Dictionary mapping sentences to their semantic similarity scores
    """
    if not sentences:
        return {}

    model = get_embedding_model()

    query_tensor = model.encode(query, convert_to_tensor=True)
    sentence_tensors = model.encode(sentences, convert_to_tensor=True)

    if isinstance(sentence_tensors, list):
        similarities = [util.pytorch_cos_sim(query_tensor, sent_tensor).item() for sent_tensor in sentence_tensors]
    else:
        similarities = util.pytorch_cos_sim(query_tensor, sentence_tensors).squeeze().tolist()
        if not isinstance(similarities, list):
            similarities = [similarities]

    return {sentences[i]: similarities[i] for i in range(len(sentences))}


async def parse_documents(
    *, original_docs: list[DocumentDTO], sentence_infos: list[SentenceInfo], max_tokens: int, model: str
) -> list[str]:
    """Reconstructs readable, coherent documents from ranked sentences.

    Args:
        original_docs: The original documents
        sentence_infos: Sentences with relevance info sorted by relevance
        max_tokens: Maximum total token count
        model: The model to use for token counting

    Returns:
        List of processed document contents as strings
    """
    doc_contents: dict[int, list[str]] = {i: [] for i in range(len(original_docs))}
    token_count = 0

    for sent_info in sentence_infos:
        doc_idx = sent_info["doc_idx"]
        sentence = sent_info["text"]

        sentence_tokens = await count_tokens(text=sentence, model=model)

        if token_count + sentence_tokens > max_tokens:
            break

        doc_contents[doc_idx].append(sentence)
        token_count += sentence_tokens

    return [" ".join(sent_list).strip() for sent_list in doc_contents.values() if sent_list]
