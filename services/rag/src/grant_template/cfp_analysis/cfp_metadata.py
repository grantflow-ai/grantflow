from typing import Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_METADATA_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "Extract organization ID, subject summary, and deadline from CFP. Return valid JSON only."
)

CFP_METADATA_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_metadata_extraction",
    template="""
    # CFP Metadata Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>
    <organizations>${organizations}</organizations>

    ## Task

    Extract precise CFP metadata:

    1. **Organization Identification**: Return the organization ID correlating with the identified organization from the organizations array, if any
    2. **Deadline Extraction**: Include submission deadline if found (YYYY-MM-DD format)
    3. **Subject Analysis**: Summarize the funding opportunity concisely using exact terminology
    """,
)


cfp_metadata_schema = {
    "type": "object",
    "properties": {
        "org_id": {"type": "string", "nullable": True},
        "subject": {"type": "string"},
        "deadline": {"type": "string", "nullable": True},
    },
    "required": ["subject"],
}


class CFPMetadataResult(TypedDict):
    org_id: str | None
    subject: str
    deadline: str | None


def validate_cfp_metadata(response: CFPMetadataResult) -> None:
    if not response.get("subject"):
        raise ValidationError("No subject extracted from CFP")


async def extract_cfp_metadata(
    task_description: str,
    *,
    trace_id: str,
) -> CFPMetadataResult:
    # TODO: add evaluation here
    return await handle_completions_request(
        prompt_identifier="cfp_metadata",
        response_type=CFPMetadataResult,
        response_schema=cfp_metadata_schema,
        validator=validate_cfp_metadata,
        messages=task_description,
        system_prompt=CFP_METADATA_EXTRACTION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
