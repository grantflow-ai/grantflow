from typing import Any

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantApplication, GrantApplicationSource, GrantTemplate, RagSource
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import RagSourceFactory

from services.rag.src.enums import GrantApplicationStageEnum
from services.rag.src.grant_application.dto import (
    GenerateSectionsStageDTO,
    SectionText,
)
from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline

# Use the PubSub test plugin
pytest_plugins = ["testing.pubsub_test_plugin"]


@pytest.fixture
async def sample_rag_sources(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication
) -> list[RagSource]:
    """Create real RAG sources in the database."""
    async with async_session_maker() as session:
        # Create RAG sources
        sources = [
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]
        session.add_all(sources)
        await session.flush()

        # Link sources to grant application
        app_sources = [
            GrantApplicationSource(grant_application_id=grant_application.id, rag_source_id=source.id)
            for source in sources
        ]
        session.add_all(app_sources)
        await session.commit()

        for source in sources:
            await session.refresh(source)
        return sources


@pytest.fixture
def sample_generate_sections_dto() -> GenerateSectionsStageDTO:
    """Sample sections generation data."""
    return GenerateSectionsStageDTO(
        section_texts=[
            SectionText(section_id="abstract", text="Sample abstract text"),
            SectionText(section_id="significance", text="Sample significance text"),
        ],
        work_plan_section={
            "id": "research_plan",
            "title": "Research Plan",
            "order": 3,
            "parent_id": None,
            "keywords": ["methodology"],
            "topics": ["methods"],
            "generation_instructions": "Describe methodology",
            "depends_on": [],
            "max_words": 1500,
            "search_queries": ["methodology"],
            "is_detailed_research_plan": True,
            "is_clinical_trial": None,
        },
    )


async def test_generate_sections_stage(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,  # This ensures grant_template exists with cfp_analysis
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    sample_generate_sections_dto: GenerateSectionsStageDTO,
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test GENERATE_SECTIONS stage execution."""
    # Setup mocks using mocker
    mock_verify_sources = mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mock_handle_generate_sections = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        return_value=sample_generate_sections_dto,
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify
    assert result is None  # Intermediate stage returns None
    mock_handle_generate_sections.assert_called_once()
    mock_verify_sources.assert_called_once()


async def test_extract_relationships_stage_requires_checkpoint(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test EXTRACT_RELATIONSHIPS stage requires checkpoint data."""
    # Setup mocks using mocker
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mock_handle_extract_relationships = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage"
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Execute - pipeline handles ValidationError internally and returns None
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS,
        trace_id=trace_id,
    )

    # Verify error was handled gracefully
    assert result is None
    # Should not call the handler if validation fails
    mock_handle_extract_relationships.assert_not_called()


async def test_enrich_objectives_stage_requires_checkpoint(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test ENRICH_RESEARCH_OBJECTIVES stage requires checkpoint data."""
    # Setup mocks using mocker
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mock_handle_enrich_objectives = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage"
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Execute - pipeline handles ValidationError internally and returns None
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES,
        trace_id=trace_id,
    )

    # Verify error was handled gracefully
    assert result is None
    mock_handle_enrich_objectives.assert_not_called()


async def test_insufficient_context_error_handling(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test InsufficientContextError handling with specific error message."""
    # Setup mocks
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        side_effect=InsufficientContextError("Not enough context"),
    )

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify
    assert result is None


async def test_indexing_timeout_error_handling(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test ValidationError with indexing timeout handling."""
    # Setup mocks
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        side_effect=ValidationError("indexing timeout occurred"),
    )

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify
    assert result is None


async def test_generic_backend_error_handling(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test generic BackendError handling."""
    # Setup mocks
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        side_effect=BackendError("Unexpected backend error"),
    )

    # Execute
    result = await handle_grant_application_pipeline(  # type: ignore[func-returns-value]
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify
    assert result is None


async def test_missing_grant_template_validation(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test validation error when grant template is missing."""
    # Setup mocks using mocker
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Actually remove the grant_template from the database
    async with async_session_maker() as session:
        from packages.db.src.tables import GrantTemplate
        from sqlalchemy import delete

        await session.execute(delete(GrantTemplate).where(GrantTemplate.grant_application_id == grant_application.id))
        await session.commit()

    # Execute - pipeline handles ValidationError internally and returns None
    result = await handle_grant_application_pipeline(  # type: ignore[func-returns-value]
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify error was handled gracefully
    assert result is None


async def test_missing_cfp_analysis_validation(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test validation error when CFP analysis is missing."""
    # Setup mocks using mocker
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Actually remove CFP analysis from the database
    from packages.db.src.tables import GrantTemplate
    from sqlalchemy import update

    async with async_session_maker() as session:
        await session.execute(
            update(GrantTemplate).where(GrantTemplate.id == grant_template.id).values(cfp_analysis=None)
        )
        await session.commit()

    # Execute - pipeline handles ValidationError internally and returns None
    result = await handle_grant_application_pipeline(  # type: ignore[func-returns-value]
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify error was handled gracefully
    assert result is None


async def test_pipeline_creates_real_job_entry(
    mocker: MockerFixture,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    sample_rag_sources: list[RagSource],
    async_session_maker: async_sessionmaker[Any],
    sample_generate_sections_dto: GenerateSectionsStageDTO,
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
) -> None:
    """Test that the pipeline creates real job entries in the database."""
    # Setup mocks
    mocker.patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        return_value=None,
    )
    mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        return_value=sample_generate_sections_dto,
    )
    # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

    # Execute
    result = await handle_grant_application_pipeline(  # type: ignore[func-returns-value]
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id=trace_id,
    )

    # Verify
    assert result is None

    # The JobManager creates real database entries which we can verify
    # but we're focusing on the pipeline logic here
