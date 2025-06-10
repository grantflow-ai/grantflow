from datetime import date
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantTemplate,
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

from services.rag.src.constants import MAX_SOURCE_SIZE, NUM_CHUNKS
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


@pytest.fixture
def mock_publish_notification() -> AsyncMock:
    return AsyncMock(return_value="message-id-123")


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
    mock_publish_notification: AsyncMock,
    funding_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
) -> None:
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_sections",
            return_value=mock_extracted_sections,
        ),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            return_value=mock_section_metadata,
        ),
        patch(
            "services.rag.src.grant_template.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=sample_cfp_content,
            cfp_subject=cfp_subject,
            organization=funding_organization,
            parent_id=parent_id,
        )

    assert len(result) == 3

    assert mock_publish_notification.call_count > 0

    notification_events = [
        call.kwargs["event"] for call in mock_publish_notification.call_args_list if "event" in call.kwargs
    ]

    assert "grant_template_extraction" in notification_events
    assert "sections_extracted" in notification_events
    assert "grant_template_metadata" in notification_events
    assert "metadata_generated" in notification_events

    long_form_sections = [s for s in result if isinstance(s, dict) and "keywords" in s]

    assert len(long_form_sections) == 3

    for section in long_form_sections:
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
    mock_publish_notification: AsyncMock,
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    nih_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
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
        patch(
            "services.rag.src.grant_template.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result = await grant_template_generation_pipeline_handler(
            grant_template_id=grant_template_with_sources.id,
            session_maker=async_session_maker,
        )

    assert isinstance(result, GrantTemplate)

    assert result.id == grant_template_with_sources.id
    assert result.grant_sections is not None
    assert len(result.grant_sections) == 3
    assert result.submission_date == date(2025, 4, 26)
    assert result.funding_organization_id == nih_organization.id

    async with async_session_maker() as session:
        db_result = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == result.id))
        assert db_result is not None
        assert db_result.grant_sections is not None
        assert len(db_result.grant_sections) == 3
        assert db_result.submission_date == date(2025, 4, 26)
        assert db_result.funding_organization_id == nih_organization.id

    notification_events = [
        call.kwargs["event"] for call in mock_publish_notification.call_args_list if "event" in call.kwargs
    ]

    assert "grant_template_generation_started" in notification_events
    assert "extracting_cfp_data" in notification_events
    assert "cfp_data_extracted" in notification_events
    assert "grant_template_extraction" in notification_events
    assert "sections_extracted" in notification_events
    assert "grant_template_metadata" in notification_events
    assert "metadata_generated" in notification_events
    assert "saving_grant_template" in notification_events
    assert "grant_template_created" in notification_events

    cfp_data_extracted_calls = [
        call for call in mock_publish_notification.call_args_list if call.kwargs.get("event") == "cfp_data_extracted"
    ]
    assert len(cfp_data_extracted_calls) > 0

    cfp_data = cfp_data_extracted_calls[0].kwargs["data"]
    assert isinstance(cfp_data, dict)
    assert "data" in cfp_data
    assert "organization" in cfp_data["data"]
    assert "cfp_subject" in cfp_data["data"]
    assert "content_sections" in cfp_data["data"]
    assert "submission_date" in cfp_data["data"]


async def test_pipeline_handler_error_handling(
    mock_publish_notification: AsyncMock,
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    error_message = "Test backend error"
    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_cfp_data_from_rag_sources",
            side_effect=BackendError(error_message, context={"test": "context"}),
        ),
        patch(
            "services.rag.src.grant_template.handler.publish_notification",
            mock_publish_notification,
        ),
        pytest.raises(BackendError),
    ):
        await grant_template_generation_pipeline_handler(
            grant_template_id=grant_template_with_sources.id,
            session_maker=async_session_maker,
        )

    assert mock_publish_notification.call_count > 0

    error_calls = [
        call for call in mock_publish_notification.call_args_list if call.kwargs.get("event") == "pipeline_error"
    ]

    assert len(error_calls) > 0, "Expected error notification was not found"

    error_data = error_calls[0].kwargs["data"]
    assert isinstance(error_data, dict)
    assert "Error in grant template generation:" in error_data["message"]
    assert "data" in error_data
    assert error_data["data"].get("error_type") == "BackendError"
    assert error_data["data"].get("test") == "context"


async def test_idempotent_template_generation(
    mock_publish_notification: AsyncMock,
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    nih_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
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
        patch(
            "services.rag.src.grant_template.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result1 = await grant_template_generation_pipeline_handler(
            grant_template_id=grant_template_with_sources.id,
            session_maker=async_session_maker,
        )

        assert result1.id == grant_template_with_sources.id
        assert result1.submission_date == date(2025, 4, 26)
        assert result1.grant_sections is not None
        assert len(result1.grant_sections) == 3

    async with async_session_maker() as session:
        db_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.id == grant_template_with_sources.id)
        )
        assert db_template is not None
        assert db_template.submission_date == date(2025, 4, 26)
        assert db_template.grant_sections is not None
        assert len(db_template.grant_sections) == 3


async def test_extract_and_enrich_with_title_only_sections(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    mock_publish_notification: AsyncMock,
    funding_organization: FundingOrganization,
    mock_section_metadata: list[SectionMetadata],
) -> None:
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440001")

    mixed_sections = [
        {
            "id": "parent_section",
            "title": "Parent Section",
            "order": 1,
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": False,
            "is_title_only": True,
            "is_clinical_trial": None,
        },
        {
            "id": "abstract",
            "title": "Abstract",
            "order": 2,
            "parent_id": "parent_section",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "research_plan",
            "title": "Research Plan",
            "order": 3,
            "parent_id": "parent_section",
            "is_detailed_workplan": True,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "impact",
            "title": "Impact",
            "order": 4,
            "parent_id": "parent_section",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
    ]

    with (
        patch("services.rag.src.grant_template.handler.handle_extract_sections", return_value=mixed_sections),
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template",
            return_value=mock_section_metadata,
        ),
        patch(
            "services.rag.src.grant_template.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=sample_cfp_content,
            cfp_subject=cfp_subject,
            organization=funding_organization,
            parent_id=parent_id,
        )

    assert len(result) == 4

    title_only_sections = [s for s in result if isinstance(s, dict) and "keywords" not in s]
    long_form_sections = [s for s in result if isinstance(s, dict) and "keywords" in s]

    assert len(title_only_sections) == 1
    assert title_only_sections[0]["id"] == "parent_section"
    assert title_only_sections[0]["title"] == "Parent Section"

    assert len(long_form_sections) == 3


async def test_get_rag_sources_data(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    source1 = RagFileFactory.build(text_content="Source 1 content", source_type="rag_file")
    source2 = RagFileFactory.build(text_content="Source 2 content", source_type="rag_file")

    vector1_1 = TextVectorFactory.build(rag_source_id=source1.id, chunk={"content": "First chunk of source 1"})
    vector1_2 = TextVectorFactory.build(rag_source_id=source1.id, chunk={"content": "Second chunk of source 1"})
    vector2_1 = TextVectorFactory.build(rag_source_id=source2.id, chunk={"content": "First chunk of source 2"})

    async with async_session_maker() as session:
        session.add_all([source1, source2, vector1_1, vector1_2, vector2_1])
        await session.commit()

    source_ids = [str(source1.id), str(source2.id)]
    result = await get_rag_sources_data(source_ids, async_session_maker)

    assert len(result) == 2

    source1_data = next(r for r in result if r["source_id"] == str(source1.id))
    assert source1_data["source_type"] == source1.source_type
    assert source1_data["text_content"] == source1.text_content
    assert len(source1_data["chunks"]) == 2
    assert vector1_1.chunk["content"] in source1_data["chunks"]
    assert vector1_2.chunk["content"] in source1_data["chunks"]

    source2_data = next(r for r in result if r["source_id"] == str(source2.id))
    assert source2_data["source_type"] == source2.source_type
    assert source2_data["text_content"] == source2.text_content
    assert len(source2_data["chunks"]) == 1
    assert vector2_1.chunk["content"] in source2_data["chunks"]


async def test_get_rag_sources_data_empty_source_ids(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    result = await get_rag_sources_data([], async_session_maker)
    assert result == []


async def test_get_rag_sources_data_nonexistent_sources(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    nonexistent_ids = ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
    result = await get_rag_sources_data(nonexistent_ids, async_session_maker)
    assert result == []


async def test_get_rag_sources_data_mixed_existing_nonexistent(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    existing_source = RagFileFactory.build(source_type="rag_file", text_content="Existing source content")
    vector = TextVectorFactory.build(rag_source_id=existing_source.id, chunk={"content": "Test chunk"})

    async with async_session_maker() as session:
        session.add_all([existing_source, vector])
        await session.commit()

    mixed_ids = [str(existing_source.id), "550e8400-e29b-41d4-a716-446655440001"]
    result = await get_rag_sources_data(mixed_ids, async_session_maker)

    assert len(result) == 1
    assert result[0]["source_id"] == str(existing_source.id)


def test_format_rag_sources_for_prompt(mock_rag_sources: list[RagSourceData]) -> None:
    result = format_rag_sources_for_prompt(mock_rag_sources)

    assert "Source 0: RAG_FILE" in result
    assert "This is the full content of the first source document" in result
    assert "0. Chunk 1: Funding eligibility criteria" in result
    assert "1. Chunk 2: Application submission requirements" in result
    assert "2. Chunk 3: Budget guidelines and restrictions" in result

    assert "Source 1: RAG_URL" in result
    assert "This is web content from the funding organization's website" in result
    assert "0. Web chunk 1: Organization mission and values" in result
    assert "1. Web chunk 2: Past funded projects examples" in result

    lines = result.strip().split("\n")
    assert len([line for line in lines if line.startswith("### Source ")]) == 2


def test_format_rag_sources_for_prompt_empty_list() -> None:
    result = format_rag_sources_for_prompt([])
    assert result == ""


def test_format_rag_sources_for_prompt_truncation() -> None:
    long_content = "A" * 10000
    long_chunk = "B" * 1000

    sources: list[RagSourceData] = [
        {
            "source_id": "test-id",
            "source_type": "rag_file",
            "text_content": long_content,
            "chunks": [long_chunk] * 20,
        }
    ]

    result = format_rag_sources_for_prompt(sources)

    assert len(result) < len(long_content) + (len(long_chunk) * 20)
    assert "A" * MAX_SOURCE_SIZE in result or "A" * (MAX_SOURCE_SIZE - 3) + "..." in result
    # The function should only include NUM_CHUNKS chunks (0 through 14)
    # Check that chunks 0-14 are present
    for i in range(NUM_CHUNKS):
        assert f"{i}. " in result
    # Check that chunk 15 and beyond are not present
    assert "15. " not in result
    assert "16. " not in result


def test_format_rag_sources_for_prompt_special_characters() -> None:
    sources: list[RagSourceData] = [
        {
            "source_id": "test-id",
            "source_type": "rag_url",
            "text_content": 'Content with \n newlines \t tabs and "quotes"',
            "chunks": ["Chunk with \n newline", "Chunk with \t tab"],
        }
    ]

    result = format_rag_sources_for_prompt(sources)

    assert "Content with \n newlines \t tabs" in result
    assert "0. Chunk with \n newline" in result
    assert "1. Chunk with \t tab" in result


async def test_extract_cfp_data_multi_source(
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
    formatted_prompt = """
        Organization Mapping:
        nih: National Institutes of Health (aliases: NIH)
        nsf: National Science Foundation (aliases: NSF)

        Source 0: PDF
        Full content: Sample CFP document content
        Chunks:
        - Eligibility requirements
        - Budget guidelines
    """

    with patch(
        "services.rag.src.grant_template.extract_cfp_data.handle_completions_request",
        return_value=mock_extracted_cfp_data,
    ):
        result = await extract_cfp_data_multi_source(formatted_prompt)

    assert result["organization_id"] == mock_extracted_cfp_data["organization_id"]
    assert result["cfp_subject"] == mock_extracted_cfp_data["cfp_subject"]
    assert result["submission_date"] == mock_extracted_cfp_data["submission_date"]
    assert len(result["content"]) == len(mock_extracted_cfp_data["content"])


async def test_extract_cfp_data_multi_source_with_validation_error() -> None:
    formatted_prompt = "Test prompt"

    with (
        patch(
            "services.rag.src.grant_template.extract_cfp_data.handle_completions_request",
            side_effect=ValidationError("Validation failed"),
        ),
        pytest.raises(ValidationError),
    ):
        await extract_cfp_data_multi_source(formatted_prompt)
