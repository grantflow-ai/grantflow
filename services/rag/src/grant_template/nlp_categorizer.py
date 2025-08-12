import asyncio
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Final

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model

logger = get_logger(__name__)

EXECUTOR_MAX_WORKERS: Final[int] = 3
MIN_SENTENCE_CHARS: Final[int] = 15
MAX_DISPLAY_ITEMS: Final[int] = 8

_executor = ThreadPoolExecutor(max_workers=EXECUTOR_MAX_WORKERS)

_NUM_REGEX: Final[re.Pattern[str]] = re.compile(r"^\d{1,3}(,\d{3})*(\.\d+)?$")
_NOT_DONE_REGEX: Final[re.Pattern[str]] = re.compile(
    r"\b(not|never|won['']t|cannot|can['']t|isn['']t|aren['']t|"
    r"wasn['']t|weren['']t|hasn['']t|haven['']t|hadn['']t|will not|without)\b",
    re.IGNORECASE,
)

MONEY_SYMBOLS: Final[set[str]] = {"$", "€", "£", "¥"}
ORDER_KEYWORDS: Final[set[str]] = {"must", "required", "shall", "please"}
EVALUATION_KEYWORDS: Final[set[str]] = {"evaluation", "assess", "criteria", "review", "score"}

CATEGORY_LABELS: Final[list[str]] = ["Money", "Date/Time", "Orders", "Evaluation Criteria", "Negative Instructions"]


def _is_number(token: Any) -> bool:
    return token.like_num or bool(_NUM_REGEX.match(token.text))


def _categorize_sentence(sentence: Any, buckets: dict[str, list[str]]) -> None:
    text = sentence.text.strip()

    if len(text) < MIN_SENTENCE_CHARS:
        return

    has_money = any(symbol in text for symbol in MONEY_SYMBOLS)
    has_date = any(ent.label_ in {"DATE", "TIME"} for ent in sentence.ents)
    has_order = any(token.text.lower() in ORDER_KEYWORDS for token in sentence)
    has_negative = bool(_NOT_DONE_REGEX.search(text))
    has_evaluation = any(token.text.lower() in EVALUATION_KEYWORDS for token in sentence)

    if has_money:
        buckets["Money"].append(text)
    if has_date:
        buckets["Date/Time"].append(text)
    if has_order:
        buckets["Orders"].append(text)
    if has_negative:
        buckets["Negative Instructions"].append(text)
    if has_evaluation:
        buckets["Evaluation Criteria"].append(text)


def _categorize_text_sync(text: str) -> dict[str, list[str]]:
    if not text or not text.strip():
        return {label: [] for label in CATEGORY_LABELS}

    try:
        nlp = get_spacy_model()
        doc = nlp(text)
        buckets: dict[str, list[str]] = defaultdict(list)

        for sentence in doc.sents:
            _categorize_sentence(sentence, buckets)

        return {label: buckets.get(label, []) for label in CATEGORY_LABELS}

    except Exception as e:
        logger.error("Error during NLP categorization", error=str(e))
        return {label: [] for label in CATEGORY_LABELS}


def categorize_text(text: str) -> dict[str, list[str]]:
    return _categorize_text_sync(text)


async def categorize_text_async(text: str) -> dict[str, list[str]]:
    if not text or not text.strip():
        return {label: [] for label in CATEGORY_LABELS}

    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_executor, _categorize_text_sync, text)
    except Exception as e:
        logger.error("Error in async NLP categorization", error=str(e))
        return {label: [] for label in CATEGORY_LABELS}


def format_nlp_analysis_for_prompt(analysis: dict[str, list[str]]) -> str:
    if not analysis or all(not sentences for sentences in analysis.values()):
        return "No NLP analysis available for this content."

    sections = ["## NLP Analysis"]
    total_sentences = sum(len(sentences) for sentences in analysis.values())
    sections.append(f"Total: {total_sentences} categorized sentences")

    for category in CATEGORY_LABELS:
        sentences = analysis.get(category, [])
        if sentences:
            display_sentences = sentences[:MAX_DISPLAY_ITEMS]
            sections.append(f"\n{category} ({len(sentences)}):")

            for i, sentence in enumerate(display_sentences, 1):
                sections.append(f"{i}. {sentence}")

            if len(sentences) > MAX_DISPLAY_ITEMS:
                sections.append(f"... and {len(sentences) - MAX_DISPLAY_ITEMS} more")

    return "\n".join(sections)


def get_nlp_categorizer_status() -> dict[str, Any]:
    try:
        nlp = get_spacy_model()
        model_loaded = nlp is not None
    except Exception:
        model_loaded = False

    return {
        "spacy_model_loaded": model_loaded,
        "executor_max_workers": EXECUTOR_MAX_WORKERS,
        "supported_categories": CATEGORY_LABELS,
    }
