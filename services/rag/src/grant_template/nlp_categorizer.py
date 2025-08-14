import re
from collections import defaultdict
from typing import Any, Final, TypedDict

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model

logger = get_logger(__name__)

MIN_SENTENCE_CHARS: Final[int] = 15
MAX_DISPLAY_ITEMS: Final[int] = 8

_NOT_DONE_REGEX: Final[re.Pattern[str]] = re.compile(
    r"\b(not|never|won['']t|cannot|can['']t|isn['']t|aren['']t|"
    r"wasn['']t|weren['']t|hasn['']t|haven['']t|hadn['']t|will not|without|"
    r"no more than|exceeding|prior approval|restrictions?|prohibited|forbidden)\b",
    re.IGNORECASE,
)

MONEY_SYMBOLS: Final[set[str]] = {"$", "€", "£", "¥"}
MONEY_KEYWORDS: Final[set[str]] = {
    "salary",
    "support",
    "compensation",
    "budget",
    "cost",
    "costs",
    "funding",
    "expenses",
    "travel",
}
ORDER_KEYWORDS: Final[set[str]] = {
    "must",
    "required",
    "shall",
    "please",
    "require",
    "need",
    "eligible",
    "submit",
    "include",
    "provide",
    "mandatory",
    "necessary",
    "needs",
    "requires",
    "expects",
    "demands",
    "stipulates",
}
EVALUATION_KEYWORDS: Final[set[str]] = {
    "evaluation",
    "assess",
    "criteria",
    "review",
    "score",
    "evaluated",
    "merit",
    "technical",
    "qualifications",
    "adequacy",
    "excellence",
    "priorities",
    "based",
    "recommendations",
    "funding",
}
WRITING_KEYWORDS: Final[set[str]] = {"pages", "words", "page", "word", "limit", "maximum", "exceed"}
RECOMMENDATION_KEYWORDS: Final[set[str]] = {
    "recommend",
    "encourage",
    "suggest",
    "should",
    "advised",
    "strongly",
    "may",
    "included",
    "optional",
    "encouraged",
    "recommended",
    "preferred",
    "ideal",
    "consider",
    "desirable",
}

# spaCy entity types and symbols
DATE_TIME_ENTITIES: Final[set[str]] = {"DATE", "TIME"}
PERCENTAGE_SYMBOL: Final[str] = "%"

# Category name constants
MONEY_CATEGORY: Final[str] = "money"
DATE_TIME_CATEGORY: Final[str] = "date_time"
WRITING_CATEGORY: Final[str] = "writing_related"
OTHER_NUMBERS_CATEGORY: Final[str] = "other_numbers"
RECOMMENDATIONS_CATEGORY: Final[str] = "recommendations"
ORDERS_CATEGORY: Final[str] = "orders"
POSITIVE_INSTRUCTIONS_CATEGORY: Final[str] = "positive_instructions"
NEGATIVE_INSTRUCTIONS_CATEGORY: Final[str] = "negative_instructions"
EVALUATION_CRITERIA_CATEGORY: Final[str] = "evaluation_criteria"

# Format strings and messages
NO_ANALYSIS_MESSAGE: Final[str] = "No NLP analysis available for this content."
NLP_ANALYSIS_HEADER: Final[str] = "## NLP Analysis"
TOTAL_SENTENCES_FORMAT: Final[str] = "Total: {total_sentences} categorized sentences"
MORE_ITEMS_FORMAT: Final[str] = "... and {remaining} more"

# Status keys
STATUS_MODEL_LOADED_KEY: Final[str] = "spacy_model_loaded"
STATUS_CATEGORIES_KEY: Final[str] = "supported_categories"


class NLPCategorizerStatus(TypedDict):
    spacy_model_loaded: bool
    supported_categories: list[str]


# Type alias for categorization results - using dict since keys contain spaces/hyphens
NLPCategorizationResult = dict[str, list[str]]


CATEGORY_LABELS: Final[list[str]] = [
    MONEY_CATEGORY,
    DATE_TIME_CATEGORY,
    WRITING_CATEGORY,
    OTHER_NUMBERS_CATEGORY,
    RECOMMENDATIONS_CATEGORY,
    ORDERS_CATEGORY,
    POSITIVE_INSTRUCTIONS_CATEGORY,
    NEGATIVE_INSTRUCTIONS_CATEGORY,
    EVALUATION_CRITERIA_CATEGORY,
]


def _is_number(token: Any) -> bool:
    return bool(token.like_num)


def _compute_sentence_flags(sentence: Any, text: str, text_lower: str) -> dict[str, bool]:
    """Compute all categorization flags for a sentence in single pass."""
    has_money = any(symbol in text for symbol in MONEY_SYMBOLS) or any(
        keyword in text_lower for keyword in MONEY_KEYWORDS
    )
    has_date = any(ent.label_ in DATE_TIME_ENTITIES for ent in sentence.ents)
    has_negative = bool(_NOT_DONE_REGEX.search(text))
    has_percentages = PERCENTAGE_SYMBOL in text
    has_numbers = any(_is_number(token) for token in sentence)

    # Single pass through tokens for keyword matching
    has_order = False
    has_evaluation = False
    has_writing = False
    has_recommendation = False

    for token in sentence:
        token_lower = token.text.lower()
        if not has_order and token_lower in ORDER_KEYWORDS:
            has_order = True
        if not has_evaluation and token_lower in EVALUATION_KEYWORDS:
            has_evaluation = True
        if not has_writing and token_lower in WRITING_KEYWORDS:
            has_writing = True
        if not has_recommendation and token_lower in RECOMMENDATION_KEYWORDS:
            has_recommendation = True

        # Early exit if all flags found
        if has_order and has_evaluation and has_writing and has_recommendation:
            break

    return {
        "has_money": has_money,
        "has_date": has_date,
        "has_order": has_order,
        "has_negative": has_negative,
        "has_evaluation": has_evaluation,
        "has_writing": has_writing,
        "has_recommendation": has_recommendation,
        "has_numbers": has_numbers,
        "has_percentages": has_percentages,
    }


def _categorize_sentence(sentence: Any, buckets: dict[str, list[str]]) -> None:
    text = sentence.text.strip()

    if len(text) < MIN_SENTENCE_CHARS:
        return

    # Single computation of expensive operations
    text_lower = text.lower()

    # Compute all flags in optimized single pass
    flags = _compute_sentence_flags(sentence, text, text_lower)

    # Apply categorization rules (identical logic, same functionality)
    if flags["has_money"]:
        buckets[MONEY_CATEGORY].append(text)
    if flags["has_date"]:
        buckets[DATE_TIME_CATEGORY].append(text)
    if flags["has_writing"]:
        buckets[WRITING_CATEGORY].append(text)
    if (flags["has_numbers"] and not flags["has_money"]) or flags["has_percentages"]:
        buckets[OTHER_NUMBERS_CATEGORY].append(text)
    if flags["has_recommendation"]:
        buckets[RECOMMENDATIONS_CATEGORY].append(text)
    if flags["has_order"]:
        buckets[ORDERS_CATEGORY].append(text)
    if flags["has_order"] and not flags["has_negative"]:
        buckets[POSITIVE_INSTRUCTIONS_CATEGORY].append(text)
    if flags["has_negative"]:
        buckets[NEGATIVE_INSTRUCTIONS_CATEGORY].append(text)
    if flags["has_evaluation"]:
        buckets[EVALUATION_CRITERIA_CATEGORY].append(text)


def _categorize_text_sync(text: str) -> NLPCategorizationResult:
    if not text or not text.strip():
        return {label: [] for label in CATEGORY_LABELS}

    nlp = get_spacy_model()
    doc = nlp(text)
    buckets: dict[str, list[str]] = defaultdict(list)

    for sentence in doc.sents:
        _categorize_sentence(sentence, buckets)

    return {label: buckets.get(label, []) for label in CATEGORY_LABELS}


def categorize_text(text: str) -> NLPCategorizationResult:
    return _categorize_text_sync(text)


async def categorize_text_async(text: str) -> NLPCategorizationResult:
    return categorize_text(text)


def _format_category_section(category: str, sentences: list[str]) -> list[str]:
    """Format a single category section for NLP analysis output."""
    display_sentences = sentences[:MAX_DISPLAY_ITEMS]
    section_lines = [f"\n{category} ({len(sentences)}):"]

    for i, sentence in enumerate(display_sentences, 1):
        section_lines.append(f"{i}. {sentence}")

    if len(sentences) > MAX_DISPLAY_ITEMS:
        remaining = len(sentences) - MAX_DISPLAY_ITEMS
        section_lines.append(MORE_ITEMS_FORMAT.format(remaining=remaining))

    return section_lines


def format_nlp_analysis_for_prompt(analysis: NLPCategorizationResult) -> str:
    if not analysis or all(not sentences for sentences in analysis.values()):
        return NO_ANALYSIS_MESSAGE

    # Pre-compute total sentences once
    total_sentences = sum(len(sentences) for sentences in analysis.values())

    # Build header efficiently
    sections = [NLP_ANALYSIS_HEADER, TOTAL_SENTENCES_FORMAT.format(total_sentences=total_sentences)]

    # Use helper function to eliminate nested loops
    for category in CATEGORY_LABELS:
        sentences = analysis.get(category, [])
        if sentences:
            sections.extend(_format_category_section(category, sentences))

    return "\n".join(sections)


def get_nlp_categorizer_status() -> NLPCategorizerStatus:
    nlp = get_spacy_model()
    model_loaded = nlp is not None

    return {
        "spacy_model_loaded": model_loaded,
        "supported_categories": CATEGORY_LABELS,
    }
