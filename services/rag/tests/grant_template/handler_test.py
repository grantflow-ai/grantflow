from typing import TYPE_CHECKING, Any, cast
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantTemplate,
    GrantTemplateRagSource,
)
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import (
    GrantTemplateFactory,
    GrantTemplateSourceFactory,
    RagFileFactory,
    TextVectorFactory,
)

from services.rag.src.constants import MAX_SOURCE_SIZE, NUM_CHUNKS, NotificationEvents
from services.rag.src.grant_template.determine_application_sections import ExtractedSectionDTO
from services.rag.src.grant_template.determine_longform_metadata import SectionMetadata
from services.rag.src.grant_template.extract_cfp_data import (
    Content,
    RagSourceData,
    extract_cfp_data_multi_source,
    format_rag_sources_for_prompt,
    get_rag_sources_data,
)
from services.rag.src.grant_template.handler import (
    extract_and_enrich_sections,
    grant_template_generation_pipeline_handler,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection


@pytest.fixture
def mock_extracted_sections() -> list[ExtractedSectionDTO]:
    return [
        {
            "id": "abstract",
            "title": "Abstract",
            "order": 1,
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "research_plan",
            "title": "Research Plan",
            "order": 2,
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "impact",
            "title": "Impact",
            "order": 3,
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
    ]


@pytest.fixture
def mock_section_metadata() -> list[SectionMetadata]:
    return [
        {
            "id": "abstract",
            "keywords": ["research", "overview", "summary"],
            "topics": ["project_summary", "objectives"],
            "generation_instructions": "Write a concise summary of the research project.",
            "depends_on": [],
            "max_words": 300,
            "search_queries": ["research summary", "project overview", "study objectives"],
        },
        {
            "id": "research_plan",
            "keywords": ["methodology", "design", "procedures"],
            "topics": ["methods", "experimental_design", "data_analysis"],
            "generation_instructions": "Describe the detailed methodology for the research project.",
            "depends_on": [],
            "max_words": 1500,
            "search_queries": ["research methodology", "experimental design", "data collection procedures"],
        },
        {
            "id": "impact",
            "keywords": ["significance", "outcomes", "benefits"],
            "topics": ["expected_outcomes", "potential_impact"],
            "generation_instructions": "Explain the potential impact and significance of the research.",
            "depends_on": ["research_plan"],
            "max_words": 500,
            "search_queries": ["research impact", "project significance", "expected outcomes"],
        },
    ]


@pytest.fixture
def mock_extracted_cfp_data(
    nih_organization: FundingOrganization,
) -> dict[str, Any]:
    return {
        "organization_id": str(nih_organization.id),
        "cfp_subject": "Test CFP Subject",
        "content": [
            {"title": "Introduction", "subtitles": ["Background", "Purpose"]},
            {"title": "Research Plan", "subtitles": ["Methods", "Analysis"]},
            {"title": "Evaluation", "subtitles": ["Metrics", "Timeline"]},
        ],
        "submission_date": "2025-04-26",
    }


@pytest.fixture
def sample_cfp_content() -> list[Content]:
    return [
        {"title": "Introduction", "subtitles": ["Background", "Purpose"]},
        {"title": "Research Plan", "subtitles": ["Methods", "Analysis"]},
        {"title": "Evaluation", "subtitles": ["Metrics", "Timeline"]},
    ]


@pytest.fixture
def cfp_subject() -> str:
    return "Test grant for researching innovative approaches to healthcare"


@pytest.fixture
async def cfp_file_content() -> str:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"
    return cfp_content_file.read_text()


@pytest.fixture
def mock_rag_sources() -> list[RagSourceData]:
    return [
        {
            "source_id": "source-1-id",
            "source_type": "rag_file",
            "text_content": "This is the full content of the first source document about funding opportunities.",
            "chunks": [
                "Chunk 1: Funding eligibility criteria",
                "Chunk 2: Application submission requirements",
                "Chunk 3: Budget guidelines and restrictions",
            ],
        },
        {
            "source_id": "source-2-id",
            "source_type": "rag_url",
            "text_content": "This is web content from the funding organization's website with additional details.",
            "chunks": [
                "Web chunk 1: Organization mission and values",
                "Web chunk 2: Past funded projects examples",
            ],
        },
    ]


@pytest.fixture
async def test_grant_template(
    async_session_maker: async_sessionmaker[Any],
    nih_organization: FundingOrganization,
    grant_application: GrantApplication,
) -> GrantTemplate:
    template = GrantTemplateFactory.build(
        funding_organization_id=nih_organization.id,
        grant_application_id=grant_application.id,
        grant_sections=None,
        submission_date=None,
    )

    async with async_session_maker() as session:
        session.add(template)
        await session.commit()
        await session.refresh(template)

    return template


@pytest.fixture
async def grant_template_with_sources(
    async_session_maker: async_sessionmaker[Any],
    test_grant_template: GrantTemplate,
) -> GrantTemplate:
    source1 = RagFileFactory.build(
        text_content="This is the full content of the first source document about funding opportunities.",
        source_type="rag_file",
        mime_type="application/pdf",
    )
    source2 = RagFileFactory.build(
        text_content="This is web content from the funding organization's website with additional details.",
        source_type="rag_file",
        mime_type="text/html",
    )

    vector1_1 = TextVectorFactory.build(
        rag_source_id=source1.id,
        chunk={"content": "Chunk 1: Funding eligibility criteria"},
    )
    vector1_2 = TextVectorFactory.build(
        rag_source_id=source1.id,
        chunk={"content": "Chunk 2: Application submission requirements"},
    )
    vector1_3 = TextVectorFactory.build(
        rag_source_id=source1.id,
        chunk={"content": "Chunk 3: Budget guidelines and restrictions"},
    )
    vector2_1 = TextVectorFactory.build(
        rag_source_id=source2.id,
        chunk={"content": "Web chunk 1: Organization mission and values"},
    )
    vector2_2 = TextVectorFactory.build(
        rag_source_id=source2.id,
        chunk={"content": "Web chunk 2: Past funded projects examples"},
    )

    async with async_session_maker() as session:
        session.add_all(
            [
                source1,
                source2,
                vector1_1,
                vector1_2,
                vector1_3,
                vector2_1,
                vector2_2,
            ]
        )
        await session.commit()

    template_source1 = GrantTemplateSourceFactory.build(
        grant_template_id=test_grant_template.id,
        rag_source_id=source1.id,
    )
    template_source2 = GrantTemplateSourceFactory.build(
        grant_template_id=test_grant_template.id,
        rag_source_id=source2.id,
    )

    async with async_session_maker() as session:
        session.add_all([template_source1, template_source2])
        await session.commit()

    return test_grant_template


async def test_extract_and_enrich_sections_with_mocked_llm(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    funding_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
) -> None:
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_sections",
            return_value=mock_extracted_sections,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            return_value=mock_section_metadata,
        ),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=sample_cfp_content,
            cfp_subject=cfp_subject,
            organization=funding_organization,
            parent_id=parent_id,
            job_manager=mock_job_manager,
        )

    assert len(result) == 3

    assert mock_job_manager.add_notification.call_count > 0

    notification_events = [
        call.kwargs["event"] for call in mock_job_manager.add_notification.call_args_list if "event" in call.kwargs
    ]

    assert NotificationEvents.GRANT_TEMPLATE_EXTRACTION in notification_events
    assert NotificationEvents.SECTIONS_EXTRACTED in notification_events
    assert NotificationEvents.GRANT_TEMPLATE_METADATA in notification_events
    assert NotificationEvents.METADATA_GENERATED in notification_events

    long_form_sections = [s for s in result if isinstance(s, dict) and "keywords" in s]

    assert len(long_form_sections) == 3

    for section in long_form_sections:
        section = cast("GrantLongFormSection", section)
        assert "keywords" in section
        assert "topics" in section
        assert "generation_instructions" in section
        assert "depends_on" in section
        assert "max_words" in section
        assert "search_queries" in section

        assert isinstance(section["keywords"], list)
        assert isinstance(section["topics"], list)
        assert isinstance(section["generation_instructions"], str)
        assert isinstance(section["max_words"], int)
        assert isinstance(section["search_queries"], list)

    workplan_sections = [s for s in long_form_sections if s.get("is_detailed_workplan")]
    assert len(workplan_sections) == 1, "Exactly one section should be marked as a detailed workplan"
    assert workplan_sections[0]["id"] == "research_plan"


async def test_grant_template_generation_pipeline_handler_with_mocked_llm(
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    nih_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
    mock_job = AsyncMock()
    mock_job.id = UUID("00000000-0000-0000-0000-000000000001")

    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_template_job = AsyncMock(return_value=mock_job)
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_cfp_data_from_rag_sources",
            return_value=mock_extracted_cfp_data,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_extract_sections",
            return_value=mock_extracted_sections,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            return_value=mock_section_metadata,
        ),
    ):
        result = await grant_template_generation_pipeline_handler(
            grant_template_id=grant_template_with_sources.id,
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )

    assert mock_job_manager.add_notification.call_count > 0

    assert result.id == grant_template_with_sources.id
    assert result.grant_sections is not None
    assert len(result.grant_sections) == 3

    for section in result.grant_sections:
        assert "id" in section
        assert "title" in section
        assert "order" in section

    long_form_sections = [s for s in result.grant_sections if not s.get("is_title_only", False)]
    assert len(long_form_sections) == 3

    for section in long_form_sections:
        assert "keywords" in section
        assert "topics" in section
        assert "generation_instructions" in section
        assert "depends_on" in section
        assert "max_words" in section
        assert "search_queries" in section

    workplan_sections = [s for s in long_form_sections if s.get("is_detailed_workplan")]
    assert len(workplan_sections) == 1
    assert workplan_sections[0]["id"] == "research_plan"


async def test_get_rag_sources_data(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sources: GrantTemplate,
) -> None:
    async with async_session_maker() as session:
        stmt = select(GrantTemplateRagSource.rag_source_id).where(
            GrantTemplateRagSource.grant_template_id == grant_template_with_sources.id
        )
        result = await session.execute(stmt)
        source_ids = [str(row[0]) for row in result.fetchall()]

    result = await get_rag_sources_data(
        source_ids=source_ids,
        session_maker=async_session_maker,
    )

    assert len(result) == 2

    source1 = next(s for s in result if "Funding eligibility criteria" in str(s["chunks"]))
    assert source1["source_type"] == "rag_file"
    assert len(source1["chunks"]) == 3
    assert "Funding eligibility criteria" in source1["chunks"][0]
    assert "Application submission requirements" in source1["chunks"][1]
    assert "Budget guidelines and restrictions" in source1["chunks"][2]

    source2 = next(s for s in result if "Organization mission and values" in str(s["chunks"]))
    assert source2["source_type"] == "rag_file"
    assert len(source2["chunks"]) == 2
    assert "Organization mission and values" in source2["chunks"][0]
    assert "Past funded projects examples" in source2["chunks"][1]


def test_format_rag_sources_for_prompt(mock_rag_sources: list[RagSourceData]) -> None:
    formatted = format_rag_sources_for_prompt(mock_rag_sources)

    assert "Source 1 (rag_file)" in formatted
    assert "Source 2 (rag_url)" in formatted

    assert "full content of the first source document" in formatted
    assert "web content from the funding organization" in formatted

    assert "Chunk 1: Funding eligibility criteria" in formatted
    assert "Web chunk 2: Past funded projects examples" in formatted

    total_size = sum(len(source["text_content"]) for source in mock_rag_sources)
    size_ratio = total_size / MAX_SOURCE_SIZE
    assert f"Using {NUM_CHUNKS} most relevant chunks" in formatted
    assert f"({size_ratio * 100:.1f}% of max capacity)" in formatted


async def test_extract_cfp_data_multi_source(mock_rag_sources: list[RagSourceData]) -> None:
    task_description = format_rag_sources_for_prompt(mock_rag_sources)
    formatted = await extract_cfp_data_multi_source(task_description)

    assert "cfp_subject" in formatted
    assert "content" in formatted

    assert len(formatted["cfp_subject"]) > 0

    assert isinstance(formatted["content"], list)
    assert len(formatted["content"]) > 0


async def test_grant_template_generation_pipeline_missing_sources(
    async_session_maker: async_sessionmaker[Any],
    test_grant_template: GrantTemplate,
) -> None:
    """Test that the pipeline fails gracefully when grant template has no sources."""
    with pytest.raises(ValidationError) as exc_info:
        await grant_template_generation_pipeline_handler(
            grant_template_id=test_grant_template.id,
            session_maker=async_session_maker,
        )

    assert "no sources" in str(exc_info.value).lower()


async def test_grant_template_generation_pipeline_unindexed_sources(
    async_session_maker: async_sessionmaker[Any],
    test_grant_template: GrantTemplate,
) -> None:
    """Test that the pipeline fails when sources are not properly indexed."""

    source = RagFileFactory.build(
        text_content="Test content",
        source_type="rag_file",
        mime_type="application/pdf",
    )

    async with async_session_maker() as session:
        session.add(source)
        await session.commit()

    template_source = GrantTemplateSourceFactory.build(
        grant_template_id=test_grant_template.id,
        rag_source_id=source.id,
    )

    async with async_session_maker() as session:
        session.add(template_source)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await grant_template_generation_pipeline_handler(
            grant_template_id=test_grant_template.id,
            session_maker=async_session_maker,
        )

    assert "not fully indexed" in str(exc_info.value).lower()


async def test_extract_and_enrich_sections_empty_cfp_content(
    cfp_subject: str,
    funding_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
) -> None:
    """Test extract_and_enrich_sections with empty CFP content."""
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_sections",
            return_value=mock_extracted_sections,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            return_value=mock_section_metadata,
        ),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=[],
            cfp_subject=cfp_subject,
            organization=funding_organization,
            parent_id=parent_id,
            job_manager=mock_job_manager,
        )

    assert len(result) == 3


async def test_extract_and_enrich_sections_validation_error(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    funding_organization: FundingOrganization,
) -> None:
    """Test that extract_and_enrich_sections handles validation errors properly."""
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with patch(
        "services.rag.src.grant_template.handler.handle_extract_sections",
        side_effect=ValidationError("Invalid sections"),
    ):
        with pytest.raises(ValidationError) as exc_info:
            await extract_and_enrich_sections(
                cfp_content=sample_cfp_content,
                cfp_subject=cfp_subject,
                organization=funding_organization,
                parent_id=parent_id,
                job_manager=mock_job_manager,
            )

        assert "Invalid sections" in str(exc_info.value)


async def test_extract_and_enrich_sections_backend_error(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    funding_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
) -> None:
    """Test that extract_and_enrich_sections handles backend errors properly."""
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_sections",
            return_value=mock_extracted_sections,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            side_effect=BackendError("LLM service unavailable"),
        ),
    ):
        with pytest.raises(BackendError) as exc_info:
            await extract_and_enrich_sections(
                cfp_content=sample_cfp_content,
                cfp_subject=cfp_subject,
                organization=funding_organization,
                parent_id=parent_id,
                job_manager=mock_job_manager,
            )

        assert "LLM service unavailable" in str(exc_info.value)
