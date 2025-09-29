from datetime import date
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.tables import GrantTemplate, GrantTemplateSource
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError
from sqlalchemy.exc import SQLAlchemyError
from testing.factories import RagSourceFactory

from services.rag.src.grant_template.dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
)
from services.rag.src.grant_template.handlers import (
    handle_cfp_analysis_stage,
    handle_cfp_extraction_stage,
    handle_generate_metadata_stage,
    handle_save_grant_template,
    handle_section_extraction_stage,
)


@pytest.fixture
async def sample_rag_sources(async_session_maker: Any, grant_template: Any) -> list[Any]:
    async with async_session_maker() as session:
        sources = [
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
            RagSourceFactory.build(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]
        session.add_all(sources)
        await session.flush()

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
    return AnalyzeCFPContentStageDTO(
        organization=sample_extract_cfp_dto["organization"],
        extracted_data=sample_extract_cfp_dto["extracted_data"],
        analysis_results={
            "cfp_analysis": {
                "sections_count": 3,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 2,
                "required_sections": [
                    {
                        "section_name": "Project Summary",
                        "definition": "Brief overview of the project",
                        "requirements": [
                            {
                                "requirement": "Must include project objectives",
                                "quote_from_source": "The project summary must clearly state the objectives",
                                "category": "content"
                            }
                        ],
                        "dependencies": []
                    }
                ],
                "length_constraints": [
                    {
                        "section_name": "Project Summary",
                        "measurement_type": "pages",
                        "limit_description": "1 page maximum",
                        "quote_from_source": "Project summary is limited to one page",
                        "exclusions": []
                    }
                ],
                "evaluation_criteria": [
                    {
                        "criterion_name": "Scientific Merit",
                        "description": "Quality of the scientific approach",
                        "quote_from_source": "Applications will be evaluated on scientific merit"
                    }
                ],
                "additional_requirements": [
                    {
                        "requirement": "Must use 12-point font",
                        "quote_from_source": "All text must be in 12-point font",
                        "category": "formatting"
                    }
                ],
            },
            "nlp_analysis": {
                "money": ["$50,000 maximum award"],
                "date_time": ["Applications due March 31, 2025"],
                "writing_related": ["Submit a research proposal"],
                "other_numbers": ["3 years maximum project duration"],
                "recommendations": ["Collaboration is encouraged"],
                "orders": ["Submit documents in the following order"],
                "positive_instructions": ["Include preliminary data"],
                "negative_instructions": ["Do not exceed page limits"],
                "evaluation_criteria": ["Scientific merit will be evaluated"],
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
    return ExtractionSectionsStageDTO(
        organization=sample_analyze_cfp_dto["organization"],
        extracted_data=sample_analyze_cfp_dto["extracted_data"],
        analysis_results=sample_analyze_cfp_dto["analysis_results"],
        extracted_sections=[
            {
                "title": "Project Summary",
                "id": "project_summary",
                "is_detailed_research_plan": False,
                "is_title_only": False,
                "is_clinical_trial": False,
                "is_long_form": True,
                "order": 1,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "is_detailed_research_plan": True,
                "is_title_only": False,
                "is_clinical_trial": False,
                "is_long_form": True,
                "order": 2,
            },
        ],
    )


@patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed")
@patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data")
async def test_cfp_extraction_stage_success(
    mock_handle_extract_cfp_data: AsyncMock,
    mock_verify_rag_sources: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    nih_organization: Any,
    sample_rag_sources: list[Any],
    async_session_maker: Any,
) -> None:
    mock_verify_rag_sources.return_value = None
    mock_handle_extract_cfp_data.return_value = {
        "organization_id": str(nih_organization.id),
        "cfp_subject": "Research Grant Program",
        "submission_date": "2025-03-31",
    }

    result = await handle_cfp_extraction_stage(
        grant_template=grant_template,
        job_manager=mock_grant_template_job_manager,
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    assert "organization" in result
    assert "extracted_data" in result
    if result["organization"]:
        assert result["organization"]["full_name"] == "National Institutes of Health"
    assert result["extracted_data"]["cfp_subject"] == "Research Grant Program"
    assert result["extracted_data"]["submission_date"] == "2025-03-31"

    assert mock_grant_template_job_manager.ensure_not_cancelled.call_count == 2

    assert mock_grant_template_job_manager.add_notification.call_count == 2
    mock_grant_template_job_manager.add_notification.assert_any_call(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
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

    mock_verify_rag_sources.assert_called_once_with(
        parent_id=grant_template.id,
        session_maker=async_session_maker,
        entity_type=GrantTemplate,
        trace_id="test-trace",
    )

    mock_handle_extract_cfp_data.assert_called_once()
    call_args = mock_handle_extract_cfp_data.call_args
    assert len(call_args.kwargs["source_ids"]) == 2
    assert str(nih_organization.id) in call_args.kwargs["organization_mapping"]


@patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed")
@patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data")
async def test_cfp_extraction_stage_no_organization_match(
    mock_handle_extract_cfp_data: AsyncMock,
    mock_verify_rag_sources: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    nih_organization: Any,
    sample_rag_sources: list[Any],
    async_session_maker: Any,
) -> None:
    mock_verify_rag_sources.return_value = None
    mock_handle_extract_cfp_data.return_value = {
        "organization_id": str(uuid4()),
        "cfp_subject": "Research Grant Program",
        "submission_date": "2025-03-31",
    }

    result = await handle_cfp_extraction_stage(
        grant_template=grant_template,
        job_manager=mock_grant_template_job_manager,
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    assert result["organization"] is None

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
    mock_handle_extract_cfp_data: AsyncMock,
    mock_verify_rag_sources: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    nih_organization: Any,
    sample_rag_sources: list[Any],
    async_session_maker: Any,
) -> None:
    mock_verify_rag_sources.return_value = None
    mock_handle_extract_cfp_data.return_value = {
        "organization_id": str(nih_organization.id),
        "cfp_subject": "Research Grant Program",
        "submission_date": None,
    }

    result = await handle_cfp_extraction_stage(
        grant_template=grant_template,
        job_manager=mock_grant_template_job_manager,
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    assert result["extracted_data"]["submission_date"] is None

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
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    nih_organization: Any,
    sample_rag_sources: list[Any],
    async_session_maker: Any,
) -> None:
    with (
        patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed"),
        patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data") as mock_extract,
    ):
        mock_extract.return_value = {
            "organization_id": str(nih_organization.id),
            "cfp_subject": "Test Subject",
            "submission_date": "2025-12-31",
        }

        result = await handle_cfp_extraction_stage(
            grant_template=grant_template,
            job_manager=mock_grant_template_job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

        if result["organization"]:
            assert result["organization"]["full_name"] == nih_organization.full_name
            assert result["organization"]["abbreviation"] == nih_organization.abbreviation
            assert result["organization"]["organization_id"] == nih_organization.id

        call_args = mock_extract.call_args
        source_ids = call_args.kwargs["source_ids"]
        assert len(source_ids) == 2
        assert all(str(source.id) in source_ids for source in sample_rag_sources)


@patch("services.rag.src.grant_template.handlers.handle_analyze_cfp")
async def test_cfp_analysis_stage_success(
    mock_handle_analyze_cfp: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_extract_cfp_dto: Any,
) -> None:
    mock_analysis_result = {
        "cfp_analysis": {
            "sections_count": 5,
            "length_constraints_found": 2,
            "evaluation_criteria_count": 3,
            "required_sections": [
                {
                    "section_name": "Research Plan",
                    "definition": "Detailed description of the research methodology",
                    "requirements": [
                        {
                            "requirement": "Must include hypothesis",
                            "quote_from_source": "Research plan must clearly state the hypothesis",
                            "category": "content"
                        }
                    ],
                    "dependencies": ["Project Summary"]
                }
            ],
            "length_constraints": [
                {
                    "section_name": "Research Plan",
                    "measurement_type": "pages",
                    "limit_description": "15 pages maximum",
                    "quote_from_source": "Research plan cannot exceed 15 pages",
                    "exclusions": ["References", "Figures"]
                }
            ],
            "evaluation_criteria": [
                {
                    "criterion_name": "Innovation",
                    "description": "Degree of innovation in the approach",
                    "quote_from_source": "Applications will be evaluated for innovation",
                    "weight_percentage": 30
                }
            ],
            "additional_requirements": [
                {
                    "requirement": "Must include budget justification",
                    "quote_from_source": "A detailed budget justification is required",
                    "category": "budget"
                }
            ],
        },
        "nlp_analysis": {
            "money": ["$250,000 maximum total award"],
            "date_time": ["Submit by December 15, 2025"],
            "writing_related": ["Prepare a comprehensive research proposal"],
            "other_numbers": ["5 years maximum project duration"],
            "recommendations": ["International collaboration is encouraged"],
            "orders": ["Submit sections in the specified order"],
            "positive_instructions": ["Include detailed methodology"],
            "negative_instructions": ["Do not include proprietary information"],
            "evaluation_criteria": ["Innovation and feasibility will be assessed"],
        },
        "analysis_metadata": {
            "categories_found": 5,
            "total_sentences": 20,
            "content_length": 1000,
        },
    }
    mock_handle_analyze_cfp.return_value = mock_analysis_result

    result = await handle_cfp_analysis_stage(
        extracted_cfp=sample_extract_cfp_dto,
        job_manager=mock_grant_template_job_manager,
        trace_id="test-trace",
    )

    assert result["organization"] == sample_extract_cfp_dto["organization"]
    assert result["extracted_data"] == sample_extract_cfp_dto["extracted_data"]
    assert result["analysis_results"] == mock_analysis_result

    mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

    assert mock_grant_template_job_manager.add_notification.call_count == 2
    mock_grant_template_job_manager.add_notification.assert_any_call(
        event=NotificationEvents.SECTIONS_EXTRACTED,
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

    mock_handle_analyze_cfp.assert_called_once()
    call_args = mock_handle_analyze_cfp.call_args
    assert "full_cfp_text" in call_args.kwargs
    assert call_args.kwargs["trace_id"] == "test-trace"


@patch("services.rag.src.grant_template.handlers.handle_analyze_cfp")
async def test_cfp_analysis_stage_limited_disciplines(
    mock_handle_analyze_cfp: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_extract_cfp_dto: Any,
) -> None:
    mock_analysis_result = {
        "cfp_analysis": {
            "sections_count": 3,
            "length_constraints_found": 1,
            "evaluation_criteria_count": 2,
            "required_sections": [
                {
                    "section_name": "Abstract",
                    "definition": "Summary of the proposed research",
                    "requirements": [
                        {
                            "requirement": "Must be self-contained",
                            "quote_from_source": "Abstract must be self-contained and comprehensive",
                            "category": "content"
                        }
                    ],
                    "dependencies": []
                }
            ],
            "length_constraints": [
                {
                    "section_name": "Abstract",
                    "measurement_type": "words",
                    "limit_description": "300 words maximum",
                    "quote_from_source": "Abstract is limited to 300 words",
                    "exclusions": []
                }
            ],
            "evaluation_criteria": [
                {
                    "criterion_name": "Feasibility",
                    "description": "Likelihood of successful completion",
                    "quote_from_source": "Feasibility will be a key evaluation factor"
                },
                {
                    "criterion_name": "Impact",
                    "description": "Potential impact of the research",
                    "quote_from_source": "Expected impact will be evaluated"
                }
            ],
            "additional_requirements": [
                {
                    "requirement": "Must include ethics approval",
                    "quote_from_source": "Ethics approval is required for all studies",
                    "category": "eligibility"
                }
            ],
        },
        "nlp_analysis": {
            "money": ["$100,000 budget limit"],
            "date_time": ["Submit by June 30, 2025"],
            "writing_related": ["Submit detailed research proposal"],
            "other_numbers": ["2 years project duration"],
            "recommendations": ["Multidisciplinary teams preferred"],
            "orders": ["Follow application guidelines"],
            "positive_instructions": ["Include pilot data if available"],
            "negative_instructions": ["Avoid overlapping with existing work"],
            "evaluation_criteria": ["Scientific rigor will be evaluated"],
        },
        "analysis_metadata": {
            "content_length": 1500,
            "categories_found": 6,
            "total_sentences": 75,
        },
    }
    mock_handle_analyze_cfp.return_value = mock_analysis_result

    await handle_cfp_analysis_stage(
        extracted_cfp=sample_extract_cfp_dto,
        job_manager=mock_grant_template_job_manager,
        trace_id="test-trace",
    )

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
    mock_handle_analyze_cfp: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_extract_cfp_dto: Any,
) -> None:
    mock_analysis_result = {
        "cfp_analysis": {
            "sections_count": 1,
            "length_constraints_found": 0,
            "evaluation_criteria_count": 1,
            "required_sections": [
                {
                    "section_name": "Project Description",
                    "definition": "Basic description of the project",
                    "requirements": [
                        {
                            "requirement": "Must describe objectives",
                            "quote_from_source": "Project description must outline objectives",
                            "category": "content"
                        }
                    ],
                    "dependencies": []
                }
            ],
            "length_constraints": [],
            "evaluation_criteria": [
                {
                    "criterion_name": "Clarity",
                    "description": "Clarity of presentation",
                    "quote_from_source": "Clarity of presentation will be evaluated"
                }
            ],
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
            "evaluation_criteria": ["Clarity will be assessed"],
        },
        "analysis_metadata": {
            "content_length": 800,
            "categories_found": 0,
            "total_sentences": 40,
        },
    }
    mock_handle_analyze_cfp.return_value = mock_analysis_result

    await handle_cfp_analysis_stage(
        extracted_cfp=sample_extract_cfp_dto,
        job_manager=mock_grant_template_job_manager,
        trace_id="test-trace",
    )

    mock_grant_template_job_manager.add_notification.assert_any_call(
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message="Requirements analysis complete",
        notification_type="success",
        data={
            "categories_found": 0,
            "total_sentences": 40,
        },
    )


@patch("services.rag.src.grant_template.handlers.handle_extract_sections")
async def test_section_extraction_stage_success(
    mock_handle_extract_sections: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_analyze_cfp_dto: Any,
) -> None:
    mock_extracted_sections = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "is_detailed_research_plan": False,
            "is_long_form": True,
            "order": 1,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 2,
        },
    ]
    mock_handle_extract_sections.return_value = mock_extracted_sections

    result = await handle_section_extraction_stage(
        analysis_result=sample_analyze_cfp_dto,
        job_manager=mock_grant_template_job_manager,
        trace_id="test-trace",
    )

    assert result["organization"] == sample_analyze_cfp_dto["organization"]
    assert result["extracted_data"] == sample_analyze_cfp_dto["extracted_data"]
    assert result["analysis_results"] == sample_analyze_cfp_dto["analysis_results"]
    assert result["extracted_sections"] == mock_extracted_sections

    mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

    assert mock_grant_template_job_manager.add_notification.call_count == 2
    mock_grant_template_job_manager.add_notification.assert_any_call(
        event=NotificationEvents.METADATA_GENERATED,
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

    mock_handle_extract_sections.assert_called_once()
    call_args = mock_handle_extract_sections.call_args
    assert "cfp_content" in call_args.kwargs
    assert "cfp_subject" in call_args.kwargs
    assert "organization" in call_args.kwargs
    assert call_args.kwargs["trace_id"] == "test-trace"


@patch("services.rag.src.grant_template.handlers.handle_generate_grant_template_metadata")
async def test_generate_metadata_stage_success(
    mock_handle_generate_metadata: AsyncMock,
    mock_grant_template_job_manager: AsyncMock,
    sample_sections_dto: Any,
) -> None:
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

    result = await handle_generate_metadata_stage(
        section_extraction_result=sample_sections_dto,
        job_manager=mock_grant_template_job_manager,
        trace_id="test-trace",
    )

    assert len(result) == 2
    assert all(isinstance(section, (dict)) for section in result)

    project_section = result[0]
    assert project_section["id"] == "project_summary"
    assert project_section["title"] == "Project Summary"
    assert project_section["order"] == 1

    research_section = result[1]
    assert research_section["id"] == "research_plan"
    assert research_section["title"] == "Research Plan"
    assert research_section["order"] == 2

    mock_grant_template_job_manager.ensure_not_cancelled.assert_called_once()

    mock_handle_generate_metadata.assert_called_once()
    call_args = mock_handle_generate_metadata.call_args
    assert "cfp_content" in call_args.kwargs
    assert "cfp_subject" in call_args.kwargs
    assert "organization" in call_args.kwargs
    assert "long_form_sections" in call_args.kwargs


async def test_save_grant_template_success(
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_sections_dto: Any,
    async_session_maker: Any,
    nih_organization: Any,
) -> None:
    mock_grant_sections: list[GrantElement | GrantLongFormSection] = [
        GrantLongFormSection(
            id="section1",
            title="Project Summary",
            order=1,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        ),
        GrantLongFormSection(
            id="section2",
            title="Research Plan",
            order=2,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        ),
    ]

    if sample_sections_dto["organization"]:
        sample_sections_dto["organization"]["organization_id"] = nih_organization.id
    sample_sections_dto["extracted_data"]["organization_id"] = str(nih_organization.id)

    result = await handle_save_grant_template(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_grant_template_job_manager,
        cfp_analysis=sample_sections_dto["analysis_results"],
        extracted_cfp=sample_sections_dto,
        grant_sections=mock_grant_sections,
        trace_id="test-trace",
    )

    assert isinstance(result, GrantTemplate)
    assert result.id == grant_template.id

    async with async_session_maker() as session:
        updated_template = await session.get(GrantTemplate, grant_template.id)
        assert updated_template.grant_sections == mock_grant_sections
        assert updated_template.cfp_analysis == sample_sections_dto["analysis_results"]
        assert updated_template.granting_institution_id == sample_sections_dto["organization"]["organization_id"]

    mock_grant_template_job_manager.update_job_status.assert_called_once_with(RagGenerationStatusEnum.COMPLETED)

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
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_sections_dto: Any,
    async_session_maker: Any,
) -> None:
    sections_dto_no_org = sample_sections_dto.copy()
    sections_dto_no_org["organization"] = None

    mock_grant_sections: list[GrantElement | GrantLongFormSection] = [
        GrantLongFormSection(
            id="section1",
            title="Project Summary",
            order=1,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        )
    ]

    await handle_save_grant_template(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_grant_template_job_manager,
        cfp_analysis=sections_dto_no_org["analysis_results"],
        extracted_cfp=sections_dto_no_org,
        grant_sections=mock_grant_sections,
        trace_id="test-trace",
    )

    async with async_session_maker() as session:
        updated_template = await session.get(GrantTemplate, grant_template.id)
        assert updated_template.granting_institution_id is None

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
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_sections_dto: Any,
    async_session_maker: Any,
    nih_organization: Any,
) -> None:
    sections_dto_no_date = sample_sections_dto.copy()
    sections_dto_no_date["extracted_data"]["submission_date"] = None

    if sections_dto_no_date["organization"]:
        sections_dto_no_date["organization"]["organization_id"] = nih_organization.id
    sections_dto_no_date["extracted_data"]["organization_id"] = str(nih_organization.id)

    mock_grant_sections: list[GrantElement | GrantLongFormSection] = [
        GrantLongFormSection(
            id="section1",
            title="Project Summary",
            order=1,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        )
    ]

    await handle_save_grant_template(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_grant_template_job_manager,
        cfp_analysis=sections_dto_no_date["analysis_results"],
        extracted_cfp=sections_dto_no_date,
        grant_sections=mock_grant_sections,
        trace_id="test-trace",
    )

    async with async_session_maker() as session:
        updated_template = await session.get(GrantTemplate, grant_template.id)
        assert updated_template.submission_date is None


async def test_save_grant_template_date_parsing(
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_sections_dto: Any,
    async_session_maker: Any,
    nih_organization: Any,
) -> None:
    if sample_sections_dto["organization"]:
        sample_sections_dto["organization"]["organization_id"] = nih_organization.id
    sample_sections_dto["extracted_data"]["organization_id"] = str(nih_organization.id)

    mock_grant_sections: list[GrantElement | GrantLongFormSection] = [
        GrantLongFormSection(
            id="section1",
            title="Project Summary",
            order=1,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        )
    ]

    await handle_save_grant_template(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_grant_template_job_manager,
        cfp_analysis=sample_sections_dto["analysis_results"],
        extracted_cfp=sample_sections_dto,
        grant_sections=mock_grant_sections,
        trace_id="test-trace",
    )

    async with async_session_maker() as session:
        updated_template = await session.get(GrantTemplate, grant_template.id)
        assert updated_template.submission_date == date(2025, 3, 31)


async def test_save_grant_template_database_error(
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    sample_sections_dto: Any,
    async_session_maker: Any,
) -> None:
    mock_grant_sections: list[GrantElement | GrantLongFormSection] = [
        GrantLongFormSection(
            id="section1",
            title="Project Summary",
            order=1,
            parent_id=None,
            keywords=[],
            topics=[],
            generation_instructions="",
            depends_on=[],
            max_words=100,
            search_queries=[],
            is_clinical_trial=None,
            is_detailed_research_plan=False,
        )
    ]

    with patch("services.rag.src.grant_template.handlers.update") as mock_update:
        mock_update.side_effect = SQLAlchemyError("Database connection failed")

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


async def test_handlers_preserve_data_flow(
    mock_grant_template_job_manager: AsyncMock,
    grant_template: Any,
    nih_organization: Any,
    sample_rag_sources: list[Any],
    async_session_maker: Any,
) -> None:
    with (
        patch("services.rag.src.grant_template.handlers.verify_rag_sources_indexed"),
        patch("services.rag.src.grant_template.handlers.handle_extract_cfp_data") as mock_extract,
        patch("services.rag.src.grant_template.handlers.handle_analyze_cfp") as mock_analyze,
        patch("services.rag.src.grant_template.handlers.handle_extract_sections") as mock_sections,
    ):
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
                "sections_count": 2,
                "length_constraints_found": 1,
                "evaluation_criteria_count": 1,
                "required_sections": [
                    {
                        "section_name": "Research Strategy",
                        "definition": "Comprehensive research approach",
                        "requirements": [
                            {
                                "requirement": "Must include timeline",
                                "quote_from_source": "Research strategy must include detailed timeline",
                                "category": "content"
                            }
                        ],
                        "dependencies": []
                    }
                ],
                "length_constraints": [
                    {
                        "section_name": "Research Strategy",
                        "measurement_type": "pages",
                        "limit_description": "12 pages maximum",
                        "quote_from_source": "Research strategy limited to 12 pages",
                        "exclusions": ["References"]
                    }
                ],
                "evaluation_criteria": [
                    {
                        "criterion_name": "Approach",
                        "description": "Quality of research approach",
                        "quote_from_source": "Research approach will be evaluated"
                    }
                ],
                "additional_requirements": [
                    {
                        "requirement": "Must include team qualifications",
                        "quote_from_source": "Team qualifications must be provided",
                        "category": "eligibility"
                    }
                ],
            },
            "nlp_analysis": {
                "money": ["$75,000 funding available"],
                "date_time": ["3-year project duration"],
                "writing_related": ["Submit comprehensive proposal"],
                "other_numbers": ["Maximum 3 collaborators"],
                "recommendations": ["Preliminary data recommended"],
                "orders": ["Submit in specified format"],
                "positive_instructions": ["Include detailed methodology"],
                "negative_instructions": ["Do not exceed length limits"],
                "evaluation_criteria": ["Methodology will be assessed"],
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
                "is_detailed_research_plan": False,
                "is_title_only": False,
                "is_clinical_trial": False,
                "is_long_form": True,
                "order": 1,
            }
        ]

        extraction_result = await handle_cfp_extraction_stage(
            grant_template=grant_template,
            job_manager=mock_grant_template_job_manager,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

        analysis_result = await handle_cfp_analysis_stage(
            extracted_cfp=extraction_result,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        sections_result = await handle_section_extraction_stage(
            analysis_result=analysis_result,
            job_manager=mock_grant_template_job_manager,
            trace_id="test-trace",
        )

        assert sections_result["organization"] == extraction_result["organization"]
        assert sections_result["extracted_data"] == extraction_result["extracted_data"]
        assert sections_result["analysis_results"] == analysis_result["analysis_results"]
        assert len(sections_result["extracted_sections"]) == 1

        if sections_result["organization"]:
            assert sections_result["organization"]["full_name"] == "National Institutes of Health"
            assert sections_result["organization"]["abbreviation"] == "NIH"
        assert sections_result["extracted_data"]["cfp_subject"] == "Research Grant"
        assert sections_result["extracted_data"]["submission_date"] == "2025-06-15"
