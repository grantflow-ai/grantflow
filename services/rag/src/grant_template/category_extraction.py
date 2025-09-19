import re
from collections import defaultdict
from typing import Any, Final, Literal, NotRequired, TypedDict

from packages.shared_utils.src.nlp import get_spacy_model
from packages.shared_utils.src.sync import run_sync


class CFPAnalysisRequirementWithQuote(TypedDict):
    requirement: str
    quote_from_source: str
    category: str


class CFPSectionRequirement(TypedDict):
    section_name: str
    definition: str
    requirements: list[CFPAnalysisRequirementWithQuote]
    dependencies: list[str]


class CFPSectionLengthConstraint(TypedDict):
    section_name: str
    measurement_type: str
    limit_description: str
    quote_from_source: str
    exclusions: list[str]


class CFPAnalysisEvaluationCriterion(TypedDict):
    criterion_name: str
    description: str
    weight_percentage: NotRequired[int | None]
    quote_from_source: str


class CategorizationAnalysisResult(TypedDict):
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


def _categorize_sentence(sentence: Any, text: str) -> dict[str, bool]:
    if len(text) < MIN_SENTENCE_CHARS:
        return {}

    text_lower = text.lower()
    token_texts = [token.text.lower() for token in sentence]

    has_money = any(symbol in text for symbol in MONEY_SYMBOLS) or any(
        keyword in text_lower for keyword in MONEY_KEYWORDS
    )
    has_date = any(ent.label_ in DATE_TIME_ENTITIES for ent in sentence.ents)
    has_order = any(token in ORDER_KEYWORDS for token in token_texts)
    has_negative = bool(NOT_DONE_REGEX.search(text))
    has_evaluation = any(token in EVALUATION_KEYWORDS for token in token_texts)
    has_writing = any(token in WRITING_KEYWORDS for token in token_texts)
    has_recommendation = any(token in RECOMMENDATION_KEYWORDS for token in token_texts)
    has_numbers = any(token.like_num for token in sentence)
    has_percentages = PERCENTAGE_SYMBOL in text

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


def _categorize_text_sync(text: str) -> CategorizationAnalysisResult:
    if not text or not text.strip():
        return CategorizationAnalysisResult(
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

    return CategorizationAnalysisResult(
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


async def categorize_text(text: str) -> CategorizationAnalysisResult:
    return await run_sync(_categorize_text_sync, text)


def _format_category_section(category: str, sentences: list[str]) -> list[str]:
    display_sentences = sentences[:MAX_DISPLAY_ITEMS]
    section_lines = [f"\n{category} ({len(sentences)}):"]

    for i, sentence in enumerate(display_sentences, 1):
        section_lines.append(f"{i}. {sentence}")

    if len(sentences) > MAX_DISPLAY_ITEMS:
        remaining = len(sentences) - MAX_DISPLAY_ITEMS
        section_lines.append(MORE_ITEMS_FORMAT.format(remaining=remaining))

    return section_lines


def format_nlp_analysis_for_prompt(analysis: CategorizationAnalysisResult) -> str:
    if not analysis or not any(sentences for sentences in analysis.values()):
        return NO_ANALYSIS_MESSAGE

    total_sentences = sum(len(sentences) for sentences in analysis.values())  # type: ignore[misc, arg-type]

    sections = [
        NLP_ANALYSIS_HEADER,
        TOTAL_SENTENCES_FORMAT.format(total_sentences=total_sentences),
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
