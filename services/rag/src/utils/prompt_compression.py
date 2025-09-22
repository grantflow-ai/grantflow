import re
from functools import lru_cache
from typing import TYPE_CHECKING

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model
from packages.shared_utils.src.stopwords import ACADEMIC_STOP_WORDS

if TYPE_CHECKING:
    from spacy.tokens import Token

logger = get_logger(__name__)


def compress_whitespace(text: str) -> str:
    if not text.strip():
        return ""

    text = re.sub(r"\s+", " ", text)

    text = re.sub(r"\n{3,}", "\n\n", text)

    text = re.sub(r"\s*\.\s*\.", ".", text)
    text = re.sub(r"\s*,\s*,", ",", text)

    return text.strip()


def _should_keep_token(token: "Token", academic_stop_words: set[str]) -> bool:
    if token.is_stop or token.is_punct or token.is_space:
        return False

    if token.text.lower() in academic_stop_words:
        return False

    if token.ent_type_:
        return True

    if not token.is_alpha or ("-" in token.text and len(token.text) > 3):
        return True

    return len(token.text) > 2 and token.pos_ in {"NOUN", "VERB", "ADJ", "PROPN", "NUM"}


@lru_cache(maxsize=1000)
def remove_stop_words(text: str) -> str:
    if not text.strip():
        return ""

    nlp = get_spacy_model()
    doc = nlp(text)

    filtered_tokens = []
    tokens = list(doc)
    i = 0

    while i < len(tokens):
        token = tokens[i]

        if token.pos_ == "NUM" and i + 1 < len(tokens) and tokens[i + 1].text == "%" and not tokens[i + 1].is_space:
            filtered_tokens.append(token.text + "%")
            i += 2
            continue

        if _should_keep_token(token, ACADEMIC_STOP_WORDS):
            filtered_tokens.append(token.text)

        i += 1

    return " ".join(filtered_tokens)


def _split_into_sentences(text: str) -> list[str]:
    sentence_pattern = r"(?<!\d)\.(?=\s+[a-zA-Z])|(?<!\d)\.(?=\s*$)"
    sentences = re.split(sentence_pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def _find_duplicate_ngrams(words: list[str]) -> str | None:
    if len(words) < 10:
        return None

    for phrase_len in range(min(8, len(words) // 3), 2, -1):
        seen_phrases = {}

        for i in range(len(words) - phrase_len + 1):
            phrase = " ".join(words[i : i + phrase_len])
            phrase_normalized = phrase.lower()

            if phrase_normalized in seen_phrases:
                later_pos = i
                if later_pos + phrase_len >= len(words) - 2:
                    result_words = words[:later_pos]
                    return " ".join(result_words).strip()

            seen_phrases[phrase_normalized] = i

    return None


def compress_repetitive_phrases(text: str) -> str:
    if not text.strip():
        return ""

    sentences = _split_into_sentences(text)

    if len(sentences) > 1:
        seen_sentences = set()
        unique_sentences = []

        for sentence in sentences:
            sentence_clean = sentence.strip()
            sentence_key = " ".join(sentence_clean.lower().split())
            if sentence_key and sentence_key not in seen_sentences:
                seen_sentences.add(sentence_key)
                unique_sentences.append(sentence_clean)

        result = ". ".join(unique_sentences)
        if unique_sentences and not result.endswith("."):
            result += "."
        return result

    words = text.split()
    deduplicated = _find_duplicate_ngrams(words)
    return deduplicated or text


def compress_prompt_text(text: str, aggressive: bool = False) -> str:
    if not text.strip():
        return ""

    original_length = len(text)

    compressed = compress_whitespace(text)

    if aggressive and len(compressed.split()) > 30:
        compressed = remove_stop_words(compressed)

        compressed = compress_repetitive_phrases(compressed)
    else:
        compressed = compress_repetitive_phrases(compressed)

    if original_length > 0:
        reduction_percent = round((1 - len(compressed) / original_length) * 100, 1)
        logger.debug(
            "Compressed prompt text",
            original_length=original_length,
            compressed_length=len(compressed),
            reduction_percent=reduction_percent,
        )

    return compressed


def estimate_compression_ratio(text: str) -> float:
    if not text.strip():
        return 1.0

    words = text.split()
    word_count = len(words)
    unique_words = len({word.lower() for word in words})

    if word_count == 0:
        return 1.0

    repetition_ratio = unique_words / word_count

    return max(0.3, repetition_ratio)
