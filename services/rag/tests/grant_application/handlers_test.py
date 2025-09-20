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
from services.rag.src.grant_application.dto import (
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
    SectionText,
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


class TestGenerateSectionsStage:
    """Test handle_generate_sections_stage function."""

    @patch("services.rag.src.grant_application.handlers.retrieve_documents")
    @patch("services.rag.src.grant_application.handlers.handle_generate_section_text")
    @patch("services.rag.src.grant_application.handlers.batched_gather")
    async def test_generate_sections_stage_success(
        self,
        mock_batched_gather,
        mock_handle_generate_section_text,
        mock_retrieve_documents,
        mock_job_manager,
        grant_application,
        sample_grant_sections,
        sample_work_plan_section,
    ) -> None:
        """Test successful section generation stage."""
        # Setup grant application with required data
        grant_application.research_objectives = [
            ResearchObjective(
                number=1,
                title="Test objective",
                research_tasks=[ResearchTask(number=1, title="Test task")],
            )
        ]

        # Setup grant template with sections
        grant_application.grant_template.grant_sections = sample_grant_sections + [sample_work_plan_section]
        grant_application.grant_template.cfp_analysis = {
            "sections_count": 3,
            "length_constraints_found": 2,
            "evaluation_criteria_count": 2,
        }

        # Setup mocks
        mock_retrieve_documents.return_value = ["Retrieved context document 1", "Retrieved context document 2"]
        mock_batched_gather.return_value = ["Generated abstract text", "Generated significance text"]

        # Execute
        result = await handle_generate_sections_stage(
            grant_application=grant_application,
            job_manager=mock_job_manager,
            trace_id="test-trace",
        )

        # Verify structure
        assert isinstance(result, GenerateSectionsStageDTO)
        assert len(result["section_texts"]) == 2
        assert result["section_texts"][0]["section_id"] == "abstract"
        assert result["section_texts"][1]["section_id"] == "significance"
        assert result["work_plan_section"]["id"] == "research_plan"

        # Verify cancellation checks
        assert mock_job_manager.ensure_not_cancelled.call_count >= 2

        # Verify notifications
        assert mock_job_manager.add_notification.call_count >= 2
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.GENERATING_SECTION_TEXTS,
            message="Generating application sections",
            notification_type="info",
        )
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.SECTION_TEXTS_GENERATED,
            message="Generated 2 sections",
            notification_type="success",
            data={"sections_generated": 2},
        )

        # Verify retrieval was called with correct parameters
        mock_retrieve_documents.assert_called_once()
        call_args = mock_retrieve_documents.call_args
        assert call_args.kwargs["application_id"] == str(grant_application.id)
        assert len(call_args.kwargs["search_queries"]) > 0
        assert call_args.kwargs["max_tokens"] == 12000

    async def test_generate_sections_stage_missing_grant_template(
        self, mock_job_manager, grant_application
    ) -> None:
        """Test error when grant template is missing."""
        # Remove grant template
        grant_application.grant_template = None

        # Execute and verify error
        with pytest.raises(Exception, match="Grant template is required"):
            await handle_generate_sections_stage(
                grant_application=grant_application,
                job_manager=mock_job_manager,
                trace_id="test-trace",
            )

    async def test_generate_sections_stage_missing_cfp_analysis(
        self, mock_job_manager, grant_application, sample_grant_sections, sample_work_plan_section
    ) -> None:
        """Test error when CFP analysis is missing."""
        # Setup grant template without CFP analysis
        grant_application.grant_template.grant_sections = sample_grant_sections + [sample_work_plan_section]
        grant_application.grant_template.cfp_analysis = None

        # Execute and verify error
        with pytest.raises(Exception, match="CFP analysis is required"):
            await handle_generate_sections_stage(
                grant_application=grant_application,
                job_manager=mock_job_manager,
                trace_id="test-trace",
            )


class TestExtractRelationshipsStage:
    """Test handle_extract_relationships_stage function."""

    @patch("services.rag.src.grant_application.handlers.handle_extract_relationships")
    async def test_extract_relationships_stage_success(
        self,
        mock_handle_extract_relationships,
        mock_job_manager,
        grant_application,
        sample_research_objectives,
        sample_work_plan_section,
    ) -> None:
        """Test successful relationship extraction stage."""
        # Setup input DTO
        input_dto = GenerateSectionsStageDTO(
            section_texts=[
                SectionText(section_id="abstract", text="Abstract text"),
                SectionText(section_id="significance", text="Significance text"),
            ],
            work_plan_section=sample_work_plan_section,
        )

        # Setup grant application
        grant_application.research_objectives = sample_research_objectives
        grant_application.form_inputs = {"background_context": "Test background"}

        # Setup mock
        mock_relationships = {
            "1": [("Objective 2", "depends_on", "Shared methodology")],
            "2": [("Objective 1", "builds_on", "Foundation research")],
        }
        mock_handle_extract_relationships.return_value = mock_relationships

        # Execute
        result = await handle_extract_relationships_stage(
            grant_application=grant_application,
            dto=input_dto,
            job_manager=mock_job_manager,
            trace_id="test-trace",
        )

        # Verify structure
        assert isinstance(result, ExtractRelationshipsStageDTO)
        assert result["section_texts"] == input_dto["section_texts"]
        assert result["work_plan_section"] == input_dto["work_plan_section"]
        assert result["relationships"] == mock_relationships

        # Verify cancellation check
        mock_job_manager.ensure_not_cancelled.assert_called_once()

        # Verify notification
        mock_job_manager.add_notification.assert_called_once_with(
            event=NotificationEvents.EXTRACTING_RELATIONSHIPS,
            message="Analyzing research dependencies",
            notification_type="info",
        )

        # Verify service call
        mock_handle_extract_relationships.assert_called_once()
        call_args = mock_handle_extract_relationships.call_args
        assert call_args.kwargs["application_id"] == str(grant_application.id)
        assert call_args.kwargs["research_objectives"] == sample_research_objectives
        assert call_args.kwargs["grant_section"] == sample_work_plan_section
        assert call_args.kwargs["form_inputs"] == {"background_context": "Test background"}
        assert call_args.kwargs["trace_id"] == "test-trace"


class TestEnrichObjectivesStage:
    """Test handle_enrich_objectives_stage function."""

    @patch("services.rag.src.grant_application.handlers.handle_batch_enrich_objectives")
    async def test_enrich_objectives_stage_success(
        self,
        mock_handle_batch_enrich,
        mock_job_manager,
        grant_application,
        sample_research_objectives,
        sample_work_plan_section,
    ) -> None:
        """Test successful objectives enrichment stage."""
        # Setup input DTO
        input_dto = ExtractRelationshipsStageDTO(
            section_texts=[SectionText(section_id="abstract", text="Abstract text")],
            work_plan_section=sample_work_plan_section,
            relationships={"1": [("Objective 2", "relates_to", "Shared goals")]},
        )

        # Setup grant application
        grant_application.research_objectives = sample_research_objectives
        grant_application.form_inputs = {"background_context": "Test background"}

        # Setup mock
        mock_enrichment_responses = [
            {
                "research_objective": {
                    "description": "Enhanced objective description",
                    "instructions": "Detailed instructions",
                    "guiding_questions": ["Question 1", "Question 2"],
                    "search_queries": ["query1", "query2"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task description",
                        "instructions": "Task instructions",
                        "guiding_questions": ["Task question"],
                        "search_queries": ["task query"],
                    }
                ],
            }
        ]
        mock_handle_batch_enrich.return_value = mock_enrichment_responses

        # Execute
        result = await handle_enrich_objectives_stage(
            grant_application=grant_application,
            dto=input_dto,
            job_manager=mock_job_manager,
            trace_id="test-trace",
        )

        # Verify structure
        assert isinstance(result, EnrichObjectivesStageDTO)
        assert result["section_texts"] == input_dto["section_texts"]
        assert result["work_plan_section"] == input_dto["work_plan_section"]
        assert result["relationships"] == input_dto["relationships"]
        assert result["enrichment_responses"] == mock_enrichment_responses

        # Verify cancellation check
        mock_job_manager.ensure_not_cancelled.assert_called_once()

        # Verify notifications
        assert mock_job_manager.add_notification.call_count == 2
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.ENRICHING_OBJECTIVES,
            message="Enhancing research objectives",
            notification_type="info",
        )
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.OBJECTIVES_ENRICHED,
            message="Research objectives enhanced",
            notification_type="success",
            data={
                "objectives": len(sample_research_objectives),
                "tasks": sum(len(obj["research_tasks"]) for obj in sample_research_objectives),
            },
        )


class TestEnrichTerminologyStage:
    """Test handle_enrich_terminology_stage function."""

    @patch("services.rag.src.grant_application.handlers.enrich_objective_with_wikidata")
    async def test_enrich_terminology_stage_success(
        self,
        mock_enrich_wikidata,
        mock_job_manager,
        grant_application,
        sample_work_plan_section,
    ) -> None:
        """Test successful terminology enrichment stage."""
        # Setup input DTO
        input_dto = EnrichObjectivesStageDTO(
            section_texts=[SectionText(section_id="abstract", text="Abstract text")],
            work_plan_section=sample_work_plan_section,
            relationships={"1": [("Objective 2", "relates_to", "Shared goals")]},
            enrichment_responses=[
                {
                    "research_objective": {"description": "Enhanced objective"},
                    "research_tasks": [{"description": "Enhanced task"}],
                }
            ],
        )

        # Setup mock
        mock_wikidata_enrichment = {
            "core_scientific_terms": ["biomarkers", "proteomics"],
            "scientific_context": "Biomarker discovery context",
        }
        mock_enrich_wikidata.return_value = mock_wikidata_enrichment

        # Execute
        result = await handle_enrich_terminology_stage(
            grant_application=grant_application,
            dto=input_dto,
            job_manager=mock_job_manager,
            trace_id="test-trace",
        )

        # Verify structure
        assert isinstance(result, EnrichTerminologyStageDTO)
        assert result["section_texts"] == input_dto["section_texts"]
        assert result["work_plan_section"] == input_dto["work_plan_section"]
        assert result["relationships"] == input_dto["relationships"]
        assert result["enrichment_responses"] == input_dto["enrichment_responses"]
        assert len(result["wikidata_enrichments"]) == 1
        assert result["wikidata_enrichments"][0] == mock_wikidata_enrichment

        # Verify cancellation checks (one per enrichment response)
        assert mock_job_manager.ensure_not_cancelled.call_count >= 1

        # Verify notifications
        assert mock_job_manager.add_notification.call_count == 2
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.ENHANCING_WITH_WIKIDATA,
            message="Adding scientific terminology",
            notification_type="info",
        )
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.WIKIDATA_ENHANCEMENT_COMPLETE,
            message="Scientific context added",
            notification_type="success",
            data={"terms_added": 1},
        )


class TestGenerateResearchPlanStage:
    """Test handle_generate_research_plan_stage function."""

    @patch("services.rag.src.grant_application.handlers.generate_objective_with_tasks")
    @patch("services.rag.src.grant_application.handlers.gather")
    @patch("services.rag.src.grant_application.handlers.normalize_markdown")
    async def test_generate_research_plan_stage_success(
        self,
        mock_normalize_markdown,
        mock_gather,
        mock_generate_objective,
        mock_job_manager,
        grant_application,
        sample_research_objectives,
        sample_work_plan_section,
    ) -> None:
        """Test successful research plan generation stage."""
        # Setup input DTO
        input_dto = EnrichTerminologyStageDTO(
            section_texts=[SectionText(section_id="abstract", text="Abstract text")],
            work_plan_section=sample_work_plan_section,
            relationships={"1": [("2", "depends_on", "Shared methodology")]},
            enrichment_responses=[
                {
                    "research_objective": {
                        "description": "Enhanced objective 1",
                        "instructions": "Instructions 1",
                        "guiding_questions": ["Question 1"],
                        "search_queries": ["query1"],
                    },
                    "research_tasks": [
                        {
                            "description": "Enhanced task 1.1",
                            "instructions": "Task instructions 1.1",
                            "guiding_questions": ["Task question 1.1"],
                            "search_queries": ["task query 1.1"],
                        }
                    ],
                },
                {
                    "research_objective": {
                        "description": "Enhanced objective 2",
                        "instructions": "Instructions 2",
                        "guiding_questions": ["Question 2"],
                        "search_queries": ["query2"],
                    },
                    "research_tasks": [
                        {
                            "description": "Enhanced task 2.1",
                            "instructions": "Task instructions 2.1",
                            "guiding_questions": ["Task question 2.1"],
                            "search_queries": ["task query 2.1"],
                        }
                    ],
                },
            ],
            wikidata_enrichments=[
                {"core_scientific_terms": ["biomarkers"], "scientific_context": "Context 1"},
                {"core_scientific_terms": ["proteomics"], "scientific_context": "Context 2"},
            ],
        )

        # Setup grant application
        grant_application.research_objectives = sample_research_objectives
        grant_application.form_inputs = {"background_context": "Test background"}

        # Setup mocks
        mock_objective_results = [
            ({"number": "1", "title": "Objective 1"}, "Objective 1 text", [("Task 1.1", "Task 1.1 text")]),
            ({"number": "2", "title": "Objective 2"}, "Objective 2 text", [("Task 2.1", "Task 2.1 text")]),
        ]
        mock_gather.return_value = mock_objective_results
        mock_normalize_markdown.return_value = "Normalized research plan text"

        # Execute
        result = await handle_generate_research_plan_stage(
            grant_application=grant_application,
            dto=input_dto,
            job_manager=mock_job_manager,
            trace_id="test-trace",
        )

        # Verify structure
        assert isinstance(result, GenerateResearchPlanStageDTO)
        assert result["section_texts"] == input_dto["section_texts"]
        assert result["work_plan_section"] == input_dto["work_plan_section"]
        assert result["relationships"] == input_dto["relationships"]
        assert result["enrichment_responses"] == input_dto["enrichment_responses"]
        assert result["wikidata_enrichments"] == input_dto["wikidata_enrichments"]
        assert result["research_plan_text"] == "Normalized research plan text"

        # Verify cancellation checks
        assert mock_job_manager.ensure_not_cancelled.call_count >= 1

        # Verify notifications
        assert mock_job_manager.add_notification.call_count >= 3
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.GENERATING_RESEARCH_PLAN,
            message="Writing research plan",
            notification_type="info",
        )
        mock_job_manager.add_notification.assert_any_call(
            event=NotificationEvents.RESEARCH_PLAN_COMPLETED,
            message="Research plan complete",
            notification_type="success",
            data={
                "objectives": 2,
                "tasks": 2,
                "words": 4,  # Based on mock text split by spaces
            },
        )

        # Verify gather was called to generate objectives in parallel
        mock_gather.assert_called_once()
        gather_args = mock_gather.call_args[0]
        assert len(gather_args) == 2  # Two objective groups


class TestHandlersIntegration:
    """Test integration between handlers and data flow."""

    async def test_handlers_preserve_data_flow(
        self,
        mock_job_manager,
        grant_application,
        sample_research_objectives,
        sample_grant_sections,
        sample_work_plan_section,
    ) -> None:
        """Test that data flows correctly through multiple handler stages."""
        # Setup grant application
        grant_application.research_objectives = sample_research_objectives
        grant_application.form_inputs = {"background_context": "Test background"}
        grant_application.grant_template.grant_sections = sample_grant_sections + [sample_work_plan_section]
        grant_application.grant_template.cfp_analysis = {"sections_count": 3}

        # Mock external services
        with patch("services.rag.src.grant_application.handlers.retrieve_documents") as mock_retrieve, \
             patch("services.rag.src.grant_application.handlers.handle_generate_section_text") as mock_section, \
             patch("services.rag.src.grant_application.handlers.batched_gather") as mock_batch, \
             patch("services.rag.src.grant_application.handlers.handle_extract_relationships") as mock_relations, \
             patch("services.rag.src.grant_application.handlers.handle_batch_enrich_objectives") as mock_enrich:

            # Setup mock returns
            mock_retrieve.return_value = ["Context doc 1", "Context doc 2"]
            mock_batch.return_value = ["Abstract text", "Significance text"]
            mock_relations.return_value = {"1": [("2", "relates_to", "Shared goals")]}
            mock_enrich.return_value = [
                {
                    "research_objective": {"description": "Enhanced objective"},
                    "research_tasks": [{"description": "Enhanced task"}],
                }
            ]

            # Execute first stage - section generation
            sections_result = await handle_generate_sections_stage(
                grant_application=grant_application,
                job_manager=mock_job_manager,
                trace_id="test-trace",
            )

            # Execute second stage - relationship extraction using sections result
            relationships_result = await handle_extract_relationships_stage(
                grant_application=grant_application,
                dto=sections_result,
                job_manager=mock_job_manager,
                trace_id="test-trace",
            )

            # Execute third stage - objectives enrichment using relationships result
            objectives_result = await handle_enrich_objectives_stage(
                grant_application=grant_application,
                dto=relationships_result,
                job_manager=mock_job_manager,
                trace_id="test-trace",
            )

            # Verify data flow integrity
            assert relationships_result["section_texts"] == sections_result["section_texts"]
            assert relationships_result["work_plan_section"] == sections_result["work_plan_section"]
            assert objectives_result["section_texts"] == sections_result["section_texts"]
            assert objectives_result["work_plan_section"] == sections_result["work_plan_section"]
            assert objectives_result["relationships"] == relationships_result["relationships"]

            # Verify section data preserved
            assert len(objectives_result["section_texts"]) == 2
            assert objectives_result["section_texts"][0]["section_id"] == "abstract"
            assert objectives_result["section_texts"][1]["section_id"] == "significance"
            assert objectives_result["work_plan_section"]["id"] == "research_plan"