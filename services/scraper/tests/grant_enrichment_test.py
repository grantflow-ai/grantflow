from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.scraper.src.grant_enrichment import (
    _clean_html_content,
    _extract_amounts_from_html,
    _extract_eligibility_from_html,
    categorize_eligibility,
    enrich_grant_data,
    extract_grant_details,
    parse_amount,
)


def test_parse_amount_basic_amount() -> None:
    assert parse_amount("$500,000") == 500000
    assert parse_amount("1,000,000") == 1000000
    assert parse_amount("250000") == 250000


def test_parse_amount_with_multipliers() -> None:
    assert parse_amount("$1.5M") == 1500000
    assert parse_amount("2M") == 2000000
    assert parse_amount("500K") == 500000
    assert parse_amount("50K") == 50000


def test_parse_amount_invalid_amounts() -> None:
    assert parse_amount("") is None
    assert parse_amount("not a number") is None
    assert parse_amount("$") is None


def test_categorize_eligibility_higher_education() -> None:
    text = "Eligible applicants include Public/State Controlled Institutions of Higher Education"
    assert categorize_eligibility(text) == "Higher Education Institutions"


def test_categorize_eligibility_multiple_categories() -> None:
    text = "Nonprofits having a 501(c)(3) status with the IRS and State Governments are eligible"
    result = categorize_eligibility(text)
    assert "Nonprofits" in result
    assert "Government" in result


def test_categorize_eligibility_fallback_to_various() -> None:
    text = "Any qualified organization may apply"
    assert categorize_eligibility(text) == "Various"


def test_categorize_eligibility_empty_text() -> None:
    assert categorize_eligibility("") == ""


def test_clean_html_content_html_entities() -> None:
    html = "Test&nbsp;content&amp;more&lt;text&gt;"
    result = _clean_html_content(html)
    assert result == "Test content&moretext"


def test_clean_html_content_preserves_regular_text() -> None:
    html = "Regular text without entities"
    assert _clean_html_content(html) == html


def test_extract_amounts_from_html_year_specific_amounts() -> None:
    html = """
    <div>Award Information
    <p>YR 01: $650,000</p>
    <p>YR 02: $650,000</p>
    </div>
    """
    clean = _clean_html_content(html)
    min_amt, max_amt = _extract_amounts_from_html(clean)
    assert min_amt == 650000
    assert max_amt == 650000


def test_extract_amounts_from_html_budget_range() -> None:
    html = """
    <section>Budget Information
    <p>Direct costs up to $500,000</p>
    <p>Maximum award $1,500,000</p>
    </section>
    """
    clean = _clean_html_content(html)
    min_amt, max_amt = _extract_amounts_from_html(clean)
    assert min_amt == 500000
    assert max_amt == 1500000


def test_extract_amounts_from_html_no_amounts() -> None:
    html = "<div>No budget information available</div>"
    clean = _clean_html_content(html)
    min_amt, max_amt = _extract_amounts_from_html(clean)
    assert min_amt is None
    assert max_amt is None


def test_extract_amounts_from_html_filter_outliers() -> None:
    html = """
    <div>Award Information
    <p>Application fee: $100</p>
    <p>Direct costs: $500,000</p>
    <p>Total program budget: $50,000,000</p>
    <p>Annual award: $750,000</p>
    </div>
    """
    clean = _clean_html_content(html)
    min_amt, max_amt = _extract_amounts_from_html(clean)
    assert min_amt == 500000
    assert max_amt == 750000


def test_extract_eligibility_from_html_eligible_applicants_section() -> None:
    html = """
    <section>
    <h3>Eligible Applicants</h3>
    <p>Nonprofits having a 501(c)(3) status with the IRS, other than institutions of higher education</p>
    </section>
    """
    clean = _clean_html_content(html)
    eligibility = _extract_eligibility_from_html(clean)
    assert eligibility == "Nonprofits"


def test_extract_eligibility_from_html_who_can_apply_section() -> None:
    html = """
    <div>
    <h2>Who Can Apply</h2>
    <p>Public/State Controlled Institutions of Higher Education and Private Institutions of Higher Education</p>
    </div>
    """
    clean = _clean_html_content(html)
    eligibility = _extract_eligibility_from_html(clean)
    assert eligibility == "Higher Education Institutions"


def test_extract_eligibility_from_html_no_eligibility() -> None:
    html = "<div>General grant information</div>"
    clean = _clean_html_content(html)
    eligibility = _extract_eligibility_from_html(clean)
    assert eligibility is None


def test_extract_eligibility_from_html_eligibility_truncation() -> None:
    html = (
        """
    <section>
    <h3>Eligible Organizations</h3>
    <p>"""
        + "A" * 200
        + """</p>
    </section>
    """
    )
    clean = _clean_html_content(html)
    eligibility = _extract_eligibility_from_html(clean)
    assert eligibility is not None
    assert len(eligibility) <= 100


def test_extract_grant_details_complete_details() -> None:
    html = """
    <div>
    <section>Award Information
    <p>Maximum award: $1,000,000</p>
    </section>
    <section>Eligible Applicants
    <p>Nonprofits having a 501(c)(3) status with the IRS</p>
    </section>
    </div>
    """
    result = extract_grant_details(html)
    assert result["amount_min"] == 1000000
    assert result["amount_max"] == 1000000
    assert result["eligibility"] == "Nonprofits"
    assert result["category"] is None


def test_extract_grant_details_partial_details() -> None:
    html = """
    <div>
    <section>Award Information
    <p>Maximum award: $500,000</p>
    </section>
    </div>
    """
    result = extract_grant_details(html)
    assert result["amount_min"] == 500000
    assert result["amount_max"] == 500000
    assert result["eligibility"] is None


def test_extract_grant_details_empty_html() -> None:
    result = extract_grant_details("")
    assert result["amount_min"] is None
    assert result["amount_max"] is None
    assert result["eligibility"] is None
    assert result["category"] is None


@pytest.mark.asyncio
async def test_enrich_grant_data_with_amounts_and_eligibility() -> None:
    mock_grant = MagicMock()
    mock_grant.id = "test-id"
    mock_grant.url = "https://example.com/grant"
    mock_grant.document_number = "TEST-001"
    mock_grant.amount_min = None
    mock_grant.eligibility = None

    mock_update_result1 = MagicMock()
    mock_update_result1.rowcount = 0

    mock_update_result2 = MagicMock()
    mock_update_result2.rowcount = 0

    mock_select_result = MagicMock()
    mock_select_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_grant])))

    mock_update_result3 = MagicMock()
    mock_update_result3.rowcount = 1

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        side_effect=[
            mock_update_result1,
            mock_update_result2,
            mock_select_result,
            mock_update_result3,
        ]
    )
    mock_session.commit = AsyncMock()
    mock_session.begin = MagicMock(return_value=AsyncMock())

    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_maker.return_value.__aexit__ = AsyncMock()

    with patch(
        "services.scraper.src.grant_enrichment.fetch_grant_page_content", new_callable=AsyncMock
    ) as mock_fetch:
        mock_fetch.return_value = """
        <section>Award Information
        <p>Maximum award: $750,000</p>
        </section>
        <section>Eligible Applicants
        <p>Nonprofits having a 501(c)(3) status with the IRS</p>
        </section>
        """

        stats = await enrich_grant_data(mock_session_maker, limit=1)

        assert stats["total_processed"] == 1
        assert stats["successfully_enriched"] == 1
        assert stats["amounts_extracted"] == 1
        assert stats["eligibility_extracted"] == 1
        assert stats["failed"] == 0
        assert stats["skipped"] == 0


@pytest.mark.asyncio
async def test_enrich_grant_data_handles_fetch_failure() -> None:
    mock_grant = MagicMock()
    mock_grant.id = "test-id"
    mock_grant.url = "https://example.com/grant"
    mock_grant.document_number = "TEST-002"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        side_effect=[
            MagicMock(rowcount=0),
            MagicMock(rowcount=0),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_grant])))),
        ]
    )
    mock_session.commit = AsyncMock()

    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_maker.return_value.__aexit__ = AsyncMock()

    with patch("services.scraper.src.grant_enrichment.fetch_grant_page_content") as mock_fetch:
        mock_fetch.return_value = None

        stats = await enrich_grant_data(mock_session_maker, limit=1)

        assert stats["total_processed"] == 1
        assert stats["successfully_enriched"] == 0
        assert stats["failed"] == 1
        assert stats["skipped"] == 0


@pytest.mark.asyncio
async def test_enrich_grant_data_skips_grants_without_url() -> None:
    mock_grant = MagicMock()
    mock_grant.id = "test-id"
    mock_grant.url = None
    mock_grant.document_number = "TEST-003"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        side_effect=[
            MagicMock(rowcount=0),
            MagicMock(rowcount=0),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_grant])))),
        ]
    )
    mock_session.commit = AsyncMock()

    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_maker.return_value.__aexit__ = AsyncMock()

    stats = await enrich_grant_data(mock_session_maker, limit=1)

    assert stats["total_processed"] == 1
    assert stats["successfully_enriched"] == 0
    assert stats["failed"] == 0
    assert stats["skipped"] == 1
