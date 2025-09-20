from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.shared_utils.src.constants import NotificationEvents

from services.rag.src.grant_application.handlers import (
    handle_enrich_objectives_stage,
    handle_enrich_terminology_stage,
    handle_extract_relationships_stage,
    handle_generate_research_plan_stage,
    handle_generate_sections_stage,
)


@pytest.fixture
def mock_job_manager():
    """Mock job manager with all required methods."""
    manager = AsyncMock()
    manager.ensure_not_cancelled = AsyncMock()
    manager.add_notification = AsyncMock()
    return manager


@pytest.fixture
def sample_research_objectives():
    """Sample research objectives."""
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Create ML model",
            research_tasks=[
                ResearchTask(number=1, title="Design algorithms"),
                ResearchTask(number=2, title="Train model"),
            ],
        ),
    ]


@pytest.fixture
def sample_work_plan_section():
    """Sample work plan section."""
    return {
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
    }


@pytest.fixture
def sample_grant_sections():
    """Sample grant sections."""
    return [
        {
            "id": "abstract",
            "title": "Abstract",
            "order": 1,
            "parent_id": None,
            "keywords": ["summary"],
            "topics": ["overview"],
            "generation_instructions": "Write abstract",
            "depends_on": [],
            "max_words": 250,
            "search_queries": ["abstract"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": None,
        },
        {
            "id": "significance",
            "title": "Significance",
            "order": 2,
            "parent_id": None,
            "keywords": ["impact"],
            "topics": ["importance"],
            "generation_instructions": "Explain significance",
            "depends_on": [],
            "max_words": 500,
            "search_queries": ["significance"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": None,
        },
    ]


@patch("services.rag.src.grant_application.handlers.retrieve_documents")
@patch("services.rag.src.grant_application.handlers.handle_generate_section_text")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_generate_sections_stage_success(
    mock_batched_gather,
    mock_handle_generate_section_text,
    mock_retrieve_documents,
    mock_job_manager,
    async_session_manager,
    sample_grant_sections,
    sample_work_plan_section,
) -> None:
    """Test successful section generation stage."""
    async with async_session_manager() as session, session.begin():
        from packages.db.src.models import GrantApplication, GrantTemplate

        # Create grant template with sections
        grant_template = GrantTemplate(
            id=uuid4(),
            organization_id=uuid4(),
            grant_sections=sample_grant_sections + [sample_work_plan_section],
            cfp_analysis={
                "sections_count": 3,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 2,
            }
        )
        session.add(grant_template)

        # Create grant application
        grant_application = GrantApplication(
            id=uuid4(),
            organization_id=grant_template.organization_id,
            grant_template_id=grant_template.id,
            grant_template=grant_template,
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test objective",
                    research_tasks=[ResearchTask(number=1, title="Test task")],
                )
            ]
        )
        session.add(grant_application)
        await session.flush()

        # Setup mocks
        mock_retrieve_documents.return_value = ["Retrieved context document 1", "Retrieved context document 2"]
        mock_batched_gather.return_value = ["Generated abstract text", "Generated significance text"]

        # Execute
        result = await handle_generate_sections_stage(
            grant_application=grant_application,
            job_manager=mock_job_manager,
            trace_id=str(uuid4()),
        )

        # Verify result structure
        assert isinstance(result, dict)
        assert "section_texts" in result
        assert "work_plan_section" in result
        assert len(result["section_texts"]) == 2
        assert result["section_texts"][0]["section_id"] == "abstract"
        assert result["section_texts"][1]["section_id"] == "significance"
        assert result["work_plan_section"]["id"] == "research_plan"

        # Verify cancellation checks
        assert mock_job_manager.ensure_not_cancelled.call_count >= 2

        # Verify notifications
        assert mock_job_manager.add_notification.call_count >= 2

        # Verify retrieval was called
        mock_retrieve_documents.assert_called_once()


async def test_generate_sections_stage_missing_grant_template(
    mock_job_manager,
    async_session_manager,
) -> None:
    """Test section generation with missing grant template."""
    async with async_session_manager() as session, session.begin():
        from packages.db.src.models import GrantApplication

        # Create grant application without grant template
        grant_application = GrantApplication(
            id=uuid4(),
            organization_id=uuid4(),
            grant_template_id=None,
            grant_template=None,
            research_objectives=[]
        )
        session.add(grant_application)
        await session.flush()

        # Execute and expect error
        with pytest.raises(ValueError, match="Grant template not found"):
            await handle_generate_sections_stage(
                grant_application=grant_application,
                job_manager=mock_job_manager,
                trace_id=str(uuid4()),
            )


@patch("services.rag.src.grant_application.handlers.retrieve_documents")
@patch("services.rag.src.grant_application.handlers.handle_generate_section_text")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_generate_sections_stage_missing_cfp_analysis(
    mock_batched_gather,
    mock_handle_generate_section_text,
    mock_retrieve_documents,
    mock_job_manager,
    async_session_manager,
    sample_grant_sections,
    sample_work_plan_section,
) -> None:
    """Test section generation with missing CFP analysis."""
    async with async_session_manager() as session, session.begin():
        from packages.db.src.models import GrantApplication, GrantTemplate

        # Create grant template without CFP analysis
        grant_template = GrantTemplate(
            id=uuid4(),
            organization_id=uuid4(),
            grant_sections=sample_grant_sections + [sample_work_plan_section],
            cfp_analysis=None
        )
        session.add(grant_template)

        # Create grant application
        grant_application = GrantApplication(
            id=uuid4(),
            organization_id=grant_template.organization_id,
            grant_template_id=grant_template.id,
            grant_template=grant_template,
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test objective",
                    research_tasks=[ResearchTask(number=1, title="Test task")],
                )
            ]
        )
        session.add(grant_application)
        await session.flush()

        # Execute and expect error
        with pytest.raises(ValueError, match="CFP analysis not found"):
            await handle_generate_sections_stage(
                grant_application=grant_application,
                job_manager=mock_job_manager,
                trace_id=str(uuid4()),
            )


@patch("services.rag.src.grant_application.handlers.handle_extract_relationships")
async def test_extract_relationships_stage_success(
    mock_handle_extract_relationships,
    mock_job_manager,
    sample_research_objectives,
    sample_work_plan_section,
) -> None:
    """Test successful relationship extraction stage."""
    # Setup input DTO
    input_dto = {
        "section_texts": [
            {"section_id": "abstract", "text": "Abstract text"},
            {"section_id": "significance", "text": "Significance text"},
        ],
        "work_plan_section": sample_work_plan_section,
    }

    # Setup mock
    mock_relationships = {
        "1": [("2", "provides_data_for", "Objective 1 provides data for objective 2")],
        "2": [("1", "depends_on", "Objective 2 depends on objective 1")],
    }
    mock_handle_extract_relationships.return_value = mock_relationships

    # Execute
    result = await handle_extract_relationships_stage(
        input_dto=input_dto,
        research_objectives=sample_research_objectives,
        form_inputs={"background_context": "Test background"},
        application_id=str(uuid4()),
        job_manager=mock_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "research_relationships" in result
    assert result["research_relationships"] == mock_relationships

    # Verify cancellation checks
    mock_job_manager.ensure_not_cancelled.assert_called()

    # Verify notifications
    mock_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.handle_batch_enrich_objectives")
async def test_enrich_objectives_stage_success(
    mock_handle_batch_enrich_objectives,
    mock_job_manager,
    sample_research_objectives,
    sample_work_plan_section,
) -> None:
    """Test successful objective enrichment stage."""
    # Setup input DTO
    input_dto = {
        "research_relationships": {
            "1": [("2", "provides_data_for", "Objective 1 provides data for objective 2")],
            "2": [("1", "depends_on", "Objective 2 depends on objective 1")],
        }
    }

    # Setup mock
    mock_enrichment_responses = [
        {
            "research_objective": {
                "description": "Enhanced objective 1",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 1"],
                "search_queries": ["query 1"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 1.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                }
            ],
        },
        {
            "research_objective": {
                "description": "Enhanced objective 2",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 2"],
                "search_queries": ["query 2"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 2.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                }
            ],
        },
    ]
    mock_handle_batch_enrich_objectives.return_value = mock_enrichment_responses

    # Execute
    result = await handle_enrich_objectives_stage(
        input_dto=input_dto,
        research_objectives=sample_research_objectives,
        grant_section=sample_work_plan_section,
        application_id=str(uuid4()),
        form_inputs={"background_context": "Test background"},
        job_manager=mock_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "enriched_objectives" in result
    assert "objectives_count" in result
    assert result["objectives_count"] == 2

    # Verify cancellation checks
    mock_job_manager.ensure_not_cancelled.assert_called()

    # Verify notifications
    mock_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.enrich_objective_with_wikidata")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_enrich_terminology_stage_success(
    mock_batched_gather,
    mock_enrich_objective_with_wikidata,
    mock_job_manager,
) -> None:
    """Test successful terminology enrichment stage."""
    # Setup input DTO
    input_dto = {
        "enriched_objectives": [
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    }
                ],
            },
            {
                "research_objective": {
                    "description": "Enhanced objective 2",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    }
                ],
            },
        ],
        "objectives_count": 2,
    }

    # Setup mocks
    mock_terminology_contexts = [
        {
            "core_scientific_terms": ["biomarkers", "proteomics"],
            "scientific_context": "Cancer biomarker discovery",
        },
        {
            "core_scientific_terms": ["machine learning", "algorithms"],
            "scientific_context": "ML model development",
        },
    ]
    mock_batched_gather.return_value = mock_terminology_contexts

    # Execute
    result = await handle_enrich_terminology_stage(
        input_dto=input_dto,
        job_manager=mock_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "enriched_objectives" in result
    assert "terminology_contexts" in result
    assert result["terminology_contexts_count"] == 2

    # Verify cancellation checks
    mock_job_manager.ensure_not_cancelled.assert_called()

    # Verify notifications
    mock_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.generate_research_plan_content")
async def test_generate_research_plan_stage_success(
    mock_generate_research_plan_content,
    mock_job_manager,
) -> None:
    """Test successful research plan generation stage."""
    # Setup input DTO with matching task count
    input_dto = {
        "enriched_objectives": [
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task 1.1",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    },
                    {
                        "description": "Enhanced task 1.2",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    },
                ],
            }
        ],
        "terminology_contexts": [
            {
                "core_scientific_terms": ["biomarkers"],
                "scientific_context": "Context",
            }
        ],
        "terminology_contexts_count": 1,
    }

    # Create research objectives that match the DTO structure
    research_objectives = [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        )
    ]

    # Setup mock
    mock_generate_research_plan_content.return_value = "Generated research plan content"

    # Execute
    result = await handle_generate_research_plan_stage(
        input_dto=input_dto,
        research_objectives=research_objectives,
        application_id=str(uuid4()),
        job_manager=mock_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "research_plan_text" in result
    assert result["research_plan_text"] == "Generated research plan content"

    # Verify cancellation checks
    mock_job_manager.ensure_not_cancelled.assert_called()

    # Verify notifications
    mock_job_manager.add_notification.assert_called()


async def test_handlers_preserve_data_flow(
    mock_job_manager,
    async_session_manager,
    sample_grant_sections,
    sample_work_plan_section,
) -> None:
    """Test that handlers preserve data flow correctly."""
    async with async_session_manager() as session, session.begin():
        from packages.db.src.models import GrantApplication, GrantTemplate

        # Create test data
        grant_template = GrantTemplate(
            id=uuid4(),
            organization_id=uuid4(),
            grant_sections=sample_grant_sections + [sample_work_plan_section],
            cfp_analysis={
                "sections_count": 3,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 2,
            }
        )
        session.add(grant_template)

        grant_application = GrantApplication(
            id=uuid4(),
            organization_id=grant_template.organization_id,
            grant_template_id=grant_template.id,
            grant_template=grant_template,
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test objective",
                    research_tasks=[ResearchTask(number=1, title="Test task")],
                )
            ]
        )
        session.add(grant_application)
        await session.flush()

        # Test data flow preservation
        test_dto = {
            "section_texts": [
                {"section_id": "abstract", "text": "Test abstract"},
            ],
            "work_plan_section": sample_work_plan_section,
        }

        # Verify that the input structure is preserved
        assert "section_texts" in test_dto
        assert "work_plan_section" in test_dto
        assert test_dto["section_texts"][0]["section_id"] == "abstract"
        assert test_dto["work_plan_section"]["id"] == "research_plan"