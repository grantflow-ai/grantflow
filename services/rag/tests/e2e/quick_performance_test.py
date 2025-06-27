"""Quick performance test to validate optimizations."""
import logging
from datetime import UTC, datetime

from packages.db.src.tables import FundingOrganization
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import Content


def create_sample_cfp_content() -> list[Content]:
    """Create sample CFP content for testing."""
    return [
        {
            "title": "Project Summary/Abstract",
            "subtitles": ["Limited to 30 lines of text", "Include specific aims"],
        },
        {
            "title": "Research Plan",
            "subtitles": [
                "Significance (1 page)",
                "Innovation (1 page)",
                "Approach (6 pages)",
                "Timeline and Milestones",
            ],
        },
        {
            "title": "Budget Justification",
            "subtitles": ["Personnel", "Equipment", "Travel", "Other Expenses"],
        },
    ]


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_section_extraction_performance(
    logger: logging.Logger,
    nih_organization: FundingOrganization,
) -> None:
    """Test section extraction performance."""
    cfp_content = create_sample_cfp_content()
    cfp_subject = "NIH R01 grant for melanoma research focusing on novel immunotherapy approaches"

    start_time = datetime.now(UTC)
    sections = await handle_extract_sections(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=nih_organization,
    )
    elapsed = (datetime.now(UTC) - start_time).total_seconds()

    logger.info(
        "Section extraction completed - elapsed: %.2f seconds, sections: %d",
        elapsed,
        len(sections),
    )

    assert len(sections) > 0, "Should extract at least one section"
    assert elapsed < 60, f"Section extraction took {elapsed}s, expected < 60s"


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_metadata_generation_performance(
    logger: logging.Logger,
    nih_organization: FundingOrganization,
) -> None:
    """Test metadata generation performance."""
    cfp_content = "Research Plan: 12 pages including Significance, Innovation, and Approach sections"
    cfp_subject = "NIH R01 grant for cancer research"

    long_form_sections = [
        {
            "id": "section-1",
            "title": "Project Summary",
            "is_long_form": True,
            "is_detailed_research_plan": False,
        },
        {
            "id": "section-2",
            "title": "Research Plan",
            "is_long_form": True,
            "is_detailed_research_plan": True,
        },
    ]

    start_time = datetime.now(UTC)
    metadata = await handle_generate_grant_template(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=nih_organization,
        long_form_sections=long_form_sections,
    )
    elapsed = (datetime.now(UTC) - start_time).total_seconds()

    logger.info(
        "Metadata generation completed - elapsed: %.2f seconds, metadata: %d",
        elapsed,
        len(metadata),
    )

    assert len(metadata) == 2, "Should generate metadata for both sections"
    assert elapsed < 60, f"Metadata generation took {elapsed}s, expected < 60s"
