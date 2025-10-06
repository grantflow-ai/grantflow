from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisConstraint, OrganizationNamespace
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.cfp_analysis.identify_organization import identify_granting_institution
from services.rag.src.grant_template.cfp_analysis.section_enrichment import CONSTRAINT_TYPES
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

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

## Task

Extract metadata from CFP.

### Fields
1. **org_id**: Match organization from list or null
2. **deadlines**: List of submission deadlines (YYYY-MM-DD format). Extract all deadlines mentioned (e.g., LOI deadline, full application deadline, different award type deadlines)
3. **subject**: One-sentence funding opportunity summary
4. **constraints**: Application-wide formatting/length requirements ONLY

### Constraints
Extract ONLY formatting and length constraints that apply to the entire application:
- Overall page limits (e.g., "15 pages total")
- Font requirements (e.g., "Arial 11pt or Times New Roman 12pt")
- Margin requirements (e.g., "at least ½ inch margins")
- Character/word limits for abstracts or summaries (e.g., "2000 characters including spaces")
- Reference limits (e.g., "up to 30 references")

Each constraint: {type: string, value: string}
Types: page_limit, word_limit, char_limit, font, spacing, margin, length, size, format

DO NOT include eligibility requirements, PI requirements, or submission rules - these are not formatting constraints.

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

## Extracted Metadata
<metadata>${metadata}</metadata>

## Task

Review and improve extracted metadata.

### Actions
1. Validate subject summary accuracy
2. Verify all deadlines are in YYYY-MM-DD format and find any missing deadlines
3. Confirm organization identification
4. Find missing formatting constraints (search entire CFP for application-wide formatting requirements like page limits, font, margins, spacing)

### Output
Return validated/corrected metadata with complete deadlines and formatting constraints.
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
        "constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": sorted(CONSTRAINT_TYPES)},
                    "value": {"type": "string"},
                },
                "required": ["type", "value"],
            },
        },
    },
    "required": ["subject", "deadlines", "constraints"],
}


class CFPMetadataResult(TypedDict):
    org_id: str | None
    subject: str
    deadlines: list[str]
    constraints: list[CFPAnalysisConstraint]


def validate_cfp_metadata(response: CFPMetadataResult) -> None:
    if not response.get("subject"):
        raise ValidationError("Missing CFP subject")


async def extract_cfp_metadata(
    formatted_sources: str,
    organizations: list[OrganizationNamespace],
    *,
    trace_id: str,
) -> CFPMetadataResult:
    messages = CFP_METADATA_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organizations=serialize(organizations).decode("utf-8"),
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
    *,
    trace_id: str,
) -> CFPMetadataResult:
    messages = CFP_METADATA_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        metadata=serialize(existing_metadata).decode("utf-8"),
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
    trace_id: str,
) -> CFPMetadataResult:
    logger.info("Extracting CFP metadata (step 1: initial extraction)", trace_id=trace_id)
    initial_metadata = await extract_cfp_metadata(
        formatted_sources=formatted_sources,
        organizations=organizations,
        trace_id=trace_id,
    )

    logger.info("Validating and refining metadata (step 2: gap fill)", trace_id=trace_id)
    metadata_result = await validate_and_refine_metadata(
        formatted_sources=formatted_sources,
        existing_metadata=initial_metadata,
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

    return metadata_result
