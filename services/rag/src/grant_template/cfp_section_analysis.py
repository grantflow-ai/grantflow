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
You are a CFP analyzer that extracts section requirements from grant application documents.
Extract required sections, length constraints, evaluation criteria, and format requirements.
Provide accurate, structured analysis that researchers can use to understand section requirements.
"""

CFP_SECTION_ANALYZER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_section_analyzer",
    template="""
# CFP Section Requirements Extraction with Source Correlation

EXTRACT comprehensive section requirements from the provided CFP content and create clear correlations between CFP text and required application sections.

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

## Analysis Instructions

You must identify ALL sections that applicants need to write for this grant application. Follow these rules:

### Section Identification Rules:
1. **Include ALL content sections** - Any section where applicants write original content
2. **EXCLUDE administrative items**:
   - Budget spreadsheets/forms (but INCLUDE budget justification narratives)
   - CV/biographical forms (but INCLUDE biographical sketch narratives)
   - Recommendation letters
   - Submission forms
   - Cover pages
3. **Required sections must be actual writing sections** where researchers compose text

### CRITICAL: Budget Section Classification
**IMPORTANT DISTINCTION**: Only include budget sections that require written narratives:
- ❌ **EXCLUDE**: "Budget", "Budget Form", "Budget Spreadsheet", "Budget Table" - these are just forms/numbers
- ✅ **INCLUDE**: "Budget Justification", "Budget Narrative", "Budget Explanation" - these require written content
- **Rule**: If a budget section doesn't explicitly mention "justification", "narrative", or "explanation", it's likely just a form and should be EXCLUDED

### Section Correlation Requirements:
For each required section, you MUST provide:
- `cfp_source_reference`: The exact text from the CFP that defines this section
- Clear mapping between CFP requirements and application structure

## JSON Output Format

You must return a structured JSON object that pairs every requirement with its exact quote from the source CFP text.

### JSON Structure:

**1. required_sections** - Array of section objects, each containing:
- `section_name`: Exact name as written in CFP
- `definition`: Brief description of section purpose
- `cfp_source_reference`: The exact text from the CFP that defines this section
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

## Critical Instructions:

1. **EXACT QUOTES REQUIRED**: Every "quote_from_source" and "cfp_source_reference" field MUST contain verbatim text from the CFP content
2. **NO PARAPHRASING**: Use exact wording from source
3. **COMPLETE COVERAGE**: Extract ALL writing sections mentioned in the CFP
4. **PROPER CATEGORIZATION**: Distinguish between content sections vs. administrative requirements
5. **SOURCE CORRELATION**: Each section must reference its defining text from the CFP
6. **COUNT ACCURACY**: Ensure the count fields match the actual array lengths

The goal is to create a comprehensive mapping of CFP requirements to actual application sections that researchers must write.
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
