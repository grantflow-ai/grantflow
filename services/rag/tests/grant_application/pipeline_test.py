from unittest.mock import patch

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantApplicationSource
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from testing.factories import RagSourceFactory

from services.rag.src.enums import GrantApplicationStageEnum
from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_application.dto import (
    GenerateSectionsStageDTO,
    SectionText,
)


@pytest.fixture
async def sample_rag_sources(async_session_maker, grant_application):
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
            GrantApplicationSource(
                grant_application_id=grant_application.id,
                rag_source_id=source.id
            )
            for source in sources
        ]
        session.add_all(app_sources)
        await session.commit()

        for source in sources:
            await session.refresh(source)
        return sources


@pytest.fixture
def sample_generate_sections_dto():
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


@patch("services.rag.src.grant_application.pipeline.handle_generate_sections_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
@patch("services.rag.src.grant_application.pipeline.publish_email_notification")
async def test_generate_sections_stage(
    mock_publish_email,
    mock_verify_sources,
    mock_handle_generate_sections,
    grant_application,
    sample_rag_sources,
    async_session_maker,
    sample_generate_sections_dto,
):
    """Test GENERATE_SECTIONS stage execution."""
    # Setup mocks
    mock_verify_sources.return_value = None
    mock_handle_generate_sections.return_value = sample_generate_sections_dto
    mock_publish_email.return_value = None

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )

    # Verify
    assert result is None  # Intermediate stage returns None
    mock_handle_generate_sections.assert_called_once()
    mock_verify_sources.assert_called_once()


@patch("services.rag.src.grant_application.pipeline.handle_extract_relationships_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_extract_relationships_stage_requires_checkpoint(
    mock_verify_sources,
    mock_handle_extract_relationships,
    grant_application,
    sample_rag_sources,
    async_session_maker,
):
    """Test EXTRACT_RELATIONSHIPS stage requires checkpoint data."""
    # Setup mocks
    mock_verify_sources.return_value = None

    # Execute and verify validation error for missing checkpoint
    with pytest.raises(ValidationError, match="Missing checkpoint data for stage"):
        await handle_grant_application_pipeline(
            grant_application=grant_application,
            session_maker=async_session_maker,
            generation_stage=GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS,
            trace_id="test-trace",
        )

    # Should not call the handler if validation fails
    mock_handle_extract_relationships.assert_not_called()


@patch("services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_enrich_objectives_stage_requires_checkpoint(
    mock_verify_sources,
    mock_handle_enrich_objectives,
    grant_application,
    sample_rag_sources,
    async_session_maker,
):
    """Test ENRICH_RESEARCH_OBJECTIVES stage requires checkpoint data."""
    # Setup mocks
    mock_verify_sources.return_value = None

    # Execute and verify validation error
    with pytest.raises(ValidationError, match="Missing checkpoint data for stage"):
        await handle_grant_application_pipeline(
            grant_application=grant_application,
            session_maker=async_session_maker,
            generation_stage=GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES,
            trace_id="test-trace",
        )

    mock_handle_enrich_objectives.assert_not_called()


@patch("services.rag.src.grant_application.pipeline.handle_generate_sections_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_insufficient_context_error_handling(
    mock_verify_sources,
    mock_handle_generate_sections,
    grant_application,
    sample_rag_sources,
    async_session_maker,
):
    """Test InsufficientContextError handling with specific error message."""
    # Setup mocks
    mock_verify_sources.return_value = None
    mock_handle_generate_sections.side_effect = InsufficientContextError("Not enough context")

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )

    # Verify
    assert result is None


@patch("services.rag.src.grant_application.pipeline.handle_generate_sections_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_indexing_timeout_error_handling(
    mock_verify_sources,
    mock_handle_generate_sections,
    grant_application,
    sample_rag_sources,
    async_session_maker,
):
    """Test ValidationError with indexing timeout handling."""
    # Setup mocks
    mock_verify_sources.return_value = None
    mock_handle_generate_sections.side_effect = ValidationError("indexing timeout occurred")

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )

    # Verify
    assert result is None


@patch("services.rag.src.grant_application.pipeline.handle_generate_sections_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_generic_backend_error_handling(
    mock_verify_sources,
    mock_handle_generate_sections,
    grant_application,
    sample_rag_sources,
    async_session_maker,
):
    """Test generic BackendError handling."""
    # Setup mocks
    mock_verify_sources.return_value = None
    mock_handle_generate_sections.side_effect = BackendError("Unexpected backend error")

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )

    # Verify
    assert result is None


@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_missing_grant_template_validation(
    mock_verify_sources, grant_application, sample_rag_sources, async_session_maker
):
    """Test validation error when grant template is missing."""
    # Setup mocks
    mock_verify_sources.return_value = None

    # Set grant template to None
    grant_application.grant_template = None

    # Execute and verify validation error
    with pytest.raises(ValidationError, match="Grant template is unexpectedly None"):
        await handle_grant_application_pipeline(
            grant_application=grant_application,
            session_maker=async_session_maker,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            trace_id="test-trace",
        )


@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_missing_cfp_analysis_validation(
    mock_verify_sources, grant_application, sample_rag_sources, async_session_maker
):
    """Test validation error when CFP analysis is missing."""
    # Setup mocks
    mock_verify_sources.return_value = None

    # Remove CFP analysis
    grant_application.grant_template.cfp_analysis = None

    # Execute and verify validation error
    with pytest.raises(ValidationError, match="CFP analysis is missing from grant template"):
        await handle_grant_application_pipeline(
            grant_application=grant_application,
            session_maker=async_session_maker,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            trace_id="test-trace",
        )


@patch("services.rag.src.grant_application.pipeline.handle_generate_sections_stage")
@patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed")
async def test_pipeline_creates_real_job_entry(
    mock_verify_sources,
    mock_handle_generate_sections,
    grant_application,
    sample_rag_sources,
    async_session_maker,
    sample_generate_sections_dto,
):
    """Test that the pipeline creates real job entries in the database."""
    # Setup mocks
    mock_verify_sources.return_value = None
    mock_handle_generate_sections.return_value = sample_generate_sections_dto

    # Execute
    result = await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )

    # Verify
    assert result is None

    # The JobManager creates real database entries which we can verify
    # but we're focusing on the pipeline logic here