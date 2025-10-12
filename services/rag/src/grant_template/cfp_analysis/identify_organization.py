import re
import time
from typing import Final, Literal, NotRequired, TypedDict

from msgspec import ValidationError
from packages.db.src.json_objects import OrganizationNamespace
from packages.db.src.tables import GrantingInstitution
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

_org_cache: dict[str, tuple[list[GrantingInstitution], float]] = {}

MIN_CONFIDENCE: Final[float] = 0.85
PREVIEW_LENGTH: Final[int] = 5000
HEADER_FOOTER_SIZE: Final[int] = 2000
MAX_MENTION_COUNT: Final[int] = 10
POSITION_BONUS_WEIGHT: Final[float] = 0.5
MAX_NORMALIZED_SCORE: Final[float] = 0.9
ORG_CACHE_TTL: Final[int] = 3600

IDENTIFY_ORG_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to identify the single, primary granting organization from the provided text. "
    "You will be given a list of candidate organizations and a preview of the CFP text. "
    "Your response must be in JSON format."
)

IDENTIFY_ORG_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="identify_organization",
    template="""
# Identify Granting Organization

## Task

From the provided list of candidate organizations, identify the one that is the primary source of funding for the grant described in the CFP text preview.

### Candidate Organizations

Here is the list of possible organizations with their IDs:
<organizations>
${organizations}
</organizations>

### CFP Text Preview

Here is a preview of the Call for Proposals text:
<cfp_preview>
${cfp_preview}
</cfp_preview>

### Instructions

1.  **Analyze**: Read the CFP text preview and determine which of the candidate organizations is the granting institution.
2.  **Confidence**: Rate your confidence in your choice on a scale of 0.0 to 1.0.
3.  **Justify**: Provide a brief reason for your choice, referencing the text if possible.
4.  **Uncertainty**: If you cannot determine the organization with reasonable certainty, or if none of the candidates seem correct, return `null` for the `org_id`.

### Output Format

Return a single JSON object with the following fields:
- `org_id`: The ID of the matching organization from the provided list, or `null`.
- `confidence`: Your confidence score (0.0 to 1.0).
- `reason`: A brief explanation for your decision.
""",
)


class OrgResponse(TypedDict):
    org_id: str | None
    confidence: float
    reason: str


class OrganizationMatchResult(TypedDict):
    organization_id: str | None
    confidence: float
    method: Literal["regex", "llm", "none"]
    matched_text: NotRequired[str | None]


async def get_all_organizations(session: AsyncSession) -> list[GrantingInstitution]:
    cache_key = "all_orgs"
    current_time = time.time()

    if cache_key in _org_cache:
        cached_orgs, cached_time = _org_cache[cache_key]
        if current_time - cached_time < ORG_CACHE_TTL:
            logger.debug("Using cached organizations", count=len(cached_orgs))
            return cached_orgs

    result = await session.execute(select(GrantingInstitution))
    orgs = list(result.scalars().all())

    _org_cache[cache_key] = (orgs, current_time)
    logger.debug("Cached organizations", count=len(orgs))

    return orgs


def fuzzy_match_organizations(
    cfp_text: str,
    organizations: list[OrganizationNamespace],
) -> OrganizationMatchResult:
    if not cfp_text or not organizations:
        return OrganizationMatchResult(
            organization_id=None,
            confidence=0.0,
            method="none",
        )

    text_length = len(cfp_text)
    header_end = min(HEADER_FOOTER_SIZE, text_length // 2)
    footer_start = max(text_length - HEADER_FOOTER_SIZE, text_length // 2)

    header_text = cfp_text[:header_end].lower()
    footer_text = cfp_text[footer_start:].lower()
    full_text_lower = cfp_text.lower()

    best_match: OrganizationMatchResult | None = None
    best_score = 0.0

    for org in organizations:
        score = 0.0
        matched_text = None

        full_name_lower = org["full_name"].lower()
        full_name_pattern = re.compile(r"\b" + re.escape(full_name_lower) + r"\b")

        full_text_count = len(full_name_pattern.findall(full_text_lower))
        header_count = len(full_name_pattern.findall(header_text))
        footer_count = len(full_name_pattern.findall(footer_text))

        if full_text_count > 0:
            body_count = max(0, full_text_count - header_count - footer_count)
            frequency_score = min(body_count + header_count + footer_count, MAX_MENTION_COUNT) / MAX_MENTION_COUNT
            position_bonus = (header_count + footer_count) * POSITION_BONUS_WEIGHT
            score = frequency_score + position_bonus
            matched_text = org["full_name"]

        if org["abbreviation"]:
            abbr_lower = org["abbreviation"].lower()
            abbr_pattern = re.compile(
                r"\b"
                + re.escape(abbr_lower)
                + r"'?s?\b"
                + r"|\b"
                + re.escape(abbr_lower)
                + r"-\w+"
                + r"|\("
                + re.escape(abbr_lower)
                + r"\)"
            )

            abbr_count = len(abbr_pattern.findall(full_text_lower))
            abbr_header = len(abbr_pattern.findall(header_text))
            abbr_footer = len(abbr_pattern.findall(footer_text))

            if abbr_count > 0:
                abbr_body = max(0, abbr_count - abbr_header - abbr_footer)
                abbr_freq_score = min(abbr_body + abbr_header + abbr_footer, MAX_MENTION_COUNT) / MAX_MENTION_COUNT
                abbr_bonus = (abbr_header + abbr_footer) * POSITION_BONUS_WEIGHT
                abbr_total = abbr_freq_score + abbr_bonus

                if abbr_total > score:
                    score = abbr_total
                    matched_text = org["abbreviation"]

        normalized_score = min(score / MAX_NORMALIZED_SCORE, 1.0)

        if normalized_score > best_score:
            best_score = normalized_score
            best_match = OrganizationMatchResult(
                organization_id=str(org["id"]),
                confidence=normalized_score,
                method="regex",
                matched_text=matched_text,
            )

    return best_match or OrganizationMatchResult(
        organization_id=None,
        confidence=0.0,
        method="none",
    )


async def llm_identify_organization(
    cfp_text: str,
    organizations: list[OrganizationNamespace],
    trace_id: str,
) -> OrganizationMatchResult:
    cfp_preview = cfp_text[:PREVIEW_LENGTH]

    prompt = IDENTIFY_ORG_USER_PROMPT.to_string(
        organizations=organizations,
        cfp_preview=cfp_preview,
    )

    try:
        response = await handle_completions_request(
            prompt_identifier="identify_organization",
            model=GEMINI_FLASH_MODEL,
            system_prompt=IDENTIFY_ORG_SYSTEM_PROMPT,
            messages=prompt,
            response_schema={
                "type": "object",
                "properties": {
                    "org_id": {"type": ["string", "null"]},
                    "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "reason": {"type": "string"},
                },
                "required": ["org_id", "confidence", "reason"],
            },
            response_type=OrgResponse,
            trace_id=trace_id,
        )

        logger.info(
            "LLM organization identification",
            org_id=response["org_id"],
            confidence=response["confidence"],
            reason=response["reason"],
            trace_id=trace_id,
        )

        return OrganizationMatchResult(
            organization_id=response["org_id"],
            confidence=response["confidence"],
            method="llm",
        )

    except ValidationError as e:
        logger.warning("Invalid LLM response structure", error=str(e), trace_id=trace_id)
        return OrganizationMatchResult(
            organization_id=None,
            confidence=0.0,
            method="none",
        )
    except Exception as e:
        logger.exception("LLM organization identification failed", error=str(e), trace_id=trace_id)
        return OrganizationMatchResult(
            organization_id=None,
            confidence=0.0,
            method="none",
        )


async def identify_granting_institution(
    *,
    cfp_text: str,
    organizations: list[OrganizationNamespace],
    trace_id: str,
) -> tuple[str | None, float, str]:
    if not cfp_text:
        logger.warning("Empty CFP text provided for organization identification", trace_id=trace_id)
        return None, 0.0, "none"

    regex_match = fuzzy_match_organizations(cfp_text, organizations)

    logger.info(
        "Regex organization matching",
        org_id=regex_match["organization_id"],
        confidence=regex_match["confidence"],
        matched_text=regex_match.get("matched_text"),
        trace_id=trace_id,
    )

    if regex_match["confidence"] >= MIN_CONFIDENCE:
        return regex_match["organization_id"], regex_match["confidence"], "regex"

    llm_match = await llm_identify_organization(cfp_text, organizations, trace_id)

    if llm_match["confidence"] > regex_match["confidence"]:
        logger.info(
            "Using LLM identification result",
            org_id=llm_match["organization_id"],
            confidence=llm_match["confidence"],
            trace_id=trace_id,
        )
        return llm_match["organization_id"], llm_match["confidence"], "llm"

    return regex_match["organization_id"], regex_match["confidence"], "regex"
