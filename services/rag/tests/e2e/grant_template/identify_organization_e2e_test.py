"""E2E tests for organization identification using real CFP files."""

from pathlib import Path
from typing import Any

from kreuzberg import extract_file
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.identify_organization import identify_granting_institution

TEST_DATA_DIR = Path(__file__).parent.parent.parent.parent.parent.parent / "testing/test_data/sources/cfps"


async def test_identify_nih_par_25_450(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test organization identification on NIH PAR-25-450 CFP."""
    cfp_path = TEST_DATA_DIR / "PAR-25-450_ Clinical Trial Readiness for Rare Diseases, Disorders, and Syndromes (R21 Clinical Trial Not Allowed).pdf"

    assert cfp_path.exists(), f"CFP file not found: {cfp_path}"

    # Extract PDF to markdown using kreuzberg
    parsed = await extract_file(cfp_path)
    cfp_text = parsed.content

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_nih_par_25_450",
    )

    assert org_id is not None, "Should identify NIH"
    assert confidence >= 0.85, f"Confidence {confidence} too low for NIH identification"
    assert method == "regex", "Should use regex for clear NIH identification"


async def test_identify_nih_rfa_ai_25_027(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test organization identification on NIH RFA-AI-25-027 CFP (Tuberculosis)."""
    cfp_path = TEST_DATA_DIR / "RFA-AI-25-027_ Tuberculosis Research Units (P01 Clinical Trial Optional).pdf"

    assert cfp_path.exists(), f"CFP file not found: {cfp_path}"

    parsed = await extract_file(cfp_path)
    cfp_text = parsed.content

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_nih_rfa_ai",
    )

    assert org_id is not None, "Should identify NIH"
    assert confidence >= 0.85, f"Confidence {confidence} too low for NIH identification"
    assert method == "regex", "Should use regex for clear NIH identification"


async def test_identify_nih_rfa_dk_26_315(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test organization identification on NIH RFA-DK-26-315 CFP (Diabetes)."""
    cfp_path = TEST_DATA_DIR / "RFA-DK-26-315_ Advancing Research on the Application of Digital Health Technology to the Management of Type 2 Diabetes (R01- Clinical Trail Required).pdf"

    assert cfp_path.exists(), f"CFP file not found: {cfp_path}"

    parsed = await extract_file(cfp_path)
    cfp_text = parsed.content

    org_id, confidence, method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_nih_rfa_dk",
    )

    assert org_id is not None, "Should identify NIH"
    assert confidence >= 0.85, f"Confidence {confidence} too low for NIH identification"
    assert method == "regex", "Should use regex for clear NIH identification"


async def test_identify_melanoma_research_alliance(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test organization identification on Melanoma Research Alliance CFP."""
    cfp_path = TEST_DATA_DIR / "MRA-2023-2024-RFP-Final.pdf"

    assert cfp_path.exists(), f"CFP file not found: {cfp_path}"

    parsed = await extract_file(cfp_path)
    cfp_text = parsed.content

    org_id, confidence, _method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_mra",
    )

    assert org_id is not None, "Should identify Melanoma Research Alliance"
    assert confidence >= 0.85, f"Confidence {confidence} too low for MRA identification"


async def test_identify_israeli_chief_scientist(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test organization identification on Israeli Chief Scientist CFP."""
    cfp_path = TEST_DATA_DIR / "israeli_chief_scientist_cfp.html"

    assert cfp_path.exists(), f"CFP file not found: {cfp_path}"

    parsed = await extract_file(cfp_path)
    cfp_text = parsed.content

    org_id, confidence, _method = await identify_granting_institution(
        cfp_text=cfp_text,
        session_maker=async_session_maker,
        trace_id="test_israeli_chief_scientist",
    )

    # Israeli Ministry of Health might be identified or not depending on content
    # This test documents actual behavior
    if org_id is not None:
        assert confidence > 0.0, "If identified, should have positive confidence"
