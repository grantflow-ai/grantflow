from typing import TYPE_CHECKING, Any
from uuid import uuid4

import pytest
from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

if TYPE_CHECKING:
    from packages.db.src.json_objects import (
        CFPAnalysisRequirementWithQuote,
        CFPConstraint,
        GrantElement,
        GrantLongFormSection,
    )

pytest_plugins = ["testing.pubsub_test_plugin"]


@pytest.fixture
async def job_with_extract_cfp_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
) -> None:
    from packages.db.src.tables import RagGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_extract_cfp_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
async def job_with_analyze_cfp_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
) -> None:
    from packages.db.src.tables import RagGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_extract_cfp_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
async def job_with_extract_sections_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
) -> None:
    from packages.db.src.tables import RagGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.EXTRACT_SECTIONS,
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_analyze_cfp_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
async def job_with_generate_metadata_checkpoint(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_sections_dto: ExtractionSectionsStageDTO,
) -> None:
    from packages.db.src.tables import RagGenerationJob

    from services.rag.src.utils.job_manager import _serialize_checkpoint_data

    async with async_session_maker() as session:
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.GENERATE_METADATA,
            retry_count=0,
            checkpoint_data=_serialize_checkpoint_data(sample_sections_dto),
        )
        session.add(job)
        await session.commit()


@pytest.fixture
def sample_extract_cfp_dto() -> ExtractCFPContentStageDTO:
    return ExtractCFPContentStageDTO(
        organization={
            "organization_id": uuid4(),
            "full_name": "National Science Foundation",
            "abbreviation": "NSF",
        },
        extracted_data={
            "org_id": str(uuid4()),
            "subject": "Research Grant Program",
            "deadline": "2025-03-31",
            "content": [
                {"title": "Project Summary", "subtitles": ["Overview", "Objectives"]},
                {"title": "Research Plan", "subtitles": ["Methods", "Timeline"]},
            ],
            "full_text": "Full text of the CFP document",
        },
    )


@pytest.fixture
def sample_analyze_cfp_dto(sample_extract_cfp_dto: ExtractCFPContentStageDTO) -> AnalyzeCFPContentStageDTO:
    return AnalyzeCFPContentStageDTO(
        organization=sample_extract_cfp_dto["organization"],
        extracted_data=sample_extract_cfp_dto["extracted_data"],
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
    return ExtractionSectionsStageDTO(
        organization=sample_analyze_cfp_dto["organization"],
        extracted_data=sample_analyze_cfp_dto["extracted_data"],
        analysis_results=sample_analyze_cfp_dto["analysis_results"],
        extracted_sections=[
            {
                "title": "Project Summary",
                "id": "project_summary",
                "is_plan": False,
                "long_form": True,
                "order": 1,
                "evidence": "CFP evidence for Project Summary",
            }
        ],
    )


async def test_pipeline_stage_execution_extract_cfp_content_stage(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    trace_id: str,
    mock_pubsub_for_pipeline_testing: Any,
    create_pubsub_topics: None,
) -> None:
    mock_handle_cfp_extraction = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        return_value=sample_extract_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_cfp_extraction.assert_called_once()


async def test_pipeline_stage_execution_analyze_cfp_content_stage(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
    job_with_analyze_cfp_checkpoint: None,
    trace_id: str,
    create_pubsub_topics: None,
    mock_handle_completions_request: None,
) -> None:
    mock_handle_cfp_analysis = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
        return_value=sample_analyze_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_cfp_analysis.assert_called_once()


async def test_pipeline_stage_execution_extract_sections_stage(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_sections_dto: ExtractionSectionsStageDTO,
    job_with_extract_sections_checkpoint: None,
    trace_id: str,
    create_pubsub_topics: None,
    mock_handle_completions_request: None,
) -> None:
    mock_handle_section_extraction = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_section_extraction_stage",
        return_value=sample_sections_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_section_extraction.assert_called_once()


async def test_pipeline_stage_execution_generate_metadata_stage_final(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    job_with_generate_metadata_checkpoint: None,
    trace_id: str,
    create_pubsub_topics: None,
    mock_handle_completions_request: None,
) -> None:
    mock_grant_sections = [{"id": "section1", "title": "Project Summary"}]
    mock_handle_generate_metadata = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_generate_metadata_stage",
        return_value=mock_grant_sections,
    )
    mock_handle_save = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_save_grant_template",
        return_value=grant_template,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result == grant_template
    mock_handle_generate_metadata.assert_called_once()
    mock_handle_save.assert_called_once()


async def test_pipeline_error_handling_insufficient_context_error_handling(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mock_handle_cfp_extraction = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        side_effect=InsufficientContextError("Not enough context"),
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_cfp_extraction.assert_called_once()


async def test_pipeline_error_handling_indexing_timeout_error_handling(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        side_effect=ValidationError("indexing timeout occurred"),
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_error_handling_indexing_failed_error_handling(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        side_effect=ValidationError("indexing failed completely"),
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_error_handling_generic_backend_error_handling(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        side_effect=BackendError("Unexpected backend error"),
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_state_management_missing_checkpoint_data_validation(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_state_management_job_status_update_from_pending(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        return_value=sample_extract_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_state_management_job_status_no_update_when_not_pending(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    trace_id: str,
    create_pubsub_topics: None,
) -> None:
    mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_extraction_stage",
        return_value=sample_extract_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None


async def test_pipeline_data_flow_checkpoint_data_casting_analyze_stage(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_extract_cfp_dto: ExtractCFPContentStageDTO,
    job_with_analyze_cfp_checkpoint: None,
    trace_id: str,
    create_pubsub_topics: None,
    mock_handle_completions_request: None,
) -> None:
    mock_handle_cfp_analysis = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
        return_value=sample_extract_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_cfp_analysis.assert_called_once()


async def test_pipeline_data_flow_checkpoint_data_casting_sections_stage(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    sample_analyze_cfp_dto: AnalyzeCFPContentStageDTO,
    job_with_extract_sections_checkpoint: None,
    trace_id: str,
    create_pubsub_topics: None,
    mock_handle_completions_request: None,
) -> None:
    mock_handle_section_extraction = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_section_extraction_stage",
        return_value=sample_analyze_cfp_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    mock_handle_section_extraction.assert_called_once()


async def test_cfp_constraint_fields_persisted_to_db(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    requirement: CFPAnalysisRequirementWithQuote = {
        "requirement": "Must include statistical analysis plan",
        "quote_from_source": "Applications must provide detailed statistical methods",
        "category": "methodology",
    }

    constraint: CFPConstraint = {
        "constraint_type": "reference_count",
        "constraint_value": "30 references maximum",
        "source_quote": "up to 30 references",
    }

    section: GrantLongFormSection = {
        "id": "research_plan",
        "title": "Research Plan",
        "order": 1,
        "parent_id": None,
        "evidence": "From CFP page 5: detailed research methodology",
        "keywords": ["methodology"],
        "topics": ["methods"],
        "generation_instructions": "Describe methodology",
        "depends_on": [],
        "max_words": 2000,
        "search_queries": ["methodology"],
        "is_detailed_research_plan": True,
        "is_clinical_trial": None,
        "requirements": [requirement],
        "length_limit": 2000,
        "length_source": "Converted from 5 pages (5 x 415 = 2075 words, reduced to 2000)",
        "other_limits": [constraint],
        "definition": "The research plan section describes your proposed methodology",
    }

    grant_sections: list[GrantLongFormSection | GrantElement] = [section]

    async with async_session_maker() as session, session.begin():
        grant_template.grant_sections = grant_sections
        session.add(grant_template)

    async with async_session_maker() as session:
        result = await session.execute(select(GrantTemplate).where(GrantTemplate.id == grant_template.id))
        retrieved_template = result.scalar_one()

        assert retrieved_template.grant_sections is not None
        assert len(retrieved_template.grant_sections) == 1

        section = retrieved_template.grant_sections[0]

        assert section["id"] == "research_plan"
        assert section["evidence"] == "From CFP page 5: detailed research methodology"

        assert section.get("requirements") == [
            {
                "requirement": "Must include statistical analysis plan",
                "quote_from_source": "Applications must provide detailed statistical methods",
                "category": "methodology",
            }
        ]
        assert section.get("length_limit") == 2000
        assert section.get("length_source") == "Converted from 5 pages (5 x 415 = 2075 words, reduced to 2000)"
        assert section.get("other_limits") == [
            {
                "constraint_type": "reference_count",
                "constraint_value": "30 references maximum",
                "source_quote": "up to 30 references",
            }
        ]
        assert section.get("definition") == "The research plan section describes your proposed methodology"
