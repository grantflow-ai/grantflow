"""Organization identification for CFP documents."""

import re
import time
from typing import Any, Final, Literal, NotRequired, TypedDict

from msgspec import ValidationError
from packages.db.src.tables import GrantingInstitution
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.rag.src.utils.completion import handle_completions_request

logger = get_logger(__name__)

_org_cache: dict[str, tuple[list[GrantingInstitution], float]] = {}

MIN_CONFIDENCE: Final[float] = 0.85
PREVIEW_LENGTH: Final[int] = 5000
HEADER_FOOTER_SIZE: Final[int] = 2000
MAX_MENTION_COUNT: Final[int] = 10
POSITION_BONUS_WEIGHT: Final[float] = 0.5
MAX_NORMALIZED_SCORE: Final[float] = 0.9
ORG_CACHE_TTL: Final[int] = 3600


class OrganizationMatchResult(TypedDict):
    """Result of organization matching attempt."""

    organization_id: str | None
    confidence: float
    method: Literal["regex", "llm", "none"]
    matched_text: NotRequired[str | None]


async def get_all_organizations(session: AsyncSession) -> list[GrantingInstitution]:
    """Retrieve all granting institutions from database with caching.

    Cache expires after ORG_CACHE_TTL seconds (default 3600 = 1 hour).
    """
    cache_key = "all_orgs"
    current_time = time.time()

    # Check cache
    if cache_key in _org_cache:
        cached_orgs, cached_time = _org_cache[cache_key]
        if current_time - cached_time < ORG_CACHE_TTL:
            logger.debug("Using cached organizations", count=len(cached_orgs))
            return cached_orgs

    # Fetch from database
    result = await session.execute(select(GrantingInstitution))
    orgs = list(result.scalars().all())

    # Update cache
    _org_cache[cache_key] = (orgs, current_time)
    logger.debug("Cached organizations", count=len(orgs))

    return orgs


def fuzzy_match_organizations(
    cfp_text: str,
    organizations: list[GrantingInstitution],
) -> OrganizationMatchResult:
    """Fast regex/fuzzy matching for organization identification.

    Searches CFP text for exact/fuzzy matches using regex patterns.
    Scores matches by frequency and position (header/footer weighted higher).

    Args:
        cfp_text: Full CFP text content
        organizations: List of GrantingInstitution objects from database

    Returns:
        OrganizationMatchResult with confidence score (0.0-1.0)
    """
    if not cfp_text or not organizations:
        return OrganizationMatchResult(
            organization_id=None,
            confidence=0.0,
            method="none",
        )

    # Split text into sections for positional weighting
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

        # Check full name (case-insensitive)
        full_name_lower = org.full_name.lower()
        full_name_pattern = re.compile(r"\b" + re.escape(full_name_lower) + r"\b")

        # Count occurrences
        full_text_count = len(full_name_pattern.findall(full_text_lower))
        header_count = len(full_name_pattern.findall(header_text))
        footer_count = len(full_name_pattern.findall(footer_text))

        if full_text_count > 0:
            # Base score from frequency (capped at MAX_MENTION_COUNT)
            # Use exclusive body count to avoid double-counting header/footer mentions
            body_count = max(0, full_text_count - header_count - footer_count)
            frequency_score = min(body_count + header_count + footer_count, MAX_MENTION_COUNT) / MAX_MENTION_COUNT
            # Positional bonus for header/footer (exclusive weighting)
            position_bonus = (header_count + footer_count) * POSITION_BONUS_WEIGHT
            score = frequency_score + position_bonus
            matched_text = org.full_name

        # Check abbreviation if available
        if org.abbreviation:
            abbr_lower = org.abbreviation.lower()
            # Match abbreviation with word boundaries, parentheses, possessive, hyphenated
            # Examples: "NIH", "(NIH)", "NIH's", "NIH-funded"
            abbr_pattern = re.compile(
                r"\b"
                + re.escape(abbr_lower)
                + r"'?s?\b"  # Possessive: NIH, NIH's
                + r"|\b"
                + re.escape(abbr_lower)
                + r"-\w+"  # Hyphenated: NIH-funded
                + r"|\("
                + re.escape(abbr_lower)
                + r"\)"  # Parenthetical: (NIH)
            )

            abbr_count = len(abbr_pattern.findall(full_text_lower))
            abbr_header = len(abbr_pattern.findall(header_text))
            abbr_footer = len(abbr_pattern.findall(footer_text))

            if abbr_count > 0:
                # Use exclusive body count to avoid double-counting
                abbr_body = max(0, abbr_count - abbr_header - abbr_footer)
                abbr_freq_score = min(abbr_body + abbr_header + abbr_footer, MAX_MENTION_COUNT) / MAX_MENTION_COUNT
                abbr_bonus = (abbr_header + abbr_footer) * POSITION_BONUS_WEIGHT
                abbr_total = abbr_freq_score + abbr_bonus

                # Use abbreviation score if higher
                if abbr_total > score:
                    score = abbr_total
                    matched_text = org.abbreviation

        # Normalize score to 0-1 range
        normalized_score = min(score / MAX_NORMALIZED_SCORE, 1.0)

        if normalized_score > best_score:
            best_score = normalized_score
            best_match = OrganizationMatchResult(
                organization_id=str(org.id),
                confidence=normalized_score,
                method="regex",
                matched_text=matched_text,
            )

    return best_match or OrganizationMatchResult(
        organization_id=None,
        confidence=0.0,
        method="none",
    )


IDENTIFY_ORG_SYSTEM_PROMPT: Final[str] = """Identify the granting organization from CFP text.

Return JSON with org_id from mapping (null if uncertain), confidence (0.0-1.0), and reason."""

IDENTIFY_ORG_USER_PROMPT: Final[str] = """# Organizations
{organization_mapping}

# CFP Text Preview (first {preview_length} chars)
{cfp_preview}

Identify the granting organization. Return org_id from mapping or null if uncertain."""


class LLMOrgResponse(TypedDict):
    """LLM response for organization identification."""

    org_id: str | None
    confidence: float
    reason: str


async def llm_identify_organization(
    cfp_text: str,
    organization_mapping: dict[str, dict[str, str]],
    trace_id: str,
) -> OrganizationMatchResult:
    """LLM fallback for organization identification using Flash model.

    Args:
        cfp_text: Full CFP text content
        organization_mapping: Mapping of org IDs to names/abbreviations
        trace_id: Trace ID for logging

    Returns:
        OrganizationMatchResult with LLM-determined confidence
    """
    if not cfp_text or not organization_mapping:
        return OrganizationMatchResult(
            organization_id=None,
            confidence=0.0,
            method="none",
        )

    cfp_preview = cfp_text[:PREVIEW_LENGTH]

    # Format organization mapping for prompt
    org_list = []
    for org_id, org_data in organization_mapping.items():
        full_name = org_data.get("full_name", "")
        abbreviation = org_data.get("abbreviation", "")
        abbr_text = f" ({abbreviation})" if abbreviation else ""
        org_list.append(f"- {org_id}: {full_name}{abbr_text}")

    org_mapping_text = "\n".join(org_list)

    prompt = IDENTIFY_ORG_USER_PROMPT.format(
        organization_mapping=org_mapping_text,
        preview_length=PREVIEW_LENGTH,
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
            response_type=LLMOrgResponse,
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
    cfp_text: str,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> tuple[str | None, float, str]:
    """Identify granting institution using hybrid approach.

    Strategy:
    1. Try fast regex/NLP matching first
    2. If confidence >= MIN_CONFIDENCE (0.85), return immediately
    3. Otherwise fallback to LLM identification

    Args:
        cfp_text: Full CFP text content
        session_maker: Database session factory
        trace_id: Trace ID for logging

    Returns:
        Tuple of (org_id, confidence_score, method_used)
    """
    if not cfp_text:
        logger.warning("Empty CFP text provided for organization identification", trace_id=trace_id)
        return (None, 0.0, "none")

    # Step 1: Get all organizations from database
    async with session_maker() as session:
        organizations = await get_all_organizations(session)

    if not organizations:
        logger.warning("No organizations found in database", trace_id=trace_id)
        return (None, 0.0, "none")

    # Step 2: Try fast regex matching
    regex_match = fuzzy_match_organizations(cfp_text, organizations)

    logger.info(
        "Regex organization matching",
        org_id=regex_match["organization_id"],
        confidence=regex_match["confidence"],
        matched_text=regex_match.get("matched_text"),
        trace_id=trace_id,
    )

    # If high confidence, return immediately
    if regex_match["confidence"] >= MIN_CONFIDENCE:
        return regex_match["organization_id"], regex_match["confidence"], "regex"

    # Step 3: Fallback to LLM identification
    # Build organization mapping
    organization_mapping = {
        str(org.id): {
            "full_name": org.full_name,
            "abbreviation": org.abbreviation or "",
        }
        for org in organizations
    }

    llm_match = await llm_identify_organization(cfp_text, organization_mapping, trace_id)

    # Use LLM result if confidence is higher than regex
    if llm_match["confidence"] > regex_match["confidence"]:
        logger.info(
            "Using LLM identification result",
            org_id=llm_match["organization_id"],
            confidence=llm_match["confidence"],
            trace_id=trace_id,
        )
        return llm_match["organization_id"], llm_match["confidence"], "llm"

    # Otherwise use regex result (even if low confidence)
    return regex_match["organization_id"], regex_match["confidence"], "regex"
