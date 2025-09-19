import re
from collections import defaultdict
from typing import Any, Final, Literal, NotRequired, TypedDict

from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model
from packages.shared_utils.src.sync import run_sync

from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

GEMINI_2_5_FLASH_MODEL: Final[str] = "gemini-2.5-flash"


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


class CFPSectionAnalysis(TypedDict):
    required_sections: list[CFPSectionRequirement]
    length_constraints: list[CFPSectionLengthConstraint]
    evaluation_criteria: list[CFPAnalysisEvaluationCriterion]
    additional_requirements: list[CFPAnalysisRequirementWithQuote]
    sections_count: int
    length_constraints_found: int
    evaluation_criteria_count: int
    error: NotRequired[str | None]


class NLPCategorizerStatus(TypedDict):
    spacy_model_loaded: bool
    supported_categories: list[str]


class CFPCategorizationAnalysis(TypedDict):
    money: list[str]
    date_time: list[str]
    writing_related: list[str]
    other_numbers: list[str]
    recommendations: list[str]
    orders: list[str]
    positive_instructions: list[str]
    negative_instructions: list[str]
    evaluation_criteria: list[str]


class CFPAnalysisMetadata(TypedDict):
    content_length: int
    categories_found: int
    total_sentences: int


class CFPAnalysisResult(TypedDict):
    cfp_analysis: CFPSectionAnalysis
    nlp_analysis: CFPCategorizationAnalysis
    analysis_metadata: CFPAnalysisMetadata


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


def _categorize_text_sync(text: str) -> CFPCategorizationAnalysis:
    if not text or not text.strip():
        return CFPCategorizationAnalysis(
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

    return CFPCategorizationAnalysis(
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


async def categorize_text(text: str) -> CFPCategorizationAnalysis:
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


def format_nlp_analysis_for_prompt(analysis: CFPCategorizationAnalysis) -> str:
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


CFP_SECTION_ANALYZER_SYSTEM_PROMPT: Final[str] = """
You are a specialized CFP (Call for Proposals) analyzer that extracts comprehensive section requirements
from grant application documents. Your expertise includes identifying:

1. Required sections with clear names and detailed definitions
2. Length constraints (pages, words, characters) with specific measurement units
3. Evaluation criteria and scoring rubrics
4. Format requirements and submission guidelines

You must provide accurate, structured analysis in markdown format that researchers can use
to understand exactly what each section requires.
"""

CFP_SECTION_ANALYZER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_section_analyzer",
    template="""
# CFP Section Requirements Extraction - Structured JSON Output

EXTRACT comprehensive section requirements from the provided CFP content using NLP analysis as supplemental guidance.

## CFP Content
<cfp_content>
${cfp_content}
</cfp_content>

## NLP Analysis Context
USE NLP ANALYSIS AS SUPPLEMENTAL GUIDANCE:
The following semantic categorization identifies key information categories with actual quotes from the CFP:

<nlp_analysis>
${nlp_analysis}
</nlp_analysis>

IMPORTANT: You must still read and analyze ALL CFP content comprehensively. The NLP analysis provides categorized sentences that help identify where to find specific information types.

## JSON Output Format Explanation

You must return a structured JSON object that pairs every requirement with its exact quote from the source CFP text. This creates a comprehensive database of requirements with verifiable evidence.

### JSON Structure Breakdown:

**1. required_sections** - Array of section objects, each containing:
- `section_name`: Exact name as written in CFP
- `definition`: Brief description of section purpose
- `requirements`: Array of requirement objects with quote pairs
- `dependencies`: Array of section interdependencies

**2. length_constraints** - Array of length limit objects:
- `section_name`: Which section this applies to
- `measurement_type`: "pages", "words", "characters", or "other"
- `limit_description`: Human readable limit (e.g. "15 pages maximum")
- `quote_from_source`: Exact text from CFP stating the limit
- `exclusions`: Array of items not counted toward limit

**3. evaluation_criteria** - Array of assessment criteria:
- `criterion_name`: Name of evaluation factor
- `description`: What this criterion evaluates
- `weight_percentage`: Numeric percentage if specified (optional)
- `quote_from_source`: Exact CFP text mentioning this criterion

**4. additional_requirements** - Array of other important requirements:
- `requirement`: Brief description of what's required
- `quote_from_source`: Exact CFP text stating this requirement
- `category`: Type - "formatting", "submission", "eligibility", "budget", "other"

### Required JSON Output Structure:
```json
{
  "required_sections": [
    {
      "section_name": "Project Summary",
      "definition": "Executive overview of research objectives",
      "requirements": [
        {
          "requirement": "Must provide comprehensive project overview",
          "quote_from_source": "Project Summary (1 page maximum) - Executive overview of research objectives",
          "category": "content"
        }
      ],
      "dependencies": []
    }
  ],
  "length_constraints": [
    {
      "section_name": "Project Summary",
      "measurement_type": "pages",
      "limit_description": "1 page maximum",
      "quote_from_source": "Project Summary (1 page maximum)",
      "exclusions": []
    }
  ],
  "evaluation_criteria": [
    {
      "criterion_name": "Intellectual Merit",
      "description": "Scientific advancement potential and methodological rigor",
      "weight_percentage": 60,
      "quote_from_source": "intellectual merit (60%)"
    }
  ],
  "additional_requirements": [
    {
      "requirement": "Font and margin specifications",
      "quote_from_source": "All text must be in 11-point Times New Roman font with 1-inch margins",
      "category": "formatting"
    }
  ],
  "sections_count": 1,
  "length_constraints_found": 1,
  "evaluation_criteria_count": 1
}
```

## Critical Instructions:

1. **EXACT QUOTES REQUIRED**: Every "quote_from_source" field MUST contain verbatim text from the CFP content
2. **NO PARAPHRASING**: Use the exact wording from the source - do not rephrase or summarize
3. **COMPLETE COVERAGE**: Extract ALL sections, constraints, and criteria mentioned in the CFP
4. **PROPER CATEGORIZATION**: Use appropriate categories for requirements (content, formatting, submission, eligibility, budget, other)
5. **COUNT ACCURACY**: Ensure the count fields match the actual array lengths
6. **MEANINGFUL QUOTES**: Each quote must be at least 10 characters and provide clear evidence

The goal is to create a structured database where every requirement is backed by verifiable quotes from the source CFP text.
""",
)


CFP_SECTION_ANALYZER_SCHEMA: Final = {
    "type": "object",
    "required": [
        "required_sections",
        "length_constraints",
        "evaluation_criteria",
        "additional_requirements",
        "sections_count",
        "length_constraints_found",
        "evaluation_criteria_count",
    ],
    "properties": {
        "required_sections": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["section_name", "definition", "requirements", "dependencies"],
                "properties": {
                    "section_name": {"type": "string", "minLength": 1},
                    "definition": {"type": "string", "minLength": 10},
                    "requirements": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["requirement", "quote_from_source", "category"],
                            "properties": {
                                "requirement": {"type": "string", "minLength": 5},
                                "quote_from_source": {"type": "string", "minLength": 10},
                                "category": {"type": "string", "minLength": 3},
                            },
                        },
                    },
                    "dependencies": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "length_constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "section_name",
                    "measurement_type",
                    "limit_description",
                    "quote_from_source",
                    "exclusions",
                ],
                "properties": {
                    "section_name": {"type": "string", "minLength": 1},
                    "measurement_type": {"type": "string", "enum": ["pages", "words", "characters", "other"]},
                    "limit_description": {"type": "string", "minLength": 5},
                    "quote_from_source": {"type": "string", "minLength": 10},
                    "exclusions": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "evaluation_criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["criterion_name", "description", "quote_from_source"],
                "properties": {
                    "criterion_name": {"type": "string", "minLength": 3},
                    "description": {"type": "string", "minLength": 10},
                    "weight_percentage": {"type": "integer", "minimum": 0, "maximum": 100},
                    "quote_from_source": {"type": "string", "minLength": 10},
                },
            },
        },
        "additional_requirements": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["requirement", "quote_from_source", "category"],
                "properties": {
                    "requirement": {"type": "string", "minLength": 5},
                    "quote_from_source": {"type": "string", "minLength": 10},
                    "category": {
                        "type": "string",
                        "enum": ["formatting", "submission", "eligibility", "budget", "other"],
                    },
                },
            },
        },
        "sections_count": {
            "type": "integer",
            "minimum": 1,
        },
        "length_constraints_found": {
            "type": "integer",
            "minimum": 0,
        },
        "evaluation_criteria_count": {
            "type": "integer",
            "minimum": 0,
        },
        "error": {
            "type": "string",
            "nullable": True,
        },
    },
}


def validate_cfp_analysis(response: CFPSectionAnalysis) -> None:
    if error := response.get("error"):
        raise ValidationError(f"CFP analysis failed: {error}")

    if response["sections_count"] < 1:
        raise ValidationError(
            "No sections identified - CFP must contain at least one required section",
            context={"sections_found": response["sections_count"]},
        )

    if len(response["required_sections"]) != response["sections_count"]:
        raise ValidationError(
            "Sections count mismatch - number of sections doesn't match reported count",
            context={
                "sections_array_length": len(response["required_sections"]),
                "reported_count": response["sections_count"],
            },
        )

    if len(response["length_constraints"]) != response["length_constraints_found"]:
        raise ValidationError(
            "Length constraints count mismatch",
            context={
                "constraints_array_length": len(response["length_constraints"]),
                "reported_count": response["length_constraints_found"],
            },
        )

    if len(response["evaluation_criteria"]) != response["evaluation_criteria_count"]:
        raise ValidationError(
            "Evaluation criteria count mismatch",
            context={
                "criteria_array_length": len(response["evaluation_criteria"]),
                "reported_count": response["evaluation_criteria_count"],
            },
        )

    all_quotes = []

    for section in response["required_sections"]:
        for req in section["requirements"]:
            quote = req["quote_from_source"]
            if len(quote) < 10:
                raise ValidationError("Quote too brief - must be meaningful quote from source")
            all_quotes.append(quote)

    for constraint in response["length_constraints"]:
        quote = constraint["quote_from_source"]
        if len(quote) < 10:
            raise ValidationError("Quote too brief - must be meaningful quote from source")
        all_quotes.append(quote)

    for criterion in response["evaluation_criteria"]:
        quote = criterion["quote_from_source"]
        if len(quote) < 10:
            raise ValidationError("Quote too brief - must be meaningful quote from source")
        all_quotes.append(quote)

    for req in response["additional_requirements"]:
        quote = req["quote_from_source"]
        if len(quote) < 10:
            raise ValidationError("Quote too brief - must be meaningful quote from source")
        all_quotes.append(quote)

    if len(all_quotes) < 3:
        raise ValidationError(
            "Insufficient quotes - must extract meaningful quotes from CFP content",
            context={"quotes_found": len(all_quotes)},
        )


async def analyze_cfp_sections(
    cfp_content: str,
    nlp_analysis: CFPCategorizationAnalysis,
) -> CFPSectionAnalysis:
    logger.info(
        "Starting CFP section analysis with Gemini 2.5 Flash",
        content_length=len(cfp_content),
        nlp_categories_found=len([k for k, v in nlp_analysis.items() if v]),
    )

    formatted_nlp = format_nlp_analysis_for_prompt(nlp_analysis)
    prompt = CFP_SECTION_ANALYZER_PROMPT.substitute(
        cfp_content=cfp_content,
        nlp_analysis=formatted_nlp,
    )

    return await handle_completions_request(
        prompt_identifier="cfp_section_analyzer",
        model=GEMINI_2_5_FLASH_MODEL,
        messages=prompt.to_string(),
        response_schema=CFP_SECTION_ANALYZER_SCHEMA,
        response_type=CFPSectionAnalysis,
        validator=validate_cfp_analysis,
        system_prompt=CFP_SECTION_ANALYZER_SYSTEM_PROMPT,
        temperature=0.1,
        top_p=0.9,
    )


async def handle_analyze_cfp(*, full_cfp_text: str) -> CFPAnalysisResult:
    logger.info("Starting NLP analysis for CFP content", content_length=len(full_cfp_text))
    nlp_analysis = await categorize_text(full_cfp_text)

    categories_found = sum(1 for v in nlp_analysis.values() if v)
    total_sentences = sum(len(sentences) for sentences in nlp_analysis.values() if isinstance(sentences, list))

    logger.info(
        "NLP analysis completed",
        categories_found=categories_found,
        total_sentences=total_sentences,
    )

    logger.info("Starting enhanced CFP analysis with Gemini 2.5 Flash")
    cfp_analysis = await analyze_cfp_sections(full_cfp_text, nlp_analysis)

    return CFPAnalysisResult(
        cfp_analysis=cfp_analysis,
        nlp_analysis=nlp_analysis,
        analysis_metadata=CFPAnalysisMetadata(
            content_length=len(full_cfp_text),
            categories_found=categories_found,
            total_sentences=total_sentences,
        ),
    )
