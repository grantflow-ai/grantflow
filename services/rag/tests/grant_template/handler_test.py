from typing import TYPE_CHECKING, Any, cast
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import CFPAnalysisResult
from packages.db.src.tables import (
    GrantingInstitution,
    GrantTemplate,
    GrantTemplateGenerationJob,
    GrantTemplateSource,
    RagFile,
    TextVector,
)
from packages.shared_utils.src.exceptions import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.dto import (
    CFPContentSection as Content,
)
from services.rag.src.grant_template.dto import (
    ExtractedCFPData,
    OrganizationNamespace,
)
from services.rag.src.grant_template.extract_cfp_data import (
    RagSourceData,
    extract_cfp_data_multi_source,
    format_rag_sources_for_prompt,
    get_rag_sources_data,
)
from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO
from services.rag.src.grant_template.generate_metadata import SectionMetadata
from services.rag.src.grant_template.handler import (
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
    grant_template_generation_pipeline_handler,
    handle_cfp_analysis_stage,
    handle_cfp_extraction_stage,
    handle_generate_metadata_stage,
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
            "is_detailed_research_plan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "research_plan",
            "title": "Research Plan",
            "order": 2,
            "parent_id": None,
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "impact",
            "title": "Impact",
            "order": 3,
            "parent_id": None,
            "is_detailed_research_plan": None,
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
    nih_organization: GrantingInstitution,
) -> ExtractedCFPData:
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
def mock_cfp_analysis_result() -> CFPAnalysisResult:
    return {
        "sections_count": 5,
        "length_constraints_found": True,
        "evaluation_criteria_count": 3,
        "nlp_categories_detected": 4,
        "total_sentences_analyzed": 150,
    }


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
            "nlp_analysis": {
                "orders": ["Funding eligibility criteria", "Application submission requirements"],
                "money": ["Budget guidelines and restrictions"],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "positive_instructions": ["Application submission requirements"],
                "negative_instructions": [],
                "evaluation_criteria": ["Funding eligibility criteria"],
            },
        },
        {
            "source_id": "source-2-id",
            "source_type": "rag_url",
            "text_content": "This is web content from the funding organization's website with additional details.",
            "chunks": [
                "Web chunk 1: Organization mission and values",
                "Web chunk 2: Past funded projects examples",
            ],
            "nlp_analysis": {
                "orders": [],
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": ["Organization mission and values"],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": ["Past funded projects examples"],
            },
        },
    ]


@pytest.fixture
async def grant_template_with_sources(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> GrantTemplate:
    """Create a grant template with associated RAG sources and text vectors."""
    async with async_session_maker() as session, session.begin():
        # Create RAG sources
        source1 = RagFile(
            bucket_name="test-bucket",
            object_path="test/path/doc1.pdf",
            filename="doc1.pdf",
            text_content="This is the full content of the first source document about funding opportunities.",
            source_type="rag_file",
            mime_type="application/pdf",
            size=1024,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        source2 = RagFile(
            bucket_name="test-bucket",
            object_path="test/path/doc2.html",
            filename="doc2.html",
            text_content="This is web content from the funding organization's website with additional details.",
            source_type="rag_file",
            mime_type="text/html",
            size=2048,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add_all([source1, source2])
        await session.flush()

        # Create text vectors for the sources with mock embeddings
        import numpy as np
        mock_embedding = np.random.rand(384).tolist()  # Mock 384-dimensional embedding

        vectors = [
            TextVector(
                rag_source_id=source1.id,
                chunk={"content": "Chunk 1: Funding eligibility criteria"},
                embedding=mock_embedding,
            ),
            TextVector(
                rag_source_id=source1.id,
                chunk={"content": "Chunk 2: Application submission requirements"},
                embedding=mock_embedding,
            ),
            TextVector(
                rag_source_id=source1.id,
                chunk={"content": "Chunk 3: Budget guidelines and restrictions"},
                embedding=mock_embedding,
            ),
            TextVector(
                rag_source_id=source2.id,
                chunk={"content": "Web chunk 1: Organization mission and values"},
                embedding=mock_embedding,
            ),
            TextVector(
                rag_source_id=source2.id,
                chunk={"content": "Web chunk 2: Past funded projects examples"},
                embedding=mock_embedding,
            ),
        ]
        session.add_all(vectors)

        # Create grant template sources
        template_sources = [
            GrantTemplateSource(
                grant_template_id=grant_template_with_sections.id,
                rag_source_id=source1.id,
            ),
            GrantTemplateSource(
                grant_template_id=grant_template_with_sections.id,
                rag_source_id=source2.id,
            ),
        ]
        session.add_all(template_sources)
        await session.commit()

    return grant_template_with_sections


async def test_handle_cfp_extraction_stage(
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    nih_organization: GrantingInstitution,
    mock_extracted_cfp_data: ExtractedCFPData,
) -> None:
    """Test the CFP extraction stage of the pipeline."""
    from services.rag.src.utils.job_manager import GrantTemplateJobManager

    # Create real job manager
    job_manager = GrantTemplateJobManager(
        session_maker=async_session_maker,
        grant_application_id=grant_template_with_sources.grant_application_id,
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        pipeline_stages=list(GrantTemplateStageEnum),
        parent_id=grant_template_with_sources.id,
        trace_id="test-trace-id",
    )

    # Create the job using get_or_create_job
    job = await job_manager.get_or_create_job()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_extract_cfp_data",
            return_value=mock_extracted_cfp_data,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_rag_task",
            new_callable=AsyncMock,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_notification",
            new_callable=AsyncMock,
        ),
    ):
        result = await handle_cfp_extraction_stage(
            grant_template=grant_template_with_sources,
            job_manager=job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace-id",
        )

    assert result["extracted_data"]["cfp_subject"] == mock_extracted_cfp_data["cfp_subject"]
    assert len(result["extracted_data"]["content"]) == len(mock_extracted_cfp_data["content"])

    # Verify job status was updated
    async with async_session_maker() as session:
        updated_job = await session.get(GrantTemplateGenerationJob, job.id)
        assert updated_job is not None
        # Job should still be processing (next stage would be triggered via pubsub)
        assert updated_job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]


async def test_handle_cfp_analysis_stage(
    mock_extracted_cfp_data: ExtractedCFPData,
    mock_cfp_analysis_result: CFPAnalysisResult,
    nih_organization: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test the CFP analysis stage."""
    from services.rag.src.utils.job_manager import GrantTemplateJobManager

    # Create job manager
    job_manager = GrantTemplateJobManager(
        session_maker=async_session_maker,
        grant_application_id=grant_template_with_sections.grant_application_id,
        current_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
        pipeline_stages=list(GrantTemplateStageEnum),
        parent_id=grant_template_with_sections.id,
        trace_id="test-trace-id",
    )

    # Create a job with checkpoint data from previous stage
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=1,  # Current stage index in pipeline
            total_stages=4,
            checkpoint_data={
                "organization": {
                    "organization_id": str(nih_organization.id),
                    "abbreviation": nih_organization.abbreviation,
                    "full_name": nih_organization.full_name,
                },
                "extracted_data": mock_extracted_cfp_data,
            },
        )
        session.add(job)
        await session.commit()
        job_manager.job_id = job.id
        job_manager.job = job

    extracted_cfp: ExtractCFPContentStageDTO = {
        "organization": OrganizationNamespace(
            organization_id=nih_organization.id,
            abbreviation=nih_organization.abbreviation,
            full_name=nih_organization.full_name,
        ),
        "extracted_data": mock_extracted_cfp_data,
    }

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_analyze_cfp",
            return_value=mock_cfp_analysis_result,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_rag_task",
            new_callable=AsyncMock,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_notification",
            new_callable=AsyncMock,
        ),
    ):
        result = await handle_cfp_analysis_stage(
            extracted_cfp=extracted_cfp,
            job_manager=job_manager,
            trace_id="test-trace-id",
        )

    assert result["analysis_results"] == mock_cfp_analysis_result
    assert result["extracted_data"] == mock_extracted_cfp_data
    assert result["organization"] == extracted_cfp["organization"]


async def test_handle_generate_metadata_stage(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    nih_organization: GrantingInstitution,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test the metadata generation stage."""
    from services.rag.src.utils.job_manager import GrantTemplateJobManager

    # Create job manager
    job_manager = GrantTemplateJobManager(
        session_maker=async_session_maker,
        grant_application_id=grant_template_with_sections.grant_application_id,
        current_stage=GrantTemplateStageEnum.GENERATE_METADATA,
        pipeline_stages=list(GrantTemplateStageEnum),
        parent_id=grant_template_with_sections.id,
        trace_id="test-trace-id",
    )

    # Create job for this test
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=3,  # Index for GENERATE_METADATA stage
            total_stages=4,
        )
        session.add(job)
        await session.commit()
        job_manager.job_id = job.id
        job_manager.job = job

    section_extraction_result: ExtractionSectionsStageDTO = {
        "organization": OrganizationNamespace(
            organization_id=nih_organization.id,
            abbreviation=nih_organization.abbreviation,
            full_name=nih_organization.full_name,
        ),
        "extracted_data": {
            "organization_id": str(nih_organization.id),
            "cfp_subject": cfp_subject,
            "content": sample_cfp_content,
            "submission_date": "2025-04-26",
        },
        "analysis_results": {},
        "extracted_sections": mock_extracted_sections,
    }

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template_metadata",
            return_value=mock_section_metadata,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_notification",
            new_callable=AsyncMock,
        ),
    ):
        result = await handle_generate_metadata_stage(
            section_extraction_result=section_extraction_result,
            job_manager=job_manager,
            trace_id="test-trace-id",
        )

    assert len(result) == 3

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


async def test_grant_template_generation_pipeline_full_flow(
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    nih_organization: GrantingInstitution,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: ExtractedCFPData,
    mock_cfp_analysis_result: CFPAnalysisResult,
) -> None:
    """Test the full pipeline flow for the final stage (GENERATE_METADATA)."""

    # Create a job with checkpoint data from all previous stages
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sources.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=4,
            total_stages=4,
            checkpoint_data={
                "organization": {
                    "organization_id": str(nih_organization.id),
                    "abbreviation": nih_organization.abbreviation,
                    "full_name": nih_organization.full_name,
                },
                "extracted_data": mock_extracted_cfp_data,
                "analysis_results": mock_cfp_analysis_result,
                "extracted_sections": mock_extracted_sections,
            },
        )
        session.add(job)
        await session.commit()

    with (
        patch(
            "services.rag.src.grant_template.handler.handle_generate_grant_template_metadata",
            return_value=mock_section_metadata,
        ),
        patch(
            "services.rag.src.utils.job_manager.publish_notification",
            new_callable=AsyncMock,
        ),
    ):
        await grant_template_generation_pipeline_handler(
            grant_template=grant_template_with_sources,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.GENERATE_METADATA,
            trace_id="test-trace-id",
        )

    # Verify the grant template was updated with new sections
    async with async_session_maker() as session:
        updated_template = await session.get(GrantTemplate, grant_template_with_sources.id)
        assert updated_template is not None
        assert updated_template.grant_sections is not None
        # The template should have the sections from the pipeline, not the original fixture sections
        assert len(updated_template.grant_sections) == 3
        # Verify the sections match what we expected from the pipeline
        section_ids = [s["id"] for s in updated_template.grant_sections if isinstance(s, dict)]
        assert "abstract" in section_ids
        assert "research_plan" in section_ids
        assert "impact" in section_ids


async def test_get_rag_sources_data(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sources: GrantTemplate,
) -> None:
    """Test fetching RAG sources data."""
    async with async_session_maker() as session:
        stmt = select(GrantTemplateSource.rag_source_id).where(
            GrantTemplateSource.grant_template_id == grant_template_with_sources.id
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
    """Test formatting RAG sources for LLM prompt."""
    formatted = format_rag_sources_for_prompt(mock_rag_sources)

    assert "Source 0: RAG_FILE" in formatted or "Source 1 (rag_file)" in formatted
    assert "Source 1: RAG_URL" in formatted or "Source 2 (rag_url)" in formatted

    assert "full content of the first source document" in formatted
    assert "web content from the funding organization" in formatted

    assert "Chunk 1: Funding eligibility criteria" in formatted
    assert "Web chunk 2: Past funded projects examples" in formatted

    assert len(formatted) > 0


async def test_extract_cfp_data_multi_source(mock_rag_sources: list[RagSourceData]) -> None:
    """Test extracting CFP data from multiple sources."""
    task_description = format_rag_sources_for_prompt(mock_rag_sources)

    mock_response = {
        "organization_id": "test-org-id",
        "cfp_subject": "Test grant for researching innovative approaches",
        "content": [
            {"title": "Background", "subtitles": ["Introduction", "Problem Statement"]},
            {"title": "Methodology", "subtitles": ["Approach", "Timeline"]},
        ],
        "submission_date": "2025-04-26",
    }

    with patch(
        "services.rag.src.grant_template.extract_cfp_data.handle_completions_request",
        return_value=mock_response,
    ):
        formatted = await extract_cfp_data_multi_source(task_description)

    assert "cfp_subject" in formatted
    assert "content" in formatted
    assert "organization_id" in formatted
    assert "submission_date" in formatted

    assert len(formatted["cfp_subject"]) > 0
    assert isinstance(formatted["content"], list)
    assert len(formatted["content"]) > 0

    for item in formatted["content"]:
        assert "title" in item
        assert "subtitles" in item
        assert isinstance(item["subtitles"], list)


async def test_grant_template_pipeline_error_handling(
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test error handling in the pipeline."""
    # Create a job
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sources.id,
            status=RagGenerationStatusEnum.PENDING,
            current_stage=1,
            total_stages=4,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    with patch(
        "services.rag.src.grant_template.handler.verify_rag_sources_indexed",
        side_effect=ValidationError("No RAG sources found"),
    ):
        result = await grant_template_generation_pipeline_handler(
            grant_template=grant_template_with_sources,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace-id",
        )

    assert result is None

    # Verify job was marked as failed
    async with async_session_maker() as session:
        failed_job = await session.get(GrantTemplateGenerationJob, job_id)
        assert failed_job is not None
        assert failed_job.status == RagGenerationStatusEnum.FAILED
        assert failed_job.error_message is not None


async def test_grant_template_pipeline_cancellation(
    grant_template_with_sources: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test pipeline cancellation handling."""
    # Create a cancelled job
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sources.id,
            status=RagGenerationStatusEnum.CANCELLED,
            current_stage=1,
            total_stages=4,
        )
        session.add(job)
        await session.commit()

    result = await grant_template_generation_pipeline_handler(
        grant_template=grant_template_with_sources,
        session_maker=async_session_maker,
        generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace-id",
    )

    # Should return None when cancelled
    assert result is None
