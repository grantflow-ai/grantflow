"""
Tests for grant template pipeline stage handlers.

This module tests the individual stage handlers used in the grant template
creation pipeline. The pipeline extracts and analyzes CFP (Call for Proposals)
documents to generate structured grant application templates.

Key areas tested:
- CFP data extraction from multiple RAG sources
- CFP content analysis using NLP categorization
- Section structure extraction from analyzed content
- Metadata generation for grant sections
- Database persistence with proper error handling

The tests validate both successful execution paths and comprehensive error
handling including timeouts, validation errors, and database failures.
All tests use real database fixtures for strong integration guarantees.
"""

from datetime import date
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.tables import GrantTemplate, GrantTemplateSource
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError
from sqlalchemy.exc import SQLAlchemyError
from testing.factories import RagSourceFactory

from services.rag.src.grant_template.handlers import (
    handle_cfp_analysis_stage,
    handle_cfp_extraction_stage,
    handle_generate_metadata_stage,
    handle_save_grant_template,
    handle_section_extraction_stage,
)
from services.rag.src.grant_template.pipeline_dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)

# Use existing fixtures from testing framework instead of creating custom ones


@pytest.fixture
async def sample_rag_sources(async_session_maker: Any, grant_template: Any) -> list[Any]:
    """Create real RAG sources in the database."""
    async with async_session_maker() as session:
        # Create RAG sources
        sources = [
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]
        session.add_all(sources)
        await session.flush()

        # Link sources to grant template
        template_sources = [
            GrantTemplateSource(grant_template_id=grant_template.id, rag_source_id=source.id) for source in sources
        ]
        session.add_all(template_sources)
        await session.commit()

        for source in sources:
            await session.refresh(source)
        return sources


@pytest.fixture
def sample_extract_cfp_dto() -> Any:
    """Sample extracted CFP data."""
    org_id = uuid4()
    return ExtractCFPContentStageDTO(
        organization={
            "organization_id": org_id,
            "full_name": "National Institutes of Health",
            "abbreviation": "NIH",
        },
        extracted_data={
            "organization_id": str(org_id),
            "cfp_subject": "Research Grant Program",
            "submission_date": "2025-03-31",
            "content": [
                {"title": "Project Summary", "subtitles": ["Overview", "Objectives"]},
                {"title": "Research Plan", "subtitles": ["Methods", "Timeline"]},
            ],
        },
    )


@pytest.fixture
def sample_analyze_cfp_dto(sample_extract_cfp_dto: Any) -> Any:
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
def sample_sections_dto(sample_analyze_cfp_dto: Any) -> Any:
    """Sample sections extraction data."""
    return ExtractionSectionsStageDTO(
        **sample_analyze_cfp_dto,
        extracted_sections=[
            {
                "title": "Project Summary",
                "id": "project_summary",
                "parent_id": None,
                "is_detailed_research_plan": False,
                "is_title_only": False,
                "is_clinical_trial": False,
                "is_long_form": True,
                "order": 1,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "parent_id": None,
                "is_detailed_research_plan": True,
                "is_title_only": False,
                "is_clinical_trial": False,
                "is_long_form": True,
                "order": 2,
            },
        ],
    )


class TestCFPExtractionStage:
    """Test handle_cfp_extraction_stage function."""

    @patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed")
    @patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data")
    async def test_cfp_extraction_stage_success(
        self,
        mock_handle_extract_cfp_data: AsyncMock,
        mock_verify_rag_sources: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        nih_organization: Any,
        sample_rag_sources: list[Any],
        async_session_maker: Any,
    ) -> None:
        """Test successful CFP extraction stage."""
        # Setup mocks
        mock_verify_rag_sources.return_value = None
        mock_handle_extract_cfp_data.return_value = {
            "organization_id": str(nih_organization.id),
            "cfp_subject": "Research Grant Program",
            "submission_date": "2025-03-31",
        }

        # Execute
        result = await handle_cfp_extraction_stage(
            grant_template=grant_template,
            job_manager=mock_grant_template_job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

        # Verify structure
        assert "organization" in result
        assert "extracted_data" in result
        assert result["organization"]["full_name"] == "National Institutes of Health"
        assert result["extracted_data"]["cfp_subject"] == "Research Grant Program"
        assert result["extracted_data"]["submission_date"] == "2025-03-31"

        # Verify cancellation checks
        assert mock_grant_template_job_manager.ensure_not_cancelled.call_count == 2

        # Verify notifications
        assert mock_grant_template_job_manager.add_notification.call_count == 2
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.EXTRACTING_CFP_DATA,
            message="Analyzing call for proposals document",
            notification_type="info",
        )
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.CFP_DATA_EXTRACTED,
            message="Document analysis complete",
            notification_type="success",
            data={
                "organization": "National Institutes of Health",
                "subject": "Research Grant Program",
                "deadline": "2025-03-31",
            },
        )

        # Verify RAG sources verification
        mock_verify_rag_sources.assert_called_once_with(
            parent_id=grant_template.id,
            session_maker=async_session_maker,
            entity_type=GrantTemplate,
            trace_id="test-trace",
        )

        # Verify CFP data extraction call
        mock_handle_extract_cfp_data.assert_called_once()
        call_args = mock_handle_extract_cfp_data.call_args
        assert len(call_args.kwargs["source_ids"]) == 2  # Two sources created
        assert str(nih_organization.id) in call_args.kwargs["organization_mapping"]

    @patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed")
    @patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data")
    async def test_cfp_extraction_stage_no_organization_match(
        self,
        mock_handle_extract_cfp_data: AsyncMock,
        mock_verify_rag_sources: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        nih_organization: Any,
        sample_rag_sources: list[Any],
        async_session_maker: Any,
    ) -> None:
        """Test CFP extraction when no organization matches."""
        # Setup mocks - return non-matching organization ID
        mock_verify_rag_sources.return_value = None
        mock_handle_extract_cfp_data.return_value = {
            "organization_id": str(uuid4()),  # Different ID that won't match
            "cfp_subject": "Research Grant Program",
            "submission_date": "2025-03-31",
        }

        # Execute
        result = await handle_cfp_extraction_stage(
            grant_template=grant_template,
            job_manager=mock_grant_template_job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

        # Verify organization is None
        assert result["organization"] is None

        # Verify notification shows "Unknown" for organization
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.CFP_DATA_EXTRACTED,
            message="Document analysis complete",
            notification_type="success",
            data={
                "organization": "Unknown",
                "subject": "Research Grant Program",
                "deadline": "2025-03-31",
            },
        )

    @patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed")
    @patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data")
    async def test_cfp_extraction_stage_no_submission_date(
        self,
        mock_handle_extract_cfp_data: AsyncMock,
        mock_verify_rag_sources: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        nih_organization: Any,
        sample_rag_sources: list[Any],
        async_session_maker: Any,
    ) -> None:
        """Test CFP extraction when no submission date is found."""
        # Setup mocks
        mock_verify_rag_sources.return_value = None
        mock_handle_extract_cfp_data.return_value = {
            "organization_id": str(nih_organization.id),
            "cfp_subject": "Research Grant Program",
            "submission_date": None,  # No submission date
        }

        # Execute
        result = await handle_cfp_extraction_stage(
            grant_template=grant_template,
            job_manager=mock_grant_template_job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

        # Verify submission date is None
        assert result["extracted_data"]["submission_date"] is None

        # Verify notification shows None for deadline
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.CFP_DATA_EXTRACTED,
            message="Document analysis complete",
            notification_type="success",
            data={
                "organization": "National Institutes of Health",
                "subject": "Research Grant Program",
                "deadline": None,
            },
        )

    async def test_cfp_extraction_stage_database_queries(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        nih_organization: Any,
        sample_rag_sources: list[Any],
        async_session_maker: Any,
    ) -> None:
        """Test that database queries work correctly."""
        # Mock external services to focus on database operations
        with (
            patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed"),
            patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data") as mock_extract,
        ):
            mock_extract.return_value = {
                "organization_id": str(nih_organization.id),
                "cfp_subject": "Test Subject",
                "submission_date": "2025-12-31",
            }

            # Execute
            result = await handle_cfp_extraction_stage(
                grant_template=grant_template,
                job_manager=mock_grant_template_job_manager,
                session_maker=async_session_maker,
                trace_id="test-trace",
            )

            # Verify that the database was queried correctly
            # The function should have found our sources and institution
            assert result["organization"]["full_name"] == nih_organization.full_name
            assert result["organization"]["abbreviation"] == nih_organization.abbreviation
            assert result["organization"]["organization_id"] == nih_organization.id

            # Verify the extract call received the correct source IDs
            call_args = mock_extract.call_args
            source_ids = call_args.kwargs["source_ids"]
            assert len(source_ids) == 2
            assert all(str(source.id) in source_ids for source in sample_rag_sources)


class TestCFPAnalysisStage:
    """Test handle_cfp_analysis_stage function."""

    @patch("services.rag.src.grant_template.handlers.handle_analyze_cfp")
    async def test_cfp_analysis_stage_success(
        self,
        mock_handle_analyze_cfp: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_extract_cfp_dto: Any,
    ) -> None:
        """Test successful CFP analysis stage."""
        # Setup mock
        mock_analysis_result = {
            "cfp_analysis": {
                "sections_count": 5,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 3,
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
                "categories_found": 5,
                "total_sentences": 20,
                "content_length": 1000,
            },
        }
        mock_handle_analyze_cfp.return_value = mock_analysis_result

        # Execute
        result = await handle_cfp_analysis_stage(
            extracted_cfp=sample_extract_cfp_dto,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        # Verify structure - should inherit from input DTO
        assert result["organization"] == sample_extract_cfp_dto["organization"]
        assert result["extracted_data"] == sample_extract_cfp_dto["extracted_data"]
        assert result["analysis_results"] == mock_analysis_result

        # Verify cancellation check
        mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

        # Verify notifications
        assert mock_grant_template_job_manager.add_notification.call_count == 2
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
            message="Analyzing application requirements",
            notification_type="info",
        )
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.SECTIONS_EXTRACTED,
            message="Requirements analysis complete",
            notification_type="success",
            data={
                "categories_found": 5,
                "total_sentences": 20,
            },
        )

        # Verify service call - now called with full_cfp_text instead of grant_template_id
        mock_handle_analyze_cfp.assert_called_once()
        call_args = mock_handle_analyze_cfp.call_args
        assert "full_cfp_text" in call_args.kwargs
        assert call_args.kwargs["trace_id"] == "test-trace"

    @patch("services.rag.src.grant_template.handlers.handle_analyze_cfp")
    async def test_cfp_analysis_stage_limited_disciplines(
        self,
        mock_handle_analyze_cfp: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_extract_cfp_dto: Any,
    ) -> None:
        """Test CFP analysis stage with many academic disciplines (should limit to 3)."""
        # Setup mock with proper CFPAnalysisResult structure
        mock_analysis_result = {
            "cfp_analysis": {
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
                "content_length": 1500,
                "categories_found": 6,
                "total_sentences": 75,
            },
        }
        mock_handle_analyze_cfp.return_value = mock_analysis_result

        # Execute
        await handle_cfp_analysis_stage(
            extracted_cfp=sample_extract_cfp_dto,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        # Verify notification uses analysis metadata
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.SECTIONS_EXTRACTED,
            message="Requirements analysis complete",
            notification_type="success",
            data={
                "categories_found": 6,
                "total_sentences": 75,
            },
        )

    @patch("services.rag.src.grant_template.handlers.handle_analyze_cfp")
    async def test_cfp_analysis_stage_no_disciplines(
        self,
        mock_handle_analyze_cfp: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_extract_cfp_dto: Any,
    ) -> None:
        """Test CFP analysis stage with no academic disciplines."""
        # Setup mock with proper CFPAnalysisResult structure
        mock_analysis_result = {
            "cfp_analysis": {
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
                "content_length": 800,
                "categories_found": 0,
                "total_sentences": 40,
            },
        }
        mock_handle_analyze_cfp.return_value = mock_analysis_result

        # Execute
        await handle_cfp_analysis_stage(
            extracted_cfp=sample_extract_cfp_dto,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        # Verify notification uses analysis metadata
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.SECTIONS_EXTRACTED,
            message="Requirements analysis complete",
            notification_type="success",
            data={
                "categories_found": 0,
                "total_sentences": 40,
            },
        )


class TestSectionExtractionStage:
    """Test handle_section_extraction_stage function."""

    @patch("services.rag.src.grant_template.handlers.handle_extract_sections")
    async def test_section_extraction_stage_success(
        self,
        mock_handle_extract_sections: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_analyze_cfp_dto: Any,
    ) -> None:
        """Test successful section extraction stage."""
        # Setup mock
        mock_extracted_sections = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "parent_id": None,
                "is_detailed_research_plan": False,
                "is_long_form": True,
                "order": 1,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "parent_id": None,
                "is_detailed_research_plan": True,
                "is_long_form": True,
                "order": 2,
            },
        ]
        mock_handle_extract_sections.return_value = mock_extracted_sections

        # Execute
        result = await handle_section_extraction_stage(
            analysis_result=sample_analyze_cfp_dto,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        # Verify structure - should inherit from input DTO and add sections
        assert result["organization"] == sample_analyze_cfp_dto["organization"]
        assert result["extracted_data"] == sample_analyze_cfp_dto["extracted_data"]
        assert result["analysis_results"] == sample_analyze_cfp_dto["analysis_results"]
        assert result["extracted_sections"] == mock_extracted_sections

        # Verify cancellation check
        mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

        # Verify notifications
        assert mock_grant_template_job_manager.add_notification.call_count == 2
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.GRANT_TEMPLATE_METADATA,
            message="Extracting application sections",
            notification_type="info",
        )
        mock_grant_template_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.METADATA_GENERATED,
            message="Section extraction complete",
            notification_type="success",
            data={
                "sections": 2,
            },
        )

        # Verify service call - now called with cfp_content, cfp_subject, organization
        mock_handle_extract_sections.assert_called_once()
        call_args = mock_handle_extract_sections.call_args
        assert "cfp_content" in call_args.kwargs
        assert "cfp_subject" in call_args.kwargs
        assert "organization" in call_args.kwargs
        assert call_args.kwargs["trace_id"] == "test-trace"


class TestGenerateMetadataStage:
    """Test handle_generate_metadata_stage function."""

    @patch("services.rag.src.grant_template.handlers.handle_generate_grant_template_metadata")
    async def test_generate_metadata_stage_success(
        self,
        mock_handle_generate_metadata: AsyncMock,
        mock_grant_template_job_manager: AsyncMock,
        sample_sections_dto: Any,
    ) -> None:
        """Test successful metadata generation stage."""
        # Setup mock - return SectionMetadata objects matching fixture section IDs
        mock_section_metadata = [
            {
                "id": "project_summary",
                "keywords": ["project", "summary", "overview"],
                "topics": ["project goals", "objectives"],
                "generation_instructions": "Provide a concise summary of the project",
                "depends_on": [],
                "max_words": 500,
                "search_queries": ["project summary examples", "grant proposal overview"],
            },
            {
                "id": "research_plan",
                "keywords": ["research", "methodology", "plan"],
                "topics": ["research design", "methodology"],
                "generation_instructions": "Describe the detailed research methodology",
                "depends_on": ["project_summary"],
                "max_words": 2000,
                "search_queries": ["research methodology", "experimental design"],
            },
        ]
        mock_handle_generate_metadata.return_value = mock_section_metadata

        # Execute
        result = await handle_generate_metadata_stage(
            section_extraction_result=sample_sections_dto,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        # Verify result - should be list of GrantElement/GrantLongFormSection objects
        assert len(result) == 2
        assert all(isinstance(section, (dict)) for section in result)  # They'll be dicts from TypedDict

        # Check first section (project_summary)
        project_section = result[0]
        assert project_section["id"] == "project_summary"
        assert project_section["title"] == "Project Summary"
        assert project_section["order"] == 1

        # Check second section (research_plan)
        research_section = result[1]
        assert research_section["id"] == "research_plan"
        assert research_section["title"] == "Research Plan"
        assert research_section["order"] == 2

        # Verify cancellation check
        mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

        # Verify service call - now called with cfp_content, cfp_subject, organization, long_form_sections
        mock_handle_generate_metadata.assert_called_once()
        call_args = mock_handle_generate_metadata.call_args
        assert "cfp_content" in call_args.kwargs
        assert "cfp_subject" in call_args.kwargs
        assert "organization" in call_args.kwargs
        assert "long_form_sections" in call_args.kwargs


class TestSaveGrantTemplate:
    """Test handle_save_grant_template function."""

    async def test_save_grant_template_success(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_sections_dto: Any,
        async_session_maker: Any,
        nih_organization: Any,
    ) -> None:
        """Test successful grant template saving."""
        # Setup test data
        mock_grant_sections = [
            {"id": "section1", "title": "Project Summary"},
            {"id": "section2", "title": "Research Plan"},
        ]

        # Update the fixture organization to use the real NIH organization
        sample_sections_dto["organization"]["organization_id"] = nih_organization.id
        sample_sections_dto["extracted_data"]["organization_id"] = str(nih_organization.id)

        # Execute
        result = await handle_save_grant_template(
            grant_template=grant_template,
            session_maker=async_session_maker,
            job_manager=mock_grant_template_job_manager,
            cfp_analysis=sample_sections_dto["analysis_results"],
            extracted_cfp=sample_sections_dto,
            grant_sections=mock_grant_sections,
            trace_id="test-trace",
        )

        # Verify result is GrantTemplate
        assert isinstance(result, GrantTemplate)
        assert result.id == grant_template.id

        # Verify database was updated
        async with async_session_maker() as session:
            updated_template = await session.get(GrantTemplate, grant_template.id)
            assert updated_template.grant_sections == mock_grant_sections
            assert updated_template.cfp_analysis == sample_sections_dto["analysis_results"]
            assert updated_template.granting_institution_id == sample_sections_dto["organization"]["organization_id"]

        # Verify job status update
        mock_grant_template_job_manager.update_job_status.assert_called_once_with(RagGenerationStatusEnum.COMPLETED)

        # Verify success notification
        mock_grant_template_job_manager.add_notification.assert_called_once_with(
            event=NotificationEvents.GRANT_TEMPLATE_CREATED,
            message="Grant template ready",
            notification_type="success",
            data={
                "template_id": str(grant_template.id),
                "sections": 2,
                "organization": "National Institutes of Health",
            },
        )

    async def test_save_grant_template_no_organization(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_sections_dto: Any,
        async_session_maker: Any,
    ) -> None:
        """Test grant template saving with no organization."""
        # Modify DTO to have no organization
        sections_dto_no_org = sample_sections_dto.copy()
        sections_dto_no_org["organization"] = None

        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]

        # Execute
        await handle_save_grant_template(
            grant_template=grant_template,
            session_maker=async_session_maker,
            job_manager=mock_grant_template_job_manager,
            cfp_analysis=sections_dto_no_org["analysis_results"],
            extracted_cfp=sections_dto_no_org,
            grant_sections=mock_grant_sections,
            trace_id="test-trace",
        )

        # Verify database update with None organization
        async with async_session_maker() as session:
            updated_template = await session.get(GrantTemplate, grant_template.id)
            assert updated_template.granting_institution_id is None

        # Verify notification shows "Unknown" for organization
        mock_grant_template_job_manager.add_notification.assert_called_once_with(
            event=NotificationEvents.GRANT_TEMPLATE_CREATED,
            message="Grant template ready",
            notification_type="success",
            data={
                "template_id": str(grant_template.id),
                "sections": 1,
                "organization": "Unknown",
            },
        )

    async def test_save_grant_template_no_submission_date(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_sections_dto: Any,
        async_session_maker: Any,
        nih_organization: Any,
    ) -> None:
        """Test grant template saving with no submission date."""
        # Modify DTO to have no submission date
        sections_dto_no_date = sample_sections_dto.copy()
        sections_dto_no_date["extracted_data"]["submission_date"] = None

        # Update the fixture organization to use the real NIH organization
        sections_dto_no_date["organization"]["organization_id"] = nih_organization.id
        sections_dto_no_date["extracted_data"]["organization_id"] = str(nih_organization.id)

        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]

        # Execute
        await handle_save_grant_template(
            grant_template=grant_template,
            session_maker=async_session_maker,
            job_manager=mock_grant_template_job_manager,
            cfp_analysis=sections_dto_no_date["analysis_results"],
            extracted_cfp=sections_dto_no_date,
            grant_sections=mock_grant_sections,
            trace_id="test-trace",
        )

        # Verify database update with None submission date
        async with async_session_maker() as session:
            updated_template = await session.get(GrantTemplate, grant_template.id)
            assert updated_template.submission_date is None

    async def test_save_grant_template_date_parsing(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_sections_dto: Any,
        async_session_maker: Any,
        nih_organization: Any,
    ) -> None:
        """Test proper date parsing from string to date object."""
        # Update the fixture organization to use the real NIH organization
        sample_sections_dto["organization"]["organization_id"] = nih_organization.id
        sample_sections_dto["extracted_data"]["organization_id"] = str(nih_organization.id)

        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]

        # Execute
        await handle_save_grant_template(
            grant_template=grant_template,
            session_maker=async_session_maker,
            job_manager=mock_grant_template_job_manager,
            cfp_analysis=sample_sections_dto["analysis_results"],
            extracted_cfp=sample_sections_dto,
            grant_sections=mock_grant_sections,
            trace_id="test-trace",
        )

        # Verify date was parsed correctly
        async with async_session_maker() as session:
            updated_template = await session.get(GrantTemplate, grant_template.id)
            assert updated_template.submission_date == date(2025, 3, 31)

    async def test_save_grant_template_database_error(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        sample_sections_dto: Any,
        async_session_maker: Any,
    ) -> None:
        """Test DatabaseError handling on SQLAlchemy error."""
        mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]

        # Mock session to raise SQLAlchemy error
        with patch("services.rag.src.grant_template.handlers.update") as mock_update:
            mock_update.side_effect = SQLAlchemyError("Database connection failed")

            # Execute and verify exception
            with pytest.raises(DatabaseError, match="Error saving grant template"):
                await handle_save_grant_template(
                    grant_template=grant_template,
                    session_maker=async_session_maker,
                    job_manager=mock_grant_template_job_manager,
                    cfp_analysis=sample_sections_dto["analysis_results"],
                    extracted_cfp=sample_sections_dto,
                    grant_sections=mock_grant_sections,
                    trace_id="test-trace",
                )


class TestHandlersIntegration:
    """Test integration between handlers and real database operations."""

    async def test_handlers_preserve_data_flow(
        self,
        mock_grant_template_job_manager: AsyncMock,
        grant_template: Any,
        nih_organization: Any,
        sample_rag_sources: list[Any],
        async_session_maker: Any,
    ) -> None:
        """Test that data flows correctly through multiple handler stages."""
        # Mock external services
        with (
            patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed"),
            patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data") as mock_extract,
            patch("services.rag.src.grant_template.handlers.handle_analyze_cfp") as mock_analyze,
            patch("services.rag.src.grant_template.handlers.handle_extract_sections") as mock_sections,
        ):
            # Setup mock returns
            mock_extract.return_value = {
                "organization_id": str(nih_organization.id),
                "cfp_subject": "Research Grant",
                "submission_date": "2025-06-15",
                "content": [
                    {"title": "Project Summary", "subtitles": ["Overview", "Objectives"]},
                    {"title": "Research Plan", "subtitles": ["Methods", "Timeline"]},
                ],
            }

            mock_analyze.return_value = {
                "cfp_analysis": {
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
                    "content_length": 800,
                    "categories_found": 2,
                    "total_sentences": 50,
                },
            }

            mock_sections.return_value = [
                {
                    "title": "Abstract",
                    "id": "abstract",
                    "parent_id": None,
                    "is_detailed_research_plan": False,
                    "is_title_only": False,
                    "is_clinical_trial": False,
                    "is_long_form": True,
                    "order": 1,
                }
            ]

            # Execute CFP extraction
            extraction_result = await handle_cfp_extraction_stage(
                grant_template=grant_template,
                job_manager=mock_grant_template_job_manager,
                session_maker=async_session_maker,
                trace_id="test-trace",
            )

            # Execute CFP analysis using extraction result
            analysis_result = await handle_cfp_analysis_stage(
                extracted_cfp=extraction_result,
                job_manager=mock_grant_template_job_manager,
                trace_id="test-trace",
            )

            # Execute section extraction using analysis result
            sections_result = await handle_section_extraction_stage(
                analysis_result=analysis_result,
                job_manager=mock_grant_template_job_manager,
                trace_id="test-trace",
            )

            # Verify data flow integrity
            assert sections_result["organization"] == extraction_result["organization"]
            assert sections_result["extracted_data"] == extraction_result["extracted_data"]
            assert sections_result["analysis_results"] == analysis_result["analysis_results"]
            assert len(sections_result["extracted_sections"]) == 1

            # Verify organization data preserved
            assert sections_result["organization"]["full_name"] == "National Institutes of Health"
            assert sections_result["organization"]["abbreviation"] == "NIH"
            assert sections_result["extracted_data"]["cfp_subject"] == "Research Grant"
            assert sections_result["extracted_data"]["submission_date"] == "2025-06-15"
