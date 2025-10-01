from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective, ResearchTask
from packages.db.src.tables import GrantApplication

from services.rag.src.grant_application.dto import (
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
    SectionText,
)
from services.rag.src.grant_application.handlers import (
    handle_enrich_objectives_stage,
    handle_enrich_terminology_stage,
    handle_extract_relationships_stage,
    handle_generate_research_plan_stage,
    handle_generate_sections_stage,
)
from services.rag.src.utils.job_manager import JobManager


@pytest.fixture
def mock_grant_application_job_manager() -> AsyncMock:
    mock = AsyncMock(spec=JobManager)
    mock.ensure_not_cancelled = AsyncMock()
    mock.add_notification = AsyncMock()
    return mock


@pytest.fixture
def sample_work_plan_section() -> GrantLongFormSection:
    return GrantLongFormSection(
        id="research_plan",
        title="Research Plan",
        order=3,
        evidence="CFP evidence for Research Plan",
        parent_id=None,
        keywords=["methodology"],
        topics=["methods"],
        generation_instructions="Describe methodology",
        depends_on=[],
        max_words=1500,
        search_queries=["methodology"],
        is_detailed_research_plan=True,
        is_clinical_trial=None,
    )


@pytest.fixture
def sample_grant_sections() -> list[GrantLongFormSection]:
    return [
        GrantLongFormSection(
            id="abstract",
            title="Abstract",
            order=1,
            evidence="CFP evidence for Abstract",
            parent_id=None,
            keywords=["summary"],
            topics=["overview"],
            generation_instructions="Write abstract",
            depends_on=[],
            max_words=250,
            search_queries=["abstract"],
            is_detailed_research_plan=False,
            is_clinical_trial=None,
        ),
        GrantLongFormSection(
            id="significance",
            title="Significance",
            order=2,
            evidence="CFP evidence for Significance",
            parent_id=None,
            keywords=["impact"],
            topics=["importance"],
            generation_instructions="Explain significance",
            depends_on=[],
            max_words=500,
            search_queries=["significance"],
            is_detailed_research_plan=False,
            is_clinical_trial=None,
        ),
    ]


@patch("services.rag.src.grant_application.handlers.retrieve_documents")
@patch("services.rag.src.grant_application.handlers.handle_generate_section_text")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_generate_sections_stage_success(
    mock_batched_gather: AsyncMock,
    mock_handle_generate_section_text: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    mock_grant_application_job_manager: JobManager[Any],
    grant_application: GrantApplication,
    sample_grant_sections: list[GrantLongFormSection],
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Test objective",
            research_tasks=[ResearchTask(number=1, title="Test task")],
        )
    ]

    mock_grant_template = AsyncMock()
    mock_grant_template.grant_sections = [*sample_grant_sections, sample_work_plan_section]
    mock_grant_template.cfp_analysis = {
        "sections_count": 3,
        "length_constraints_found": 2,
        "evaluation_criteria_count": 2,
    }
    grant_application.grant_template = mock_grant_template

    mock_retrieve_documents.return_value = ["Retrieved context document 1", "Retrieved context document 2"]
    mock_batched_gather.return_value = ["Generated abstract text", "Generated significance text"]

    input_dto = GenerateResearchPlanStageDTO(
        work_plan_section=sample_work_plan_section,
        relationships={"1": [("2", "test relationship")]},
        enrichment_responses=[],
        wikidata_enrichments=[],
        research_plan_text="Test research plan text",
    )

    result = await handle_generate_sections_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert "section_texts" in result
    assert "work_plan_section" in result
    assert len(result["section_texts"]) == 2
    assert result["section_texts"][0]["section_id"] == "abstract"
    assert result["section_texts"][1]["section_id"] == "significance"
    assert result["work_plan_section"]["id"] == "research_plan"

    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()

    mock_retrieve_documents.assert_called_once()


@patch("services.rag.src.grant_application.handlers.handle_extract_relationships")
async def test_extract_relationships_stage_success(
    mock_handle_extract_relationships: AsyncMock,
    mock_grant_application_job_manager: JobManager[Any],
    grant_application: GrantApplication,
    research_objectives: list[ResearchObjective],
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    grant_application.research_objectives = research_objectives

    mock_relationships = {
        "1": [("2", "provides_data_for")],
        "2": [("1", "depends_on")],
    }
    mock_handle_extract_relationships.return_value = mock_relationships

    mock_grant_template = AsyncMock()
    mock_grant_template.grant_sections = [sample_work_plan_section]
    grant_application.grant_template = mock_grant_template

    result = await handle_extract_relationships_stage(
        grant_application=grant_application,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert "relationships" in result
    assert result["relationships"] == mock_relationships

    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.handle_batch_enrich_objectives")
async def test_enrich_objectives_stage_success(
    mock_handle_batch_enrich_objectives: AsyncMock,
    mock_grant_application_job_manager: JobManager[Any],
    grant_application: GrantApplication,
    research_objectives: list[ResearchObjective],
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    grant_application.research_objectives = research_objectives

    input_dto = ExtractRelationshipsStageDTO(
        work_plan_section=sample_work_plan_section,
        relationships={
            "1": [("2", "provides_data_for")],
            "2": [("1", "depends_on")],
        },
    )

    mock_enrichment_responses = [
        {
            "research_objective": {
                "description": "Enhanced objective 1",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 1"],
                "search_queries": ["query 1"],
                "enriched_objective": "Enriched objective 1",
                "core_scientific_terms": ["term1"],
                "scientific_context": "context1",
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 1.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                    "enriched_objective": "Enriched task 1.1",
                    "core_scientific_terms": ["term2"],
                    "scientific_context": "context2",
                }
            ],
        },
        {
            "research_objective": {
                "description": "Enhanced objective 2",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 2"],
                "search_queries": ["query 2"],
                "enriched_objective": "Enriched objective 2",
                "core_scientific_terms": ["term3"],
                "scientific_context": "context3",
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 2.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                    "enriched_objective": "Enriched task 2.1",
                    "core_scientific_terms": ["term4"],
                    "scientific_context": "context4",
                }
            ],
        },
    ]
    mock_handle_batch_enrich_objectives.return_value = mock_enrichment_responses

    result = await handle_enrich_objectives_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert "enrichment_responses" in result
    assert len(result["enrichment_responses"]) == 2

    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.enrich_objective_with_wikidata")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_enrich_terminology_stage_success(
    mock_batched_gather: AsyncMock,
    mock_enrich_objective_with_wikidata: AsyncMock,
    mock_grant_application_job_manager: JobManager[Any],
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    input_dto = EnrichObjectivesStageDTO(
        work_plan_section=sample_work_plan_section,
        relationships={},
        enrichment_responses=[
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                    "enriched_objective": "Enriched objective 1",
                    "core_scientific_terms": ["term1"],
                    "scientific_context": "context1",
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                        "enriched_objective": "Enriched task",
                        "core_scientific_terms": ["term2"],
                        "scientific_context": "context2",
                    }
                ],
            },
            {
                "research_objective": {
                    "description": "Enhanced objective 2",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                    "enriched_objective": "Enriched objective 2",
                    "core_scientific_terms": ["term3"],
                    "scientific_context": "context3",
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                        "enriched_objective": "Enriched task",
                        "core_scientific_terms": ["term4"],
                        "scientific_context": "context4",
                    }
                ],
            },
        ],
    )

    mock_terminology_contexts = [
        {
            "core_scientific_terms": ["biomarkers", "proteomics"],
            "scientific_context": "Cancer biomarker discovery",
            "enriched_objective": "Enriched objective",
            "search_queries": ["query"],
        },
        {
            "core_scientific_terms": ["machine learning", "algorithms"],
            "scientific_context": "ML model development",
            "enriched_objective": "Enriched objective",
            "search_queries": ["query"],
        },
    ]
    mock_batched_gather.return_value = mock_terminology_contexts

    result = await handle_enrich_terminology_stage(
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert "enrichment_responses" in result
    assert "wikidata_enrichments" in result
    assert len(result["wikidata_enrichments"]) == 2

    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.generate_workplan_section")
async def test_generate_research_plan_stage_success(
    mock_generate_workplan_section: AsyncMock,
    mock_grant_application_job_manager: JobManager[Any],
    grant_application: GrantApplication,
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        )
    ]

    input_dto = EnrichTerminologyStageDTO(
        work_plan_section=sample_work_plan_section,
        relationships={},
        enrichment_responses=[
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                    "enriched_objective": "Enriched objective 1",
                    "core_scientific_terms": ["term1"],
                    "scientific_context": "context1",
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task 1.1",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                        "enriched_objective": "Enriched task 1.1",
                        "core_scientific_terms": ["term2"],
                        "scientific_context": "context2",
                    },
                    {
                        "description": "Enhanced task 1.2",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                        "enriched_objective": "Enriched task 1.2",
                        "core_scientific_terms": ["term3"],
                        "scientific_context": "context3",
                    },
                ],
            }
        ],
        wikidata_enrichments=[
            {
                "core_scientific_terms": ["biomarkers"],
                "scientific_context": "Context",
                "enriched_objective": "Enriched objective",
                "search_queries": ["query"],
            }
        ],
    )

    mock_generate_workplan_section.return_value = """
### Objective 1: Develop novel biomarkers
Generated objective text

#### 1.1: Identify candidate biomarkers
Generated task 1 text

#### 1.2: Validate biomarkers
Generated task 2 text""".strip()

    result = await handle_generate_research_plan_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert "research_plan_text" in result
    assert "### Objective 1: Develop novel biomarkers" in result["research_plan_text"]
    assert "Generated objective text" in result["research_plan_text"]
    assert "Generated task 1 text" in result["research_plan_text"]

    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


async def test_handlers_preserve_data_flow(
    grant_application: GrantApplication,
    sample_grant_sections: list[GrantLongFormSection],
    sample_work_plan_section: GrantLongFormSection,
) -> None:
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Test objective",
            research_tasks=[ResearchTask(number=1, title="Test task")],
        )
    ]

    test_dto = GenerateSectionsStageDTO(
        section_texts=[
            SectionText(section_id="abstract", text="Test abstract"),
        ],
        work_plan_section=sample_work_plan_section,
        relationships={},
        enrichment_responses=[],
        wikidata_enrichments=[],
        research_plan_text="Test research plan",
    )

    assert "section_texts" in test_dto
    assert "work_plan_section" in test_dto
    assert test_dto["section_texts"][0]["section_id"] == "abstract"
    assert test_dto["work_plan_section"]["id"] == "research_plan"
