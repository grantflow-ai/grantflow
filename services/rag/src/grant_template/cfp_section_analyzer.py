from pathlib import Path
from typing import Final, NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import CFPSectionAnalysis as CFPSectionAnalysisDB
from packages.db.src.tables import CFPAnalysis
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from services.rag.src.grant_template.nlp_categorizer import (
    NLPCategorizationResult,
    format_nlp_analysis_for_prompt,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

GEMINI_2_5_FLASH_MODEL: Final[str] = "gemini-2.5-flash"

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


class RequirementWithQuote(TypedDict):
    requirement: str
    quote_from_source: str
    category: str


class SectionRequirement(TypedDict):
    section_name: str
    definition: str
    requirements: list[RequirementWithQuote]
    dependencies: list[str]


class LengthConstraint(TypedDict):
    section_name: str
    measurement_type: str
    limit_description: str
    quote_from_source: str
    exclusions: list[str]


class EvaluationCriterion(TypedDict):
    criterion_name: str
    description: str
    weight_percentage: NotRequired[int | None]
    quote_from_source: str


class CFPSectionAnalysis(TypedDict):
    required_sections: list[SectionRequirement]
    length_constraints: list[LengthConstraint]
    evaluation_criteria: list[EvaluationCriterion]
    additional_requirements: list[RequirementWithQuote]
    sections_count: int
    length_constraints_found: int
    evaluation_criteria_count: int
    error: NotRequired[str | None]


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


def transform_analysis_for_database(analysis: CFPSectionAnalysis) -> CFPSectionAnalysisDB:
    return CFPSectionAnalysisDB(
        section_requirements=[
            {
                "section": section["section_name"],
                "requirements": [
                    {"requirement": req["requirement"], "quote": req["quote_from_source"]}
                    for req in section["requirements"]
                ],
            }
            for section in analysis["required_sections"]
        ],
        length_constraints=[
            {"description": lc["limit_description"], "quote": lc["quote_from_source"]}
            for lc in analysis["length_constraints"]
        ],
        evaluation_criteria=[
            {"criterion": ec["criterion_name"], "quote": ec["quote_from_source"]}
            for ec in analysis["evaluation_criteria"]
        ],
        additional_requirements=[
            {"requirement": ar["requirement"], "quote": ar["quote_from_source"]}
            for ar in analysis["additional_requirements"]
        ],
    )


async def save_cfp_analysis_to_database(
    session: AsyncSession,
    grant_template_id: UUID,
    analysis: CFPSectionAnalysis,
) -> None:
    logger.info(
        "Saving CFP analysis to database",
        grant_template_id=str(grant_template_id),
        sections_count=analysis["sections_count"],
        length_constraints=analysis["length_constraints_found"],
        evaluation_criteria=analysis["evaluation_criteria_count"],
    )

    db_analysis = transform_analysis_for_database(analysis)

    await session.execute(
        insert(CFPAnalysis).values(
            grant_template_id=grant_template_id,
            analysis_data=db_analysis,
        )
    )

    logger.info("CFP analysis saved successfully", grant_template_id=str(grant_template_id))


async def analyze_cfp_sections_with_gemini(
    cfp_content: str,
    nlp_analysis: NLPCategorizationResult,
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

    result = await handle_completions_request(
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

    logger.info(
        "CFP section analysis completed",
        sections_found=result["sections_count"],
        length_constraints=result["length_constraints_found"],
        evaluation_criteria=result["evaluation_criteria_count"],
        total_requirements=len(result["additional_requirements"]),
    )

    return result


async def generate_cfp_analysis_report(
    cfp_content: str,
    nlp_analysis: NLPCategorizationResult,
    output_file: str | None = None,
) -> str:
    analysis_result = await analyze_cfp_sections_with_gemini(cfp_content, nlp_analysis)

    report_header = f"""# CFP Analysis Report

**Generated**: {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Content Length**: {len(cfp_content):,} characters
**Sections Identified**: {analysis_result["sections_count"]}
**Length Constraints**: {analysis_result["length_constraints_found"]}
**Evaluation Criteria**: {analysis_result["evaluation_criteria_count"]}

---

"""

    markdown_analysis = """# Required Sections Analysis

"""

    for i, section in enumerate(analysis_result["required_sections"], 1):
        markdown_analysis += f"""## {i}. {section["section_name"]}
**Definition**: {section["definition"]}

**Requirements**:
"""
        for req in section["requirements"]:
            markdown_analysis += f"""- {req["requirement"]}
  > "{req["quote_from_source"]}" - ({req["category"]})

"""
        if section["dependencies"]:
            markdown_analysis += f"""**Dependencies**: {", ".join(section["dependencies"])}

"""
        markdown_analysis += "\n"

    if analysis_result["length_constraints"]:
        markdown_analysis += """# Length Requirements Analysis

"""
        for constraint in analysis_result["length_constraints"]:
            markdown_analysis += f"""## {constraint["section_name"]} Length Requirements
- **Measurement Type**: {constraint["measurement_type"]}
- **Limit**: {constraint["limit_description"]}
- **Source Quote**: "{constraint["quote_from_source"]}"
"""
            if constraint["exclusions"]:
                markdown_analysis += f"""- **Exclusions**: {", ".join(constraint["exclusions"])}
"""
            markdown_analysis += "\n"

    if analysis_result["evaluation_criteria"]:
        markdown_analysis += """# Evaluation Criteria Analysis

"""
        for criterion in analysis_result["evaluation_criteria"]:
            markdown_analysis += f"""## {criterion["criterion_name"]}
- **Description**: {criterion["description"]}
"""
            if weight := criterion.get("weight_percentage"):
                markdown_analysis += f"""- **Weight**: {weight}%
"""
            markdown_analysis += f"""- **Source Quote**: "{criterion["quote_from_source"]}"

"""

    if analysis_result["additional_requirements"]:
        markdown_analysis += """# Additional Requirements

"""
        by_category: dict[str, list[RequirementWithQuote]] = {}
        for req in analysis_result["additional_requirements"]:
            category = req["category"].title()
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(req)

        for category, reqs in by_category.items():
            markdown_analysis += f"""## {category} Requirements
"""
            for req in reqs:
                markdown_analysis += f"""- **{req["requirement"]}**
  > "{req["quote_from_source"]}"

"""

    full_report = report_header + markdown_analysis

    nlp_summary = """
---

## NLP Analysis Summary

The following semantic categories were identified in the CFP content:

"""

    categories_with_data = {k: len(v) for k, v in nlp_analysis.items() if v and isinstance(v, list)}
    for category, count in categories_with_data.items():
        nlp_summary += f"- **{category}**: {count} sentences\n"

    full_report += nlp_summary

    formatted_nlp = format_nlp_analysis_for_prompt(nlp_analysis)
    full_report += f"""
### Detailed NLP Categorization

```
{formatted_nlp}
```

---

*This analysis was generated using Gemini 2.5 Flash with NLP semantic preprocessing and structured JSON output.*
"""

    if output_file:
        output_path = Path(output_file)
        output_path.write_text(full_report, encoding="utf-8")
        logger.info("CFP analysis report saved", output_file=output_file)

    return full_report
