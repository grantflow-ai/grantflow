from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.src.grant_template.pipeline_dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)


@pytest.fixture
def mock_job_manager():
    """Mock job manager with all required methods."""
    manager = AsyncMock()
    manager.get_or_create_job = AsyncMock()
    manager.ensure_not_cancelled = AsyncMock()
    manager.update_job_status = AsyncMock()
    manager.to_next_job_stage = AsyncMock()
    manager.add_notification = AsyncMock()
    return manager


@pytest.fixture
def mock_job():
    """Mock job object."""
    job = AsyncMock()
    job.id = uuid4()
    job.status = RagGenerationStatusEnum.PENDING
    job.current_stage = GrantTemplateStageEnum.EXTRACT_CFP_CONTENT
    job.checkpoint_data = {}
    return job


# Use existing fixtures: grant_template, nih_organization, etc.


@pytest.fixture
def sample_extract_cfp_dto():
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
def sample_analyze_cfp_dto(sample_extract_cfp_dto):
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
def sample_sections_dto(sample_analyze_cfp_dto):
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

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_extract_cfp_content_stage(
        self, mock_handle_cfp_extraction, mock_job_manager_class, grant_template, async_session_maker, sample_extract_cfp_dto
    ) -> None:
        """Test EXTRACT_CFP_CONTENT stage execution."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_handle_cfp_extraction.return_value = sample_extract_cfp_dto

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None  # Intermediate stage returns None
        mock_job_manager.update_job_status.assert_called_once_with(RagGenerationStatusEnum.PROCESSING)
        mock_handle_cfp_extraction.assert_called_once()
        mock_job_manager.to_next_job_stage.assert_called_once_with(sample_extract_cfp_dto)

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage")
    async def test_analyze_cfp_content_stage(
        self, mock_handle_cfp_analysis, mock_job_manager_class, grant_template, async_session_maker, sample_extract_cfp_dto, sample_analyze_cfp_dto
    ) -> None:
        """Test ANALYZE_CFP_CONTENT stage execution."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = sample_extract_cfp_dto
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_handle_cfp_analysis.return_value = sample_analyze_cfp_dto

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
        mock_job_manager.to_next_job_stage.assert_called_once_with(sample_analyze_cfp_dto)

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_section_extraction_stage")
    async def test_extract_sections_stage(
        self, mock_handle_section_extraction, mock_job_manager_class, grant_template, async_session_maker, sample_analyze_cfp_dto, sample_sections_dto
    ) -> None:
        """Test EXTRACT_SECTIONS stage execution."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = sample_analyze_cfp_dto
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_handle_section_extraction.return_value = sample_sections_dto

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
        mock_job_manager.to_next_job_stage.assert_called_once_with(sample_sections_dto)

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_generate_metadata_stage")
    @patch("services.rag.src.grant_template.pipeline.handle_save_grant_template")
    async def test_generate_metadata_stage_final(
        self, mock_handle_save, mock_handle_generate_metadata, mock_job_manager_class, grant_template, async_session_maker, sample_sections_dto
    ) -> None:
        """Test GENERATE_METADATA stage execution (final stage)."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = sample_sections_dto
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]
        mock_handle_generate_metadata.return_value = mock_grant_sections
        mock_handle_save.return_value = grant_template

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
        mock_job_manager.add_notification.assert_called()


class TestPipelineErrorHandling:
    """Test comprehensive error handling scenarios."""

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_insufficient_context_error_handling(
        self, mock_handle_cfp_extraction, mock_job_manager_class, grant_template, async_session_maker
    ) -> None:
        """Test InsufficientContextError handling with specific error message."""
        # Setup mocks
        mock_job_manager = AsyncMock()
        mock_job_manager_class.return_value = mock_job_manager

        mock_job = AsyncMock()
        mock_job.id = uuid4()
        mock_job.status = RagGenerationStatusEnum.PENDING
        mock_job.checkpoint_data = {}
        mock_job_manager.get_or_create_job = AsyncMock(return_value=mock_job)

        # Simulate InsufficientContextError
        mock_handle_cfp_extraction.side_effect = InsufficientContextError("Not enough context")

        # Execute
        result = await handle_grant_template_pipeline(
            grant_template=grant_template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

        # Verify
        assert result is None
        mock_job_manager.update_job_status.assert_called_with(
            status=RagGenerationStatusEnum.FAILED,
            error_message="The uploaded document doesn't contain sufficient information about the required application sections. Please upload a complete Call for Proposals (CFP) document that includes details about application requirements and sections.",
            error_details={"error_type": "InsufficientContextError", "recoverable": True},
        )
        mock_job_manager.add_notification.assert_called_with(
            event=NotificationEvents.INSUFFICIENT_CONTEXT_ERROR,
            message="The uploaded document doesn't contain sufficient information about the required application sections. Please upload a complete Call for Proposals (CFP) document that includes details about application requirements and sections.",
            notification_type="error",
            data={"error_type": "InsufficientContextError", "recoverable": True},
        )

    @patch("services.rag.src.grant_template.pipeline.GrantTemplateJobManager")
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_indexing_timeout_error_handling(
        self, mock_handle_cfp_extraction, mock_job_manager_class, grant_template, async_session_maker
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
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_indexing_failed_error_handling(
        self, mock_handle_cfp_extraction, mock_job_manager_class, grant_template, async_session_maker
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
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage")
    async def test_generic_backend_error_handling(
        self, mock_handle_cfp_extraction, mock_job_manager_class, grant_template, async_session_maker
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
    async def test_missing_checkpoint_data_validation(
        self, mock_job_manager_class, grant_template, async_session_maker
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
    async def test_job_status_update_from_pending(
        self, mock_job_manager_class, grant_template, async_session_maker
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
    async def test_job_status_no_update_when_not_pending(
        self, mock_job_manager_class, grant_template, async_session_maker
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
    @patch("services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage")
    async def test_checkpoint_data_casting_analyze_stage(
        self, mock_handle_cfp_analysis, mock_job_manager_class, grant_template, async_session_maker, sample_extract_cfp_dto
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
    @patch("services.rag.src.grant_template.pipeline.handle_section_extraction_stage")
    async def test_checkpoint_data_casting_sections_stage(
        self, mock_handle_section_extraction, mock_job_manager_class, grant_template, async_session_maker, sample_analyze_cfp_dto
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
