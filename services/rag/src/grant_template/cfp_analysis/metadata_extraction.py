import re
from typing import Final, TypedDict

from packages.db.src.json_objects import LengthConstraint, OrganizationNamespace
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.cfp_analysis.identify_organization import identify_granting_institution
from services.rag.src.grant_template.utils.category_extraction import (
    CategorizationAnalysisResult,
    format_nlp_hints_for_extraction,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

_NIH_ACTIVITY_PREFIXES: Final[frozenset[str]] = frozenset(
    {
        "R",
        "P",
        "U",
        "K",
        "F",
        "T",
        "D",
        "C",
        "G",
        "H",
        "S",
        "M",
        "I",
        "L",
        "Y",
        "X",
        "Z",
        "E",
        "N",
        "O",
        "B",
    }
)
_ACTIVITY_CODE_PATTERN: Final[re.Pattern[str]] = re.compile(r"\b([A-Z]{1,2}\d{2})\b")

CFP_METADATA_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Extract key metadata including granting organization, submission deadline, and subject summary."
)

CFP_METADATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_metadata",
    template="""# CFP Metadata Extraction

## Sources
<rag_sources>${rag_sources}</rag_sources>

## Organizations
<organizations>${organizations}</organizations>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Task

Extract metadata from CFP.

### Fields
1. **org_id**: Match organization from list or null
2. **deadlines**: List of submission deadlines (YYYY-MM-DD format). Extract all deadlines mentioned (e.g., LOI deadline, full application deadline, different award type deadlines)
3. **subject**: One-sentence funding opportunity summary
4. **constraints**: Application-wide length requirements ONLY (single constraint for the entire narrative)
5. **activity_code**: NIH activity/mechanism code (e.g., R01, R21, U01). Return null if the CFP is not NIH-specific or the code is not explicitly stated.

### Length Constraint Rules
- Convert page limits to words using 415 words/page
- Character limits remain characters; word limits remain words
- Keep the most restrictive limit if multiple are stated
- Capture a short source quote/citation explaining the limit
- Return `null` if no global length requirement exists
Structure: {type: "words"/"characters", value: integer, source: string|null}

### Output
Return metadata in JSON format.
""",
)

CFP_METADATA_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing extracted CFP metadata. Validate completeness and accuracy."
)

CFP_METADATA_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_metadata_validation",
    template="""# CFP Metadata Validation

## Sources
<rag_sources>${rag_sources}</rag_sources>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Extracted Metadata
<metadata>${metadata}</metadata>

## Task

Review and improve extracted metadata.

### Actions
1. Validate subject summary accuracy
2. Verify all deadlines are in YYYY-MM-DD format and find any missing deadlines
3. Confirm organization identification
4. Ensure the global length constraint is correct and normalized (convert pages to words, choose strictest limit, provide source)
5. Capture the NIH activity code when sources reference a specific mechanism (R01/R21/etc.); otherwise keep it null.

### Output
Return validated/corrected metadata with complete deadlines and a normalized length constraint.
""",
)

cfp_metadata_schema = {
    "type": "object",
    "properties": {
        "org_id": {"type": "string", "nullable": True},
        "subject": {"type": "string"},
        "deadlines": {
            "type": "array",
            "items": {"type": "string"},
        },
        "activity_code": {
            "type": "string",
            "nullable": True,
        },
        "constraints": {
            "type": "array",
            "maxItems": 1,
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["words", "characters"]},
                    "value": {"type": "integer", "minimum": 1},
                    "source": {"type": "string", "nullable": True},
                },
                "required": ["type", "value", "source"],
            },
        },
    },
    "required": ["subject", "deadlines", "constraints"],
}


class CFPMetadataResult(TypedDict):
    org_id: str | None
    subject: str
    deadlines: list[str]
    constraints: list[LengthConstraint]
    activity_code: str | None


def _match_activity_code(candidate: str | None) -> str | None:
    if not candidate:
        return None

    for match in _ACTIVITY_CODE_PATTERN.finditer(candidate.upper()):
        code = match.group(1)
        if code[0] in _NIH_ACTIVITY_PREFIXES:
            return code
    return None


def normalize_activity_code(value: str | None, *, fallback_texts: tuple[str | None, ...] = ()) -> str | None:
    if match := _match_activity_code(value):
        return match

    for extra in fallback_texts:
        if match := _match_activity_code(extra):
            return match

    return None


def validate_cfp_metadata(response: CFPMetadataResult) -> None:
    if not response.get("subject"):
        raise ValidationError("Missing CFP subject")
    if any(constraint["value"] <= 0 for constraint in response.get("constraints", [])):
        raise ValidationError("Global constraint values must be positive", context=response.get("constraints"))


async def extract_cfp_metadata(
    formatted_sources: str,
    organizations: list[OrganizationNamespace],
    cfp_categories: CategorizationAnalysisResult,
    *,
    trace_id: str,
) -> CFPMetadataResult:
    category_hints = format_nlp_hints_for_extraction(cfp_categories)
    messages = CFP_METADATA_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organizations=organizations,
        category_hints=category_hints,
    )

    return await handle_completions_request(
        prompt_identifier="cfp_metadata",
        response_type=CFPMetadataResult,
        response_schema=cfp_metadata_schema,
        validator=validate_cfp_metadata,
        messages=messages,
        system_prompt=CFP_METADATA_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def validate_and_refine_metadata(
    formatted_sources: str,
    existing_metadata: CFPMetadataResult,
    cfp_categories: CategorizationAnalysisResult,
    *,
    trace_id: str,
) -> CFPMetadataResult:
    category_hints = format_nlp_hints_for_extraction(cfp_categories)
    messages = CFP_METADATA_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        metadata=existing_metadata,
        category_hints=category_hints,
    )

    return await handle_completions_request(
        prompt_identifier="cfp_metadata_validation",
        response_type=CFPMetadataResult,
        response_schema=cfp_metadata_schema,
        validator=validate_cfp_metadata,
        messages=messages,
        system_prompt=CFP_METADATA_VALIDATION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def extract_metadata_with_org_identification(
    *,
    formatted_sources: str,
    full_cfp_text: str,
    organizations: list[OrganizationNamespace],
    cfp_categories: CategorizationAnalysisResult,
    trace_id: str,
) -> CFPMetadataResult:
    logger.info("Extracting CFP metadata (step 1: initial extraction)", trace_id=trace_id)
    initial_metadata = await extract_cfp_metadata(
        formatted_sources=formatted_sources,
        organizations=organizations,
        cfp_categories=cfp_categories,
        trace_id=trace_id,
    )

    logger.info("Validating and refining metadata (step 2: gap fill)", trace_id=trace_id)
    metadata_result = await validate_and_refine_metadata(
        formatted_sources=formatted_sources,
        existing_metadata=initial_metadata,
        cfp_categories=cfp_categories,
        trace_id=trace_id,
    )

    if not metadata_result["org_id"]:
        logger.info("Organization not identified in extraction, using hybrid identification", trace_id=trace_id)

        org_id, confidence, method = await identify_granting_institution(
            cfp_text=full_cfp_text,
            organizations=organizations,
            trace_id=trace_id,
        )

        if confidence < 0.0 or confidence > 1.0:
            raise ValidationError(
                "Organization identification confidence out of valid range",
                context={
                    "confidence": confidence,
                    "valid_range": "[0.0, 1.0]",
                    "org_id": org_id,
                    "method": method,
                },
            )

        if org_id and confidence < 0.5:
            logger.warning(
                "Organization identified with low confidence",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

        if org_id and confidence >= 0.85:
            metadata_result["org_id"] = org_id
            logger.info(
                "Organization identified via hybrid method",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

    resolved_org = next((org for org in organizations if org["id"] == metadata_result["org_id"]), None)
    is_nih_document = False
    if resolved_org:
        abbreviation = (resolved_org.get("abbreviation") or "").upper()
        full_name = (resolved_org.get("full_name") or "").lower()
        is_nih_document = abbreviation == "NIH" or "national institutes of health" in full_name

    if is_nih_document:
        metadata_result["activity_code"] = normalize_activity_code(
            metadata_result.get("activity_code"),
            fallback_texts=(metadata_result.get("subject"), full_cfp_text),
        )
    else:
        metadata_result["activity_code"] = None

    return metadata_result
