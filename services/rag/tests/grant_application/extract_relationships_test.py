from unittest.mock import patch

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.grant_application.extract_relationships import handle_extract_relationships


@pytest.fixture
def sample_research_objectives():
    """Sample research objectives for testing."""
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
        ResearchObjective(
            number=3,
            title="Clinical validation",
            research_tasks=[
                ResearchTask(number=1, title="Recruit patients"),
                ResearchTask(number=2, title="Collect samples"),
            ],
        ),
    ]


@pytest.fixture
def sample_grant_section():
    """Sample grant section for testing."""
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
def sample_form_inputs():
    """Sample form inputs for testing."""
    return {
        "background_context": "This is a cancer research project focusing on biomarker discovery",
        "institution": "University of Research",
        "duration": "3 years",
    }


class TestHandleExtractRelationships:
    """Test handle_extract_relationships function."""

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_success(
        self,
        mock_extract_relationships,
        sample_research_objectives,
        sample_grant_section,
        sample_form_inputs,
    ) -> None:
        """Test successful relationship extraction."""
        # Setup mock response
        mock_relationships_response = {
            "1": [
                ("2", "provides_data_for", "The biomarkers identified in objective 1 will be used as features in the ML model"),
                ("3", "enables", "Validated biomarkers are needed for clinical validation"),
            ],
            "2": [
                ("3", "supports", "ML model predictions will guide clinical validation strategy"),
            ],
            "1.1": [
                ("1.2", "precedes", "Biomarker identification must occur before validation"),
            ],
            "1.2": [
                ("2.1", "informs", "Validation results inform algorithm design"),
            ],
            "2.1": [
                ("2.2", "precedes", "Algorithm design precedes model training"),
            ],
            "2.2": [
                ("3.1", "guides", "Trained model guides patient recruitment strategy"),
            ],
        }
        mock_extract_relationships.return_value = mock_relationships_response

        # Execute
        result = await handle_extract_relationships(
            application_id="test-app-id",
            research_objectives=sample_research_objectives,
            grant_section=sample_grant_section,
            form_inputs=sample_form_inputs,
            trace_id="test-trace",
        )

        # Verify result structure
        assert isinstance(result, dict)
        assert "1" in result
        assert "2" in result
        assert "1.1" in result
        assert "1.2" in result
        assert "2.1" in result
        assert "2.2" in result

        # Verify relationship data
        assert len(result["1"]) == 2
        assert result["1"][0] == ("2", "provides_data_for", "The biomarkers identified in objective 1 will be used as features in the ML model")
        assert result["1"][1] == ("3", "enables", "Validated biomarkers are needed for clinical validation")

        # Verify service call
        mock_extract_relationships.assert_called_once()
        call_args = mock_extract_relationships.call_args
        assert call_args.kwargs["application_id"] == "test-app-id"
        assert len(call_args.kwargs["research_objectives"]) == 3
        assert call_args.kwargs["grant_section"] == sample_grant_section
        assert call_args.kwargs["form_inputs"] == sample_form_inputs
        assert call_args.kwargs["trace_id"] == "test-trace"

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_empty_objectives(
        self,
        mock_extract_relationships,
        sample_grant_section,
        sample_form_inputs,
    ) -> None:
        """Test relationship extraction with empty objectives list."""
        # Setup mock response for empty objectives
        mock_extract_relationships.return_value = {}

        # Execute with empty objectives
        result = await handle_extract_relationships(
            application_id="test-app-id",
            research_objectives=[],
            grant_section=sample_grant_section,
            form_inputs=sample_form_inputs,
            trace_id="test-trace",
        )

        # Verify result
        assert isinstance(result, dict)
        assert len(result) == 0

        # Verify service call
        mock_extract_relationships.assert_called_once()
        call_args = mock_extract_relationships.call_args
        assert len(call_args.kwargs["research_objectives"]) == 0

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_single_objective(
        self,
        mock_extract_relationships,
        sample_grant_section,
        sample_form_inputs,
    ) -> None:
        """Test relationship extraction with single objective."""
        # Single objective with single task
        single_objective = [
            ResearchObjective(
                number=1,
                title="Single objective",
                research_tasks=[
                    ResearchTask(number=1, title="Single task"),
                ],
            )
        ]

        # Setup mock response
        mock_relationships_response = {
            "1": [],  # No relationships with other objectives
            "1.1": [],  # No relationships with other tasks
        }
        mock_extract_relationships.return_value = mock_relationships_response

        # Execute
        result = await handle_extract_relationships(
            application_id="test-app-id",
            research_objectives=single_objective,
            grant_section=sample_grant_section,
            form_inputs=sample_form_inputs,
            trace_id="test-trace",
        )

        # Verify result
        assert isinstance(result, dict)
        assert "1" in result
        assert "1.1" in result
        assert len(result["1"]) == 0
        assert len(result["1.1"]) == 0

        # Verify service call
        mock_extract_relationships.assert_called_once()
        call_args = mock_extract_relationships.call_args
        assert len(call_args.kwargs["research_objectives"]) == 1

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_complex_dependencies(
        self,
        mock_extract_relationships,
        sample_research_objectives,
        sample_grant_section,
        sample_form_inputs,
    ) -> None:
        """Test relationship extraction with complex interdependencies."""
        # Setup mock response with complex relationships
        mock_relationships_response = {
            "1": [
                ("2", "provides_input_to", "Biomarker data feeds ML model"),
                ("3", "validates_in", "Biomarkers tested in clinical validation"),
            ],
            "2": [
                ("1", "depends_on", "ML model requires biomarker features"),
                ("3", "predicts_for", "Model predictions guide clinical decisions"),
            ],
            "3": [
                ("1", "validates", "Clinical study validates biomarker utility"),
                ("2", "tests", "Clinical study tests model performance"),
            ],
            "1.1": [
                ("1.2", "feeds_into", "Identified biomarkers need validation"),
                ("2.1", "informs", "Biomarker discovery informs algorithm design"),
            ],
            "1.2": [
                ("2.2", "provides_data_for", "Validation data used for model training"),
                ("3.1", "guides", "Validation results guide patient selection"),
            ],
            "2.1": [
                ("1.1", "uses_data_from", "Algorithm design uses biomarker data"),
                ("2.2", "precedes", "Algorithm design before training"),
            ],
            "2.2": [
                ("3.1", "helps_select", "Model helps select appropriate patients"),
                ("3.2", "processes", "Model processes collected samples"),
            ],
            "3.1": [
                ("3.2", "enables", "Patient recruitment enables sample collection"),
            ],
            "3.2": [
                ("1.2", "validates", "Sample analysis validates biomarkers"),
                ("2.2", "trains", "Sample data trains model"),
            ],
        }
        mock_extract_relationships.return_value = mock_relationships_response

        # Execute
        result = await handle_extract_relationships(
            application_id="test-app-id",
            research_objectives=sample_research_objectives,
            grant_section=sample_grant_section,
            form_inputs=sample_form_inputs,
            trace_id="test-trace",
        )

        # Verify result structure with all relationships
        assert isinstance(result, dict)

        # Verify objective-level relationships
        assert len(result["1"]) == 2
        assert len(result["2"]) == 2
        assert len(result["3"]) == 2

        # Verify task-level relationships
        assert len(result["1.1"]) == 2
        assert len(result["1.2"]) == 2
        assert len(result["2.1"]) == 2
        assert len(result["2.2"]) == 2
        assert len(result["3.1"]) == 1
        assert len(result["3.2"]) == 2

        # Verify specific relationship content
        assert ("2", "provides_input_to", "Biomarker data feeds ML model") in result["1"]
        assert ("1", "depends_on", "ML model requires biomarker features") in result["2"]
        assert ("1.2", "feeds_into", "Identified biomarkers need validation") in result["1.1"]

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_no_form_inputs(
        self,
        mock_extract_relationships,
        sample_research_objectives,
        sample_grant_section,
    ) -> None:
        """Test relationship extraction with empty form inputs."""
        # Setup mock response
        mock_relationships_response = {
            "1": [("2", "relates_to", "Basic relationship without context")],
            "2": [("1", "connects_to", "Connection without detailed context")],
        }
        mock_extract_relationships.return_value = mock_relationships_response

        # Execute with empty form inputs
        result = await handle_extract_relationships(
            application_id="test-app-id",
            research_objectives=sample_research_objectives,
            grant_section=sample_grant_section,
            form_inputs={},
            trace_id="test-trace",
        )

        # Verify result
        assert isinstance(result, dict)
        assert len(result["1"]) == 1
        assert len(result["2"]) == 1

        # Verify service call with empty form inputs
        mock_extract_relationships.assert_called_once()
        call_args = mock_extract_relationships.call_args
        assert call_args.kwargs["form_inputs"] == {}

    @patch("services.rag.src.grant_application.extract_relationships.extract_research_relationships")
    async def test_handle_extract_relationships_error_handling(
        self,
        mock_extract_relationships,
        sample_research_objectives,
        sample_grant_section,
        sample_form_inputs,
    ) -> None:
        """Test error handling when relationship extraction fails."""
        # Setup mock to raise exception
        mock_extract_relationships.side_effect = Exception("Relationship extraction service error")

        # Execute and verify exception is propagated
        with pytest.raises(Exception, match="Relationship extraction service error"):
            await handle_extract_relationships(
                application_id="test-app-id",
                research_objectives=sample_research_objectives,
                grant_section=sample_grant_section,
                form_inputs=sample_form_inputs,
                trace_id="test-trace",
            )

        # Verify service was called
        mock_extract_relationships.assert_called_once()