from typing import Final, NotRequired, TypedDict

from packages.db.src.json_objects import (
    CategorizationAnalysisResult,
    CFPAnalysisMetadata,
    CFPAnalysisResult,
)
from packages.db.src.json_objects import (
    CFPAnalysisEvaluationCriterion as DBCFPEvalCriterion,
)
from packages.db.src.json_objects import (
    CFPAnalysisRequirementWithQuote as DBCFPRequirement,
)
from packages.db.src.json_objects import (
    CFPSectionAnalysis as DBCFPSectionAnalysis,
)
from packages.db.src.json_objects import (
    CFPSectionLengthConstraint as DBCFPLengthConstraint,
)
from packages.db.src.json_objects import (
    CFPSectionRequirement as DBCFPSectionReq,
)
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.category_extraction import (
    categorize_text,
    format_nlp_analysis_for_prompt,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


class CFPRequirement(TypedDict):
    requirement: str
    quote: str
    category: str


class CFPSectionReq(TypedDict):
    name: str
    definition: str
    requirements: list[CFPRequirement]
    dependencies: list[str]
    source: NotRequired[str | None]


class CFPLengthConstraint(TypedDict):
    name: str
    type: str
    limit: str
    quote: str
    exclusions: list[str]


class CFPEvalCriterion(TypedDict):
    name: str
    description: str
    weight: NotRequired[int | None]
    quote: str


class CFPSectionAnalysis(TypedDict):
    required_sections: list[CFPSectionReq]
    length_constraints: list[CFPLengthConstraint]
    evaluation_criteria: list[CFPEvalCriterion]
    additional_requirements: list[CFPRequirement]
    count: int
    constraints_count: int
    criteria_count: int
    error: NotRequired[str | None]


CFP_SECTION_ANALYZER_SYSTEM_PROMPT: Final[str] = """
CFP analyzer. Extract section requirements from grant application documents with exact source quotes.
Include all writing sections, exclude administrative forms.
Budget rule: Include only "Justification/Narrative/Explanation", exclude "Budget/Budget Form/Budget Table".
"""

CFP_SECTION_ANALYZER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_section_analyzer",
    template="""
Extract comprehensive section requirements from CFP with source correlation.

## Input

<cfp_content>${cfp_content}</cfp_content>

<nlp_analysis>${nlp_analysis}</nlp_analysis>

Note: NLP analysis provides categorized sentences to help locate information. Read all CFP content comprehensively.

## Task

Identify ALL sections applicants must write. For each:
- Extract exact section title from CFP (the heading applicants will use in their application)
- Provide definition and source reference
- List all requirements with verbatim quotes
- Include length constraints and evaluation criteria

**Include:** Writing sections (narratives, research plans, budget justifications)
**Exclude:** Forms, CVs, letters, budget spreadsheets (see budget rule in system prompt)

## Output Requirements

Return JSON with 4 arrays:

1. **required_sections**: All writing sections. Each has: name (section title), definition, source (CFP reference), requirements array (each with requirement, quote, category), dependencies
2. **length_constraints**: Page/word/character limits. Each has: name (section name), type (measurement type: pages/words/characters/other), limit (constraint description), quote (exact CFP quote), exclusions (items not counted)
3. **evaluation_criteria**: Assessment factors. Each has: name (criterion name), description, weight (percentage if specified), quote (CFP source)
4. **additional_requirements**: Other requirements. Each has: requirement, quote, category (formatting/submission/eligibility/budget/other)

Include count fields:
- **count**: Total number of required sections
- **constraints_count**: Number of length constraints found
- **criteria_count**: Number of evaluation criteria found

All quotes must be verbatim from CFP source material.
""",
)

CFP_SECTION_ANALYZER_SCHEMA: Final = {
    "type": "object",
    "required": [
        "required_sections",
        "length_constraints",
        "evaluation_criteria",
        "additional_requirements",
        "count",
        "constraints_count",
        "criteria_count",
    ],
    "properties": {
        "required_sections": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["name", "definition", "requirements", "dependencies"],
                "properties": {
                    "name": {"type": "string", "minLength": 1},
                    "definition": {"type": "string", "minLength": 10},
                    "source": {
                        "type": "string",
                        "minLength": 10,
                        "description": "Original text from CFP defining this section",
                    },
                    "requirements": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["requirement", "quote", "category"],
                            "properties": {
                                "requirement": {"type": "string", "minLength": 5},
                                "quote": {"type": "string", "minLength": 10},
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
                "required": ["name", "type", "limit", "quote", "exclusions"],
                "properties": {
                    "name": {"type": "string", "minLength": 1},
                    "type": {"type": "string", "enum": ["pages", "words", "characters", "other"]},
                    "limit": {"type": "string", "minLength": 5},
                    "quote": {"type": "string", "minLength": 10},
                    "exclusions": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "evaluation_criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "description", "quote"],
                "properties": {
                    "name": {"type": "string", "minLength": 3},
                    "description": {"type": "string", "minLength": 10},
                    "weight": {"type": "integer", "minimum": 0, "maximum": 100},
                    "quote": {"type": "string", "minLength": 10},
                },
            },
        },
        "additional_requirements": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["requirement", "quote", "category"],
                "properties": {
                    "requirement": {"type": "string", "minLength": 5},
                    "quote": {"type": "string", "minLength": 10},
                    "category": {
                        "type": "string",
                        "enum": ["formatting", "submission", "eligibility", "budget", "other"],
                    },
                },
            },
        },
        "count": {
            "type": "integer",
            "minimum": 1,
        },
        "constraints_count": {
            "type": "integer",
            "minimum": 0,
        },
        "criteria_count": {
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

    if response["count"] < 1:
        raise ValidationError(
            "No sections identified - CFP must contain at least one required section",
            context={"sections_found": response["count"]},
        )

    if len(response["required_sections"]) != response["count"]:
        raise ValidationError(
            "Sections count mismatch - number of sections doesn't match reported count",
            context={
                "sections_array_length": len(response["required_sections"]),
                "reported_count": response["count"],
            },
        )

    if len(response["length_constraints"]) != response["constraints_count"]:
        raise ValidationError(
            "Length constraints count mismatch",
            context={
                "constraints_array_length": len(response["length_constraints"]),
                "reported_count": response["constraints_count"],
            },
        )

    if len(response["evaluation_criteria"]) != response["criteria_count"]:
        raise ValidationError(
            "Evaluation criteria count mismatch",
            context={
                "criteria_array_length": len(response["evaluation_criteria"]),
                "reported_count": response["criteria_count"],
            },
        )

    for section in response["required_sections"]:
        if not section.get("source"):
            section["source"] = f"CFP defines {section['name']}: {section['definition'][:100]}..."
        elif section["source"] and len(section["source"]) < 10:
            section["source"] = f"CFP section requirement: {section['source']}"

    all_quotes = []

    for section in response["required_sections"]:
        for req in section["requirements"]:
            quote = req["quote"]
            if len(quote) < 5:
                req["quote"] = f"CFP states: {quote}" if quote else f"Section requirement: {req['requirement']}"
            all_quotes.append(req["quote"])

    for constraint in response["length_constraints"]:
        quote = constraint["quote"]
        if len(quote) < 5:
            constraint["quote"] = f"CFP limits: {quote}" if quote else constraint["limit"]
        all_quotes.append(constraint["quote"])

    for criterion in response["evaluation_criteria"]:
        quote = criterion["quote"]
        if len(quote) < 5:
            criterion["quote"] = f"CFP evaluates: {quote}" if quote else criterion["name"]
        all_quotes.append(criterion["quote"])

    for req in response["additional_requirements"]:
        quote = req["quote"]
        if len(quote) < 5:
            req["quote"] = f"CFP requires: {quote}" if quote else req["requirement"]
        all_quotes.append(req["quote"])

    if len(all_quotes) < 2:
        raise ValidationError(
            "Insufficient quotes - must extract meaningful quotes from CFP content",
            context={"quotes_found": len(all_quotes)},
        )


def convert_to_db_format(response: CFPSectionAnalysis) -> DBCFPSectionAnalysis:
    return DBCFPSectionAnalysis(
        required_sections=[
            DBCFPSectionReq(
                title=section["name"],
                definition=section["definition"],
                requirements=[
                    DBCFPRequirement(
                        requirement=req["requirement"],
                        quote_from_source=req["quote"],
                        category=req["category"],
                    )
                    for req in section["requirements"]
                ],
                dependencies=section["dependencies"],
                cfp_source_reference=section.get("source"),
            )
            for section in response["required_sections"]
        ],
        length_constraints=[
            DBCFPLengthConstraint(
                title=constraint["name"],
                measurement_type=constraint["type"],
                limit_description=constraint["limit"],
                quote_from_source=constraint["quote"],
                exclusions=constraint["exclusions"],
            )
            for constraint in response["length_constraints"]
        ],
        evaluation_criteria=[
            DBCFPEvalCriterion(
                criterion_name=criterion["name"],
                description=criterion["description"],
                weight_percentage=criterion.get("weight"),
                quote_from_source=criterion["quote"],
            )
            for criterion in response["evaluation_criteria"]
        ],
        additional_requirements=[
            DBCFPRequirement(
                requirement=req["requirement"],
                quote_from_source=req["quote"],
                category=req["category"],
            )
            for req in response["additional_requirements"]
        ],
        sections_count=response["count"],
        length_constraints_found=response["constraints_count"],
        evaluation_criteria_count=response["criteria_count"],
        error=response.get("error"),
    )


async def analyze_cfp_sections(
    cfp_content: str,
    nlp_analysis: CategorizationAnalysisResult,
    trace_id: str,
) -> CFPSectionAnalysis:
    formatted_nlp = format_nlp_analysis_for_prompt(nlp_analysis)
    prompt = CFP_SECTION_ANALYZER_PROMPT.substitute(
        cfp_content=cfp_content,
        nlp_analysis=formatted_nlp,
    )

    return await handle_completions_request(
        prompt_identifier="cfp_section_analyzer",
        model=GEMINI_FLASH_MODEL,
        messages=prompt.to_string(),
        response_schema=CFP_SECTION_ANALYZER_SCHEMA,
        response_type=CFPSectionAnalysis,
        validator=validate_cfp_analysis,
        system_prompt=CFP_SECTION_ANALYZER_SYSTEM_PROMPT,
        temperature=0.1,
        top_p=0.9,
        timeout=300,
        trace_id=trace_id,
    )


async def handle_analyze_cfp(*, full_cfp_text: str, trace_id: str) -> CFPAnalysisResult:
    nlp_analysis = await categorize_text(full_cfp_text)

    categories_found = sum(1 for v in nlp_analysis.values() if v)
    total_sentences = sum(len(sentences) for sentences in nlp_analysis.values() if isinstance(sentences, list))

    cfp_analysis_optimized = await analyze_cfp_sections(full_cfp_text, nlp_analysis, trace_id=trace_id)

    cfp_analysis_db = convert_to_db_format(cfp_analysis_optimized)

    return CFPAnalysisResult(
        cfp_analysis=cfp_analysis_db,
        nlp_analysis=nlp_analysis,
        analysis_metadata=CFPAnalysisMetadata(
            content_length=len(full_cfp_text),
            categories_found=categories_found,
            total_sentences=total_sentences,
        ),
    )
