from unittest.mock import AsyncMock, patch

from packages.db.src.json_objects import OrganizationNamespace

from services.rag.src.grant_template.cfp_analysis.identify_organization import (
    MIN_CONFIDENCE,
    OrganizationMatchResult,
    fuzzy_match_organizations,
    identify_granting_institution,
    llm_identify_organization,
)


def create_sample_organizations() -> list[OrganizationNamespace]:
    return [
        OrganizationNamespace(
            id="nih-id",
            full_name="National Institutes of Health",
            abbreviation="NIH",
        ),
        OrganizationNamespace(
            id="nsf-id",
            full_name="National Science Foundation",
            abbreviation="NSF",
        ),
        OrganizationNamespace(
            id="erc-id",
            full_name="European Research Council",
            abbreviation="ERC",
        ),
        OrganizationNamespace(
            id="mra-id",
            full_name="Melanoma Research Alliance",
            abbreviation="MRA",
        ),
        OrganizationNamespace(
            id="israeli-moh-id",
            full_name="Israeli Ministry of Health",
            abbreviation="",
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

    cfp_body = (
        ("Some filler text. " * 50)
        + """
    Melanoma Research Alliance
    MRA Grant Program
    """
    )

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


async def test_identify_granting_institution_high_confidence() -> None:
    cfp_text = """
    National Institutes of Health
    NIH Grant Program R01

    The National Institutes of Health (NIH) invites applications.
    Contact: grants@nih.gov
    """

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        organizations=create_sample_organizations(),
        trace_id="test_trace_high_confidence",
    )

    assert org_id is not None
    assert confidence >= MIN_CONFIDENCE
    assert method == "regex"


async def test_identify_granting_institution_empty_text() -> None:
    org_id, confidence, method = await identify_granting_institution(
        cfp_text="",
        organizations=create_sample_organizations(),
        trace_id="test_trace_empty",
    )

    assert org_id is None
    assert confidence == 0.0
    assert method == "none"


async def test_identify_granting_institution_abbreviation_match() -> None:
    cfp_text = """
    ERC Starting Grant 2025

    The ERC invites applications from early-career researchers.
    ERC guidelines apply to all submissions.
    """

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        organizations=create_sample_organizations(),
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


async def test_llm_identify_organization_prompt_template_parameters() -> None:
    """Test that llm_identify_organization uses correct prompt template parameters.

    This test verifies the fix for the InvalidTemplateKeysError that occurred when
    preview_length was incorrectly passed to the prompt template. The template only
    accepts cfp_preview and organizations parameters.
    """
    sample_organizations = create_sample_organizations()
    cfp_text = "This is a test CFP text that should be truncated to preview length. " * 100

    mock_response = {
        "org_id": "nih-id",
        "confidence": 0.95,
        "reason": "NIH is clearly mentioned in the text",
    }

    with patch(
        "services.rag.src.grant_template.cfp_analysis.identify_organization.handle_completions_request",
        new_callable=AsyncMock,
    ) as mock_completion:
        mock_completion.return_value = mock_response

        result = await llm_identify_organization(
            cfp_text=cfp_text,
            organizations=sample_organizations,
            trace_id="test_trace_template_params",
        )

        # Verify the function was called
        assert mock_completion.called

        # Verify the result
        assert result["organization_id"] == "nih-id"
        assert result["confidence"] == 0.95
        assert result["method"] == "llm"

        # Verify the prompt was constructed correctly (no InvalidTemplateKeysError)
        # The fact that this test runs without error proves the template parameters are correct
        call_args = mock_completion.call_args
        assert call_args is not None
        assert "messages" in call_args.kwargs

        # The prompt should contain truncated CFP text and organizations
        prompt_text = call_args.kwargs["messages"]
        assert isinstance(prompt_text, str)
        assert len(prompt_text) > 0


async def test_llm_identify_organization_handles_llm_failure() -> None:
    """Test that llm_identify_organization handles LLM failures gracefully."""
    sample_organizations = create_sample_organizations()
    cfp_text = "Test CFP text for error handling."

    with patch(
        "services.rag.src.grant_template.cfp_analysis.identify_organization.handle_completions_request",
        new_callable=AsyncMock,
    ) as mock_completion:
        mock_completion.side_effect = Exception("LLM service unavailable")

        result = await llm_identify_organization(
            cfp_text=cfp_text,
            organizations=sample_organizations,
            trace_id="test_trace_error",
        )

        # Should return none result on error
        assert result["organization_id"] is None
        assert result["confidence"] == 0.0
        assert result["method"] == "none"
