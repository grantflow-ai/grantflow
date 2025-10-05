from typing import Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_METADATA_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to extract key metadata from the provided text, including the granting organization, submission deadline, and a concise subject summary."
)

CFP_METADATA_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_metadata_extraction",
    template="""
    # CFP Metadata Extraction

    ## Task

    Analyze the provided sources and extract the following metadata.

    ### Sources
    <rag_sources>
    ${rag_sources}
    </rag_sources>

    ### Candidate Organizations
    <organizations>
    ${organizations}
    </organizations>

    ### Instructions & Output Format

    Return a single JSON object with the following fields:

    1.  **org_id**:
        -   Identify the granting organization from the text by matching it with an entry in the `<organizations>` list.
        -   Return the corresponding `id` of the matched organization.
        -   If no clear match is found, return `null`.

    2.  **deadline**:
        -   Find the final submission deadline mentioned in the text.
        -   Format the date as `YYYY-MM-DD`.
        -   If no deadline is found, return `null`.

    3.  **subject**:
        -   Provide a concise, one-sentence summary of the funding opportunity's main subject.
        -   Use key terminology found directly in the source text.
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
