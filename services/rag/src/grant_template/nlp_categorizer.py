import asyncio
import re
from collections import defaultdict
from typing import Any, Final, Literal, TypedDict

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model

logger = get_logger(__name__)


class NLPCategorizerStatus(TypedDict):
    spacy_model_loaded: bool
    supported_categories: list[str]


class NLPCategorizationResult(TypedDict):
    money: list[str]
    date_time: list[str]
    writing_related: list[str]
    other_numbers: list[str]
    recommendations: list[str]
    orders: list[str]
    positive_instructions: list[str]
    negative_instructions: list[str]
    evaluation_criteria: list[str]


CategoryKey = Literal[
    "money",
    "date_time",
    "writing_related",
    "other_numbers",
    "recommendations",
    "orders",
    "positive_instructions",
    "negative_instructions",
    "evaluation_criteria",
]


class NLPCategorizer:
    MONEY_CATEGORY: Final[str] = "money"
    DATE_TIME_CATEGORY: Final[str] = "date_time"
    WRITING_CATEGORY: Final[str] = "writing_related"
    OTHER_NUMBERS_CATEGORY: Final[str] = "other_numbers"
    RECOMMENDATIONS_CATEGORY: Final[str] = "recommendations"
    ORDERS_CATEGORY: Final[str] = "orders"
    POSITIVE_INSTRUCTIONS_CATEGORY: Final[str] = "positive_instructions"
    NEGATIVE_INSTRUCTIONS_CATEGORY: Final[str] = "negative_instructions"
    EVALUATION_CRITERIA_CATEGORY: Final[str] = "evaluation_criteria"

    MONEY_KEYWORDS: Final[set[str]] = {
        "budget",
        "cost",
        "funding",
        "fund",
        "dollar",
        "price",
        "fee",
        "amount",
        "total",
        "expenses",
        "expenditure",
        "financial",
        "money",
        "payment",
        "award",
        "grant",
        "salary",
        "wage",
        "compensation",
        "reimbursement",
        "allowance",
        "stipend",
        "overhead",
        "indirect",
        "direct",
        "costs",
        "expense",
    }

    MONEY_SYMBOLS: Final[set[str]] = {"$", "USD", "€", "£", "¥"}

    ORDER_KEYWORDS: Final[set[str]] = {
        "must",
        "required",
        "mandatory",
        "shall",
        "need",
        "necessary",
        "essential",
        "obligatory",
        "compulsory",
        "have to",
        "needs to",
        "requires",
        "demanding",
        "imperative",
        "vital",
        "crucial",
        "critical",
        "due",
        "submit",
        "provide",
        "include",
        "contain",
        "specify",
        "ensure",
        "verify",
        "demonstrate",
        "establish",
        "complete",
        "finish",
        "fulfill",
        "meet",
        "satisfy",
        "comply",
    }

    WRITING_KEYWORDS: Final[set[str]] = {
        "page",
        "pages",
        "word",
        "words",
        "paragraph",
        "section",
        "chapter",
        "document",
        "text",
        "write",
        "written",
        "writing",
        "essay",
        "report",
        "paper",
        "manuscript",
        "proposal",
        "application",
        "submission",
        "narrative",
        "description",
        "summary",
        "abstract",
        "introduction",
        "conclusion",
        "appendix",
        "attachment",
        "exhibit",
        "format",
        "formatting",
        "font",
        "margin",
        "spacing",
        "length",
        "limit",
        "maximum",
        "minimum",
        "exceed",
        "character",
        "characters",
        "line",
        "lines",
    }

    RECOMMENDATION_KEYWORDS: Final[set[str]] = {
        "recommend",
        "suggested",
        "encouraged",
        "advised",
        "should",
        "ought",
        "preferable",
        "desirable",
        "beneficial",
        "helpful",
        "useful",
        "valuable",
        "consider",
        "might",
        "could",
        "may want",
        "strongly",
        "highly",
        "best",
        "ideal",
        "optimal",
        "preferred",
        "recommended",
        "suggestion",
        "advice",
        "guidance",
        "tip",
        "hint",
        "please",
        "we suggest",
        "it is suggested",
    }

    EVALUATION_KEYWORDS: Final[set[str]] = {
        "evaluate",
        "evaluation",
        "assess",
        "assessment",
        "review",
        "reviewed",
        "criteria",
        "criterion",
        "judge",
        "judgment",
        "score",
        "scoring",
        "rating",
        "rank",
        "ranking",
        "grade",
        "grading",
        "merit",
        "quality",
        "excellence",
        "standard",
        "benchmark",
        "measure",
        "metric",
        "indicator",
        "factor",
        "consideration",
        "weigh",
        "weight",
        "importance",
        "priority",
        "value",
        "worth",
        "significance",
        "impact",
        "effectiveness",
        "performance",
        "success",
    }

    DATE_TIME_ENTITIES: Final[set[str]] = {"DATE", "TIME"}
    PERCENTAGE_SYMBOL: Final[str] = "%"
    MIN_SENTENCE_CHARS: Final[int] = 10

    MAX_DISPLAY_ITEMS: Final[int] = 10
    MORE_ITEMS_FORMAT: Final[str] = "   ... and {remaining} more"
    NLP_ANALYSIS_HEADER: Final[str] = "## NLP Analysis"
    TOTAL_SENTENCES_FORMAT: Final[str] = "Total: {total_sentences} categorized sentences"
    NO_ANALYSIS_MESSAGE: Final[str] = "No NLP analysis available - no categorized content found."

    NOT_DONE_REGEX: Final[re.Pattern[str]] = re.compile(
        r"\b(?:not|don't|do not|cannot|can't|must not|should not|shouldn't|will not|won't|never|no)\b", re.IGNORECASE
    )

    @classmethod
    def get_category_labels(cls) -> list[str]:
        return [
            cls.MONEY_CATEGORY,
            cls.DATE_TIME_CATEGORY,
            cls.WRITING_CATEGORY,
            cls.OTHER_NUMBERS_CATEGORY,
            cls.RECOMMENDATIONS_CATEGORY,
            cls.ORDERS_CATEGORY,
            cls.POSITIVE_INSTRUCTIONS_CATEGORY,
            cls.NEGATIVE_INSTRUCTIONS_CATEGORY,
            cls.EVALUATION_CRITERIA_CATEGORY,
        ]


CATEGORY_LABELS: Final[list[str]] = NLPCategorizer.get_category_labels()


def _is_number(token: Any) -> bool:
    return bool(token.like_num)


def _categorize_sentence(sentence: Any, text: str) -> dict[str, bool]:
    if len(text) < NLPCategorizer.MIN_SENTENCE_CHARS:
        return {}

    text_lower = text.lower()
    token_texts = [token.text.lower() for token in sentence]

    has_money = any(symbol in text for symbol in NLPCategorizer.MONEY_SYMBOLS) or any(
        keyword in text_lower for keyword in NLPCategorizer.MONEY_KEYWORDS
    )
    has_date = any(ent.label_ in NLPCategorizer.DATE_TIME_ENTITIES for ent in sentence.ents)
    has_order = any(token in NLPCategorizer.ORDER_KEYWORDS for token in token_texts)
    has_negative = bool(NLPCategorizer.NOT_DONE_REGEX.search(text))
    has_evaluation = any(token in NLPCategorizer.EVALUATION_KEYWORDS for token in token_texts)
    has_writing = any(token in NLPCategorizer.WRITING_KEYWORDS for token in token_texts)
    has_recommendation = any(token in NLPCategorizer.RECOMMENDATION_KEYWORDS for token in token_texts)
    has_numbers = any(_is_number(token) for token in sentence)
    has_percentages = NLPCategorizer.PERCENTAGE_SYMBOL in text

    categories = {}
    if has_money:
        categories["money"] = True
    if has_date:
        categories["date_time"] = True
    if has_writing:
        categories["writing_related"] = True
    if (has_numbers and not has_money) or has_percentages:
        categories["other_numbers"] = True
    if has_recommendation:
        categories["recommendations"] = True
    if has_order:
        categories["orders"] = True
    if has_order and not has_negative:
        categories["positive_instructions"] = True
    if has_negative:
        categories["negative_instructions"] = True
    if has_evaluation:
        categories["evaluation_criteria"] = True

    return categories


def _categorize_text_sync(text: str) -> NLPCategorizationResult:
    if not text or not text.strip():
        return NLPCategorizationResult(
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

    nlp = get_spacy_model()
    doc = nlp(text)
    buckets: defaultdict[CategoryKey, list[str]] = defaultdict(list)

    for sentence in doc.sents:
        sentence_text = sentence.text.strip()
        categories = _categorize_sentence(sentence, sentence_text)

        for category in categories:
            buckets[category].append(sentence_text)  # type: ignore[index]

    return NLPCategorizationResult(
        money=buckets["money"],
        date_time=buckets["date_time"],
        writing_related=buckets["writing_related"],
        other_numbers=buckets["other_numbers"],
        recommendations=buckets["recommendations"],
        orders=buckets["orders"],
        positive_instructions=buckets["positive_instructions"],
        negative_instructions=buckets["negative_instructions"],
        evaluation_criteria=buckets["evaluation_criteria"],
    )


def categorize_text(text: str) -> NLPCategorizationResult:
    return _categorize_text_sync(text)


async def categorize_text_async(text: str) -> NLPCategorizationResult:
    return await asyncio.to_thread(_categorize_text_sync, text)


def _format_category_section(category: str, sentences: list[str]) -> list[str]:
    display_sentences = sentences[: NLPCategorizer.MAX_DISPLAY_ITEMS]
    section_lines = [f"\n{category} ({len(sentences)}):"]

    for i, sentence in enumerate(display_sentences, 1):
        section_lines.append(f"{i}. {sentence}")

    if len(sentences) > NLPCategorizer.MAX_DISPLAY_ITEMS:
        remaining = len(sentences) - NLPCategorizer.MAX_DISPLAY_ITEMS
        section_lines.append(NLPCategorizer.MORE_ITEMS_FORMAT.format(remaining=remaining))

    return section_lines


def format_nlp_analysis_for_prompt(analysis: NLPCategorizationResult) -> str:
    if not analysis or (
        not analysis["money"]
        and not analysis["date_time"]
        and not analysis["writing_related"]
        and not analysis["other_numbers"]
        and not analysis["recommendations"]
        and not analysis["orders"]
        and not analysis["positive_instructions"]
        and not analysis["negative_instructions"]
        and not analysis["evaluation_criteria"]
    ):
        return NLPCategorizer.NO_ANALYSIS_MESSAGE

    total_sentences = (
        len(analysis["money"])
        + len(analysis["date_time"])
        + len(analysis["writing_related"])
        + len(analysis["other_numbers"])
        + len(analysis["recommendations"])
        + len(analysis["orders"])
        + len(analysis["positive_instructions"])
        + len(analysis["negative_instructions"])
        + len(analysis["evaluation_criteria"])
    )

    sections = [
        NLPCategorizer.NLP_ANALYSIS_HEADER,
        NLPCategorizer.TOTAL_SENTENCES_FORMAT.format(total_sentences=total_sentences),
    ]

    categories_to_check = [
        ("money", analysis["money"]),
        ("date_time", analysis["date_time"]),
        ("writing_related", analysis["writing_related"]),
        ("other_numbers", analysis["other_numbers"]),
        ("recommendations", analysis["recommendations"]),
        ("orders", analysis["orders"]),
        ("positive_instructions", analysis["positive_instructions"]),
        ("negative_instructions", analysis["negative_instructions"]),
        ("evaluation_criteria", analysis["evaluation_criteria"]),
    ]

    for category, sentences in categories_to_check:
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
