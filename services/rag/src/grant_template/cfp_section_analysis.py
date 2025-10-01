from typing import Final

from packages.db.src.json_objects import (
    CategorizationAnalysisResult,
    CFPAnalysisMetadata,
    CFPAnalysisResult,
    CFPSectionAnalysis,
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
- Extract exact section name from CFP
- Provide definition and source reference
- List all requirements with verbatim quotes
- Include length constraints and evaluation criteria

**Include:** Writing sections (narratives, research plans, budget justifications)
**Exclude:** Forms, CVs, letters, budget spreadsheets (see budget rule in system prompt)

## JSON Structure

Output format with 4 arrays:

1. **required_sections**: Section objects with name, definition, source reference, requirements array, dependencies
2. **length_constraints**: Page/word/character limits with exact quotes
3. **evaluation_criteria**: Assessment factors with weights and quotes
4. **additional_requirements**: Other requirements (formatting, submission, eligibility)

## Example

CFP excerpt:
```
II. APPLICATION COMPONENTS

A. Project Summary (1 page)
The project summary must provide a clear overview of the proposed research.
Applicants should describe the research objectives and broader impacts.

B. Research Plan (15 pages maximum, excluding references)
Describe the research methodology and expected outcomes.
```

Output:
```json
{
  "required_sections": [
    {
      "section_name": "PROJECT SUMMARY",
      "definition": "One-page overview of proposed research including objectives and impacts",
      "cfp_source_reference": "II.A. Project Summary (1 page) - The project summary must provide a clear overview of the proposed research.",
      "requirements": [
        {
          "requirement": "Describe research objectives",
          "quote_from_source": "Applicants should describe the research objectives",
          "category": "content"
        },
        {
          "requirement": "Describe broader impacts",
          "quote_from_source": "Applicants should describe the research objectives and broader impacts",
          "category": "impact"
        }
      ],
      "dependencies": []
    },
    {
      "section_name": "RESEARCH PLAN",
      "definition": "Detailed description of research methodology and expected outcomes",
      "cfp_source_reference": "II.B. Research Plan (15 pages maximum, excluding references)",
      "requirements": [
        {
          "requirement": "Describe research methodology",
          "quote_from_source": "Describe the research methodology",
          "category": "methodology"
        },
        {
          "requirement": "Describe expected outcomes",
          "quote_from_source": "Describe the research methodology and expected outcomes",
          "category": "outcomes"
        }
      ],
      "dependencies": ["PROJECT SUMMARY"]
    }
  ],
  "length_constraints": [
    {
      "section_name": "PROJECT SUMMARY",
      "measurement_type": "pages",
      "limit_description": "1 page maximum",
      "quote_from_source": "Project Summary (1 page)",
      "exclusions": []
    },
    {
      "section_name": "RESEARCH PLAN",
      "measurement_type": "pages",
      "limit_description": "15 pages maximum",
      "quote_from_source": "15 pages maximum, excluding references",
      "exclusions": ["references"]
    }
  ],
  "evaluation_criteria": [],
  "additional_requirements": []
}
```

Return complete analysis following this pattern with exact quotes from CFP.
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
                    "cfp_source_reference": {
                        "type": "string",
                        "minLength": 10,
                        "description": "Original text from CFP that defines this section",
                    },
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

    for section in response["required_sections"]:
        if not section.get("cfp_source_reference"):
            section["cfp_source_reference"] = f"CFP defines {section['section_name']}: {section['definition'][:100]}..."
        elif section["cfp_source_reference"] and len(section["cfp_source_reference"]) < 10:
            section["cfp_source_reference"] = f"CFP section requirement: {section['cfp_source_reference']}"

    all_quotes = []

    for section in response["required_sections"]:
        for req in section["requirements"]:
            quote = req["quote_from_source"]
            if len(quote) < 5:
                req["quote_from_source"] = (
                    f"CFP states: {quote}" if quote else f"Section requirement: {req['requirement']}"
                )
            all_quotes.append(req["quote_from_source"])

    for constraint in response["length_constraints"]:
        quote = constraint["quote_from_source"]
        if len(quote) < 5:
            constraint["quote_from_source"] = f"CFP limits: {quote}" if quote else constraint["limit_description"]
        all_quotes.append(constraint["quote_from_source"])

    for criterion in response["evaluation_criteria"]:
        quote = criterion["quote_from_source"]
        if len(quote) < 5:
            criterion["quote_from_source"] = f"CFP evaluates: {quote}" if quote else criterion["criterion_name"]
        all_quotes.append(criterion["quote_from_source"])

    for req in response["additional_requirements"]:
        quote = req["quote_from_source"]
        if len(quote) < 5:
            req["quote_from_source"] = f"CFP requires: {quote}" if quote else req["requirement"]
        all_quotes.append(req["quote_from_source"])

    if len(all_quotes) < 2:
        raise ValidationError(
            "Insufficient quotes - must extract meaningful quotes from CFP content",
            context={"quotes_found": len(all_quotes)},
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

    cfp_analysis = await analyze_cfp_sections(full_cfp_text, nlp_analysis, trace_id=trace_id)

    return CFPAnalysisResult(
        cfp_analysis=cfp_analysis,
        nlp_analysis=nlp_analysis,
        analysis_metadata=CFPAnalysisMetadata(
            content_length=len(full_cfp_text),
            categories_found=categories_found,
            total_sentences=total_sentences,
        ),
    )
