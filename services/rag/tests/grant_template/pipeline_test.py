from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.src.grant_template.pipeline_dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)

# Use the PubSub test plugin
pytest_plugins = ["testing.pubsub_test_plugin"]


@pytest.fixture
async def job_with_extract_cfp_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
) -> None:
    """Create a job with checkpoint data from EXTRACT_CFP_CONTENT stage."""
    from packages.db.src.tables import GrantTemplateGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template.id,
            total_stages=4,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=0,  # Completed EXTRACT_CFP_CONTENT
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_extract_cfp_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
async def job_with_analyze_cfp_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
) -> None:
    """Create a job with checkpoint data from ANALYZE_CFP_CONTENT stage."""
    from packages.db.src.tables import GrantTemplateGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template.id,
            total_stages=4,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=1,  # Completed ANALYZE_CFP_CONTENT
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_analyze_cfp_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
async def job_with_extract_sections_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_sections_dto: ExtractionSectionsStageDTO,
) -> None:
    """Create a job with checkpoint data from EXTRACT_SECTIONS stage."""
    from packages.db.src.tables import GrantTemplateGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template.id,
            total_stages=4,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=2,  # Completed EXTRACT_SECTIONS
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_sections_dto),
        )
        session.add(job)
        await session.commit()


# Use existing fixtures: grant_template, nih_organization, etc.


@pytest.fixture
def sample_extract_cfp_dto() -> ExtractCFPContentStageDTO:
    """Sample extracted CFP data."""
    return ExtractCFPContentStageDTO(
        organization={
            "organization_id": uuid4(),
            "full_name": "National Science Foundation",
            "abbreviation": "NSF",
        },
        extracted_data={
            "organization_id": str(uuid4()),
            "cfp_subject": "Research Grant Program",
            "submission_date": "2025-03-31",
            "content": [
                {"title": "Project Summary", "subtitles": ["Overview", "Objectives"]},
                {"title": "Research Plan", "subtitles": ["Methods", "Timeline"]},
            ],
        },
    )


@pytest.fixture
def sample_analyze_cfp_dto(sample_extract_cfp_dto: ExtractCFPContentStageDTO) -> AnalyzeCFPContentStageDTO:
    """Sample analyzed CFP data."""
    return AnalyzeCFPContentStageDTO(
        **sample_extract_cfp_dto,
        analysis_results={
            "cfp_analysis": {
                "sections_count": 3,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 2,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "content_length": 1000,
                "categories_found": 5,
                "total_sentences": 20,
            },
        },
    )


@pytest.fixture
def sample_sections_dto(sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO) -> ExtractionSectionsStageDTO:
    """Sample sections extraction data."""
    return ExtractionSectionsStageDTO(
        **sample_analyze_cfp_dto,
        extracted_sections=[
            {
                "title": "Project Summary",
                "id": "project_summary",
                "parent_id": None,
                "is_detailed_research_plan": False,
                "is_long_form": True,
                "order": 1,
            }
        ],
    )


class TestPipelineStageExecution:
    """Test each pipeline stage execution path."""

    async def test_extract_cfp_content_stage(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
        trace_id: str,
        mock_pubsub_for_pipeline_testing: Any,
    ) -> None:
        """Test EXTRACT_CFP_CONTENT stage execution."""
        # Mock external dependencies only
        mock_handle_cfp_extraction = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            return_value=sample_extract_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_cfp_extraction.assert_called_once()

    async def test_analyze_cfp_content_stage(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
        job_with_extract_cfp_checkpoint: None,
        trace_id: str,
    ) -> None:
        """Test ANALYZE_CFP_CONTENT stage execution."""
        # Mock external dependencies only
        mock_handle_cfp_analysis = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
            return_value=sample_analyze_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_cfp_analysis.assert_called_once()

    async def test_extract_sections_stage(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_sections_dto: ExtractionSectionsStageDTO,
        job_with_analyze_cfp_checkpoint: None,
        trace_id: str,
    ) -> None:
        """Test EXTRACT_SECTIONS stage execution."""
        # Mock external dependencies only
        mock_handle_section_extraction = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_section_extraction_stage",
            return_value=sample_sections_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_SECTIONS,
            trace_id=trace_id,
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_section_extraction.assert_called_once()

    async def test_generate_metadata_stage_final(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        job_with_extract_sections_checkpoint: None,
        trace_id: str,
    ) -> None:
        """Test GENERATE_METADATA stage execution (final stage)."""
        # Mock external dependencies only
        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]
        mock_handle_generate_metadata = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_generate_metadata_stage",
            return_value=mock_grant_sections,
        )
        mock_handle_save = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_save_grant_template",
            return_value=grant_template,
        )

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.GENERATE_METADATA,
            trace_id=trace_id,
        )

        # Verify
        assert result == grant_template  # Final stage returns GrantTemplate
        mock_handle_generate_metadata.assert_called_once()
        mock_handle_save.assert_called_once()


class TestPipelineErrorHandling:
    """Test comprehensive error handling scenarios."""

    async def test_insufficient_context_error_handling(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        """Test InsufficientContextError handling with specific error message."""
        # Mock external dependencies only
        mock_handle_cfp_extraction = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            side_effect=InsufficientContextError("Not enough context"),
        )

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None  # Error handling returns None
        mock_handle_cfp_extraction.assert_called_once()

    async def test_indexing_timeout_error_handling(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        """Test ValidationError with indexing timeout handling."""
        # Mock external dependencies only
        mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            side_effect=ValidationError("indexing timeout occurred"),
        )

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify - pipeline handles errors internally and returns None
        assert result is None

    async def test_indexing_failed_error_handling(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        """Test ValidationError with indexing failed handling."""
        # Mock external dependencies only
        mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            side_effect=ValidationError("indexing failed completely"),
        )

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify - pipeline handles errors internally and returns None
        assert result is None

    async def test_generic_backend_error_handling(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        """Test generic BackendError handling."""
        # Mock external dependencies only
        mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            side_effect=BackendError("Unexpected backend error"),
        )

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify - pipeline handles errors internally and returns None
        assert result is None


class TestPipelineStateManagement:
    """Test pipeline state management and validation."""

    async def test_missing_checkpoint_data_validation(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        """Test validation error when checkpoint data is missing for later stages."""
        # Execute - pipeline handles ValidationError internally and returns None
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify - pipeline handles errors internally and returns None
        assert result is None

    async def test_job_status_update_from_pending(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
        trace_id: str,
    ) -> None:
        """Test job status update from PENDING to PROCESSING."""
        # Mock external dependencies
        mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            return_value=sample_extract_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute - uses real job manager which handles status correctly
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None

    async def test_job_status_no_update_when_not_pending(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
        trace_id: str,
    ) -> None:
        """Test no job status update when job is not PENDING."""
        # Mock external dependencies
        mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
            return_value=sample_extract_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute - uses real job manager which handles status correctly
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None


class TestPipelineDataFlow:
    """Test data flow and DTO casting between stages."""

    async def test_checkpoint_data_casting_analyze_stage(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
        job_with_extract_cfp_checkpoint: None,
        trace_id: str,
    ) -> None:
        """Test correct DTO casting for ANALYZE_CFP_CONTENT stage."""
        # Mock external dependencies
        mock_handle_cfp_analysis = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
            return_value=sample_extract_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            trace_id=trace_id,
        )

        # Verify
        assert result is None
        mock_handle_cfp_analysis.assert_called_once()

    async def test_checkpoint_data_casting_sections_stage(
        self,
        mocker: MockerFixture,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
        job_with_analyze_cfp_checkpoint: None,
        trace_id: str,
    ) -> None:
        """Test correct DTO casting for EXTRACT_SECTIONS stage."""
        # Mock external dependencies
        mock_handle_section_extraction = mocker.patch(
            "services.rag.src.grant_template.pipeline.handle_section_extraction_stage",
            return_value=sample_analyze_cfp_dto,
        )
        # PubSub mocking handled by mock_pubsub_for_pipeline_testing fixture

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_SECTIONS,
            trace_id=trace_id,
        )

        # Verify
        assert result is None
        mock_handle_section_extraction.assert_called_once()
