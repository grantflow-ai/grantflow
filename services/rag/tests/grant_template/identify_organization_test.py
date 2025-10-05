
from typing import Any
from uuid import uuid4

from packages.db.src.tables import GrantingInstitution
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.identify_organization import (
    MIN_CONFIDENCE,
    OrganizationMatchResult,
    fuzzy_match_organizations,
    identify_granting_institution,
)


def create_sample_organizations() -> list[GrantingInstitution]:
    return [
        GrantingInstitution(
            id=uuid4(),
            full_name="National Institutes of Health",
            abbreviation="NIH",
        ),
        GrantingInstitution(
            id=uuid4(),
            full_name="National Science Foundation",
            abbreviation="NSF",
        ),
        GrantingInstitution(
            id=uuid4(),
            full_name="European Research Council",
            abbreviation="ERC",
        ),
        GrantingInstitution(
            id=uuid4(),
            full_name="Melanoma Research Alliance",
            abbreviation="MRA",
        ),
        GrantingInstitution(
            id=uuid4(),
            full_name="Israeli Ministry of Health",
            abbreviation=None,
        ),
    ]


def test_fuzzy_match_exact_full_name() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    FUNDING OPPORTUNITY ANNOUNCEMENT
    National Institutes of Health
    Grant Opportunity for Cancer Research

    The National Institutes of Health invites applications for research funding.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is not None
    assert result["confidence"] >= MIN_CONFIDENCE
    assert result["method"] == "regex"
    assert result.get("matched_text") == "National Institutes of Health"


def test_fuzzy_match_abbreviation() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    NSF CAREER Award Program

    The NSF invites early-career faculty to apply for CAREER awards.
    Contact: career@nsf.gov
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is not None
    assert result["confidence"] >= MIN_CONFIDENCE
    assert result["method"] == "regex"
    assert result.get("matched_text") == "NSF"


def test_fuzzy_match_abbreviation_in_parentheses() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    European Research Council (ERC) Starting Grant

    The ERC announces funding for early-career researchers.
    Applications must follow ERC guidelines.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is not None
    assert result["confidence"] >= MIN_CONFIDENCE
    assert result["method"] == "regex"
    assert result.get("matched_text") == "ERC"


def test_fuzzy_match_header_weighting() -> None:
    sample_organizations = create_sample_organizations()
    cfp_header = """
    Melanoma Research Alliance
    MRA Grant Program

    """ + ("Some filler text. " * 100)

    cfp_body = ("Some filler text. " * 50) + """
    Melanoma Research Alliance
    MRA Grant Program
    """

    result_header: OrganizationMatchResult = fuzzy_match_organizations(cfp_header, sample_organizations)
    result_body: OrganizationMatchResult = fuzzy_match_organizations(cfp_body, sample_organizations)

    assert result_header["confidence"] >= result_body["confidence"]


def test_fuzzy_match_no_organization() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    Generic Research Funding Opportunity

    Applications are invited for innovative research projects.
    No specific organization mentioned.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is None
    assert result["confidence"] == 0.0
    assert result["method"] == "none"


def test_fuzzy_match_empty_text() -> None:
    sample_organizations = create_sample_organizations()
    result: OrganizationMatchResult = fuzzy_match_organizations("", sample_organizations)

    assert result["organization_id"] is None
    assert result["confidence"] == 0.0
    assert result["method"] == "none"


def test_fuzzy_match_no_abbreviation() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    Israeli Ministry of Health Research Grant

    The Israeli Ministry of Health invites applications for medical research.
    The Israeli Ministry of Health is the granting authority for this program.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is not None
    assert result["confidence"] >= MIN_CONFIDENCE
    assert result["method"] == "regex"
    assert result.get("matched_text") == "Israeli Ministry of Health"


def test_fuzzy_match_multiple_mentions() -> None:
    sample_organizations = create_sample_organizations()
    cfp_single = "National Science Foundation grant program."

    cfp_multiple = """
    National Science Foundation
    NSF Research Program

    Applications to the National Science Foundation must follow NSF guidelines.
    Contact the NSF for more information.
    NSF deadline is March 15.
    """

    result_single: OrganizationMatchResult = fuzzy_match_organizations(cfp_single, sample_organizations)
    result_multiple: OrganizationMatchResult = fuzzy_match_organizations(cfp_multiple, sample_organizations)

    assert result_multiple["confidence"] > result_single["confidence"]


def test_fuzzy_match_case_insensitive() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    NATIONAL INSTITUTES OF HEALTH
    NIH research grant program

    The NATIONAL INSTITUTES OF HEALTH (NIH) invites applications.
    Contact NIH for more information.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is not None
    assert result["confidence"] >= MIN_CONFIDENCE


async def test_identify_granting_institution_high_confidence(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_text = """
    National Institutes of Health
    NIH Grant Program R01

    The National Institutes of Health (NIH) invites applications.
    Contact: grants@nih.gov
    """

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_trace_high_confidence",
    )

    assert org_id is not None
    assert confidence >= MIN_CONFIDENCE
    assert method == "regex"


async def test_identify_granting_institution_empty_text(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    org_id, confidence, method = await identify_granting_institution(
        cfp_text="",
        session_maker=async_session_maker,
        trace_id="test_trace_empty",
    )

    assert org_id is None
    assert confidence == 0.0
    assert method == "none"


async def test_identify_granting_institution_abbreviation_match(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_text = """
    ERC Starting Grant 2025

    The ERC invites applications from early-career researchers.
    ERC guidelines apply to all submissions.
    """

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_trace_abbreviation",
    )

    assert org_id is not None
    assert confidence >= MIN_CONFIDENCE
    assert method == "regex"


def test_fuzzy_match_partial_name_no_match() -> None:
    sample_organizations = create_sample_organizations()
    cfp_text = """
    National Institute for Advanced Studies
    Research funding opportunity.
    """

    result: OrganizationMatchResult = fuzzy_match_organizations(cfp_text, sample_organizations)

    assert result["organization_id"] is None or result["confidence"] < MIN_CONFIDENCE
