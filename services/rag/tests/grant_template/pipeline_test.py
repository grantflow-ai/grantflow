from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.src.grant_template.pipeline_dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)


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

    @patch("services.rag.src.utils.job_manager.publish_notification")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_extract_cfp_content_stage(
        self,
        mock_handle_cfp_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_publish_notification: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    ) -> None:
        """Test EXTRACT_CFP_CONTENT stage execution."""
        # Mock external dependencies only
        mock_handle_cfp_extraction.return_value = sample_extract_cfp_dto
        mock_publish_rag_task.return_value = None
        mock_publish_notification.return_value = None

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_cfp_extraction.assert_called_once()
        mock_publish_rag_task.assert_called_once()

    @patch("services.rag.src.utils.job_manager.publish_notification")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage")
    async def test_analyze_cfp_content_stage(
        self,
        mock_handle_cfp_analysis: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_publish_notification: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
        job_with_extract_cfp_checkpoint: None,
    ) -> None:
        """Test ANALYZE_CFP_CONTENT stage execution."""
        # Mock external dependencies only
        mock_handle_cfp_analysis.return_value = sample_analyze_cfp_dto
        mock_publish_rag_task.return_value = None
        mock_publish_notification.return_value = None

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_cfp_analysis.assert_called_once()
        mock_publish_rag_task.assert_called_once()

    @patch("services.rag.src.utils.job_manager.publish_notification")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_section_extraction_stage")
    async def test_extract_sections_stage(
        self,
        mock_handle_section_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_publish_notification: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_sections_dto: ExtractionSectionsStageDTO,
        job_with_analyze_cfp_checkpoint: None,
    ) -> None:
        """Test EXTRACT_SECTIONS stage execution."""
        # Mock external dependencies only
        mock_handle_section_extraction.return_value = sample_sections_dto
        mock_publish_rag_task.return_value = None
        mock_publish_notification.return_value = None

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_SECTIONS,
            trace_id="test-trace",
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_handle_section_extraction.assert_called_once()
        mock_publish_rag_task.assert_called_once()

    @patch("services.rag.src.utils.job_manager.publish_notification")
    @patch("services.rag.src.grant_template.pipeline.handle_save_grant_template")
    @patch("services.rag.src.grant_template.pipeline.handle_generate_metadata_stage")
    async def test_generate_metadata_stage_final(
        self,
        mock_handle_generate_metadata: AsyncMock,
        mock_handle_save: AsyncMock,
        mock_publish_notification: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        job_with_extract_sections_checkpoint: None,
    ) -> None:
        """Test GENERATE_METADATA stage execution (final stage)."""
        # Mock external dependencies only
        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]
        mock_handle_generate_metadata.return_value = mock_grant_sections
        mock_handle_save.return_value = grant_template
        mock_publish_notification.return_value = None

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.GENERATE_METADATA,
            trace_id="test-trace",
        )

        # Verify
        assert result == grant_template  # Final stage returns GrantTemplate
        mock_handle_generate_metadata.assert_called_once()
        mock_handle_save.assert_called_once()


class TestPipelineErrorHandling:
    """Test comprehensive error handling scenarios."""

    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_insufficient_context_error_handling(
        self,
        mock_handle_cfp_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test InsufficientContextError handling with specific error message."""
        # Mock external dependencies only
        mock_handle_cfp_extraction.side_effect = InsufficientContextError("Not enough context")
        mock_publish_rag_task.return_value = None

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None  # Error handling returns None
        mock_handle_cfp_extraction.assert_called_once()

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_indexing_timeout_error_handling(
        self,
        mock_handle_cfp_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test ValidationError with indexing timeout handling."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Simulate ValidationError with indexing timeout
        mock_handle_cfp_extraction.side_effect = ValidationError("indexing timeout occurred")

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None
        mock_job_manager.add_notification.assert_called_with(
            event=NotificationEvents.INDEXING_TIMEOUT,
            message="Document indexing is taking longer than expected. Please wait a few minutes and try again.",
            notification_type="error",
            data={"error_type": "ValidationError", "recoverable": True},
        )

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_indexing_failed_error_handling(
        self,
        mock_handle_cfp_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test ValidationError with indexing failed handling."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Simulate ValidationError with indexing failed
        mock_handle_cfp_extraction.side_effect = ValidationError("indexing failed completely")

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None
        mock_job_manager.add_notification.assert_called_with(
            event=NotificationEvents.INDEXING_FAILED,
            message="Document indexing failed. Please upload new documents and try again.",
            notification_type="error",
            data={"error_type": "ValidationError", "recoverable": True},
        )

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_generic_backend_error_handling(
        self,
        mock_handle_cfp_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test generic BackendError handling."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Simulate generic BackendError
        mock_handle_cfp_extraction.side_effect = BackendError("Unexpected backend error")

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None
        mock_job_manager.add_notification.assert_called_with(
            event=NotificationEvents.PIPELINE_ERROR,
            message="An unexpected error occurred while processing your grant template. Please try again or contact support if this persists.",
            notification_type="error",
            data={"error_type": "BackendError", "recoverable": False},
        )


class TestPipelineStateManagement:
    """Test pipeline state management and validation."""

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    async def test_missing_checkpoint_data_validation(
        self,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test validation error when checkpoint data is missing for later stages."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = None  # Missing checkpoint data
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Execute and verify validation error
        with pytest.raises(ValidationError, match="Missing checkpoint data for CFP analysis stage"):
            await handle_grant_template_pipeline(
                grant_template=grant_template,
                session_maker=async_session_maker,
                generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
                trace_id="test-trace",
            )

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    async def test_job_status_update_from_pending(
        self,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test job status update from PENDING to PROCESSING."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Mock the extraction handler to avoid full execution
        with patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage") as mock_handler:
            mock_handler.return_value = {}

            await handle_grant_template_pipeline(
                grant_template=grant_template,
                session_maker=async_session_maker,
                generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
                trace_id="test-trace",
            )

        # Verify status update
        mock_job_manager.update_job_status.assert_called_with(RagGenerationStatusEnum.PROCESSING)

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    async def test_job_status_no_update_when_not_pending(
        self,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
    ) -> None:
        """Test no job status update when job is not PENDING."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PROCESSING  # Already processing
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Mock the extraction handler to avoid full execution
        with patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage") as mock_handler:
            mock_handler.return_value = {}

            await handle_grant_template_pipeline(
                grant_template=grant_template,
                session_maker=async_session_maker,
                generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
                trace_id="test-trace",
            )

        # Verify no status update call
        mock_job_manager.update_job_status.assert_not_called()


class TestPipelineDataFlow:
    """Test data flow and DTO casting between stages."""

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage")
    async def test_checkpoint_data_casting_analyze_stage(
        self,
        mock_handle_cfp_analysis: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    ) -> None:
        """Test correct DTO casting for ANALYZE_CFP_CONTENT stage."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PROCESSING
        mock_job.checkpoint_data = sample_extract_cfp_dto
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_handle_cfp_analysis.return_value = sample_extract_cfp_dto

        # Execute
        await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify the DTO was passed correctly
        mock_handle_cfp_analysis.assert_called_once()
        call_args = mock_handle_cfp_analysis.call_args
        assert call_args.kwargs["extracted_cfp"] == sample_extract_cfp_dto

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.utils.job_manager.publish_rag_task")
    @patch("services.rag.src.grant_template.pipeline.handle_section_extraction_stage")
    async def test_checkpoint_data_casting_sections_stage(
        self,
        mock_handle_section_extraction: AsyncMock,
        mock_publish_rag_task: AsyncMock,
        mock_job_manager_class: AsyncMock,
        grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
    ) -> None:
        """Test correct DTO casting for EXTRACT_SECTIONS stage."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PROCESSING
        mock_job.checkpoint_data = sample_analyze_cfp_dto
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_handle_section_extraction.return_value = sample_analyze_cfp_dto

        # Execute
        await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_SECTIONS,
            trace_id="test-trace",
        )

        # Verify the DTO was passed correctly
        mock_handle_section_extraction.assert_called_once()
        call_args = mock_handle_section_extraction.call_args
        assert call_args.kwargs["analysis_result"] == sample_analyze_cfp_dto
