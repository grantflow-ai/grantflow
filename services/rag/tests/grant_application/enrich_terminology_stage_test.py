from unittest.mock import patch

import pytest
from services.rag.src.grant_application.enrich_terminology_stage import enrich_objective_with_wikidata


@pytest.fixture
def sample_enrichment_response():
    """Sample enrichment response for testing."""
    return {
        "research_objective": {
            "description": "Develop novel biomarkers for early cancer detection",
            "instructions": "Focus on identifying protein-based biomarkers",
            "guiding_questions": ["What biomarkers are most promising?"],
            "search_queries": ["cancer biomarkers proteomics"],
        },
        "research_tasks": [
            {
                "description": "Identify candidate biomarkers through proteomics",
                "instructions": "Use mass spectrometry techniques",
                "guiding_questions": ["Which proteins show differential expression?"],
                "search_queries": ["proteomics mass spectrometry"],
            }
        ],
    }


class TestEnrichObjectiveWithWikidata:
    """Test enrich_objective_with_wikidata function."""

    @patch("services.rag.src.grant_application.enrich_terminology_stage.get_wikidata_context")
    async def test_enrich_objective_with_wikidata_success(
        self, mock_get_wikidata_context, sample_enrichment_response
    ) -> None:
        """Test successful Wikidata enrichment."""
        # Setup mock
        mock_wikidata_response = {
            "core_scientific_terms": ["biomarkers", "proteomics", "mass spectrometry"],
            "scientific_context": "Cancer biomarker discovery using proteomics approaches",
        }
        mock_get_wikidata_context.return_value = mock_wikidata_response

        # Execute
        result = await enrich_objective_with_wikidata(
            enrichment_response=sample_enrichment_response,
            trace_id="test-trace",
        )

        # Verify result
        assert result == mock_wikidata_response
        assert "core_scientific_terms" in result
        assert "scientific_context" in result
        assert len(result["core_scientific_terms"]) == 3

        # Verify service call
        mock_get_wikidata_context.assert_called_once()
        call_args = mock_get_wikidata_context.call_args
        assert "research_objective_description" in call_args.kwargs
        assert "research_tasks_descriptions" in call_args.kwargs
        assert call_args.kwargs["trace_id"] == "test-trace"

        # Verify correct data extraction
        assert call_args.kwargs["research_objective_description"] == sample_enrichment_response["research_objective"]["description"]
        assert len(call_args.kwargs["research_tasks_descriptions"]) == 1
        assert call_args.kwargs["research_tasks_descriptions"][0] == sample_enrichment_response["research_tasks"][0]["description"]

    @patch("services.rag.src.grant_application.enrich_terminology_stage.get_wikidata_context")
    async def test_enrich_objective_with_wikidata_empty_tasks(
        self, mock_get_wikidata_context, sample_enrichment_response
    ) -> None:
        """Test Wikidata enrichment with empty research tasks."""
        # Modify enrichment response to have no tasks
        enrichment_response_no_tasks = {
            **sample_enrichment_response,
            "research_tasks": [],
        }

        mock_wikidata_response = {
            "core_scientific_terms": ["biomarkers"],
            "scientific_context": "Cancer biomarker discovery",
        }
        mock_get_wikidata_context.return_value = mock_wikidata_response

        # Execute
        result = await enrich_objective_with_wikidata(
            enrichment_response=enrichment_response_no_tasks,
            trace_id="test-trace",
        )

        # Verify result
        assert result == mock_wikidata_response

        # Verify service call with empty tasks list
        call_args = mock_get_wikidata_context.call_args
        assert call_args.kwargs["research_tasks_descriptions"] == []

    @patch("services.rag.src.grant_application.enrich_terminology_stage.get_wikidata_context")
    async def test_enrich_objective_with_wikidata_multiple_tasks(
        self, mock_get_wikidata_context, sample_enrichment_response
    ) -> None:
        """Test Wikidata enrichment with multiple research tasks."""
        # Add more tasks to enrichment response
        enrichment_response_multi_tasks = {
            **sample_enrichment_response,
            "research_tasks": [
                {
                    "description": "Identify candidate biomarkers through proteomics",
                    "instructions": "Use mass spectrometry techniques",
                    "guiding_questions": ["Which proteins show differential expression?"],
                    "search_queries": ["proteomics mass spectrometry"],
                },
                {
                    "description": "Validate biomarkers in clinical samples",
                    "instructions": "Test in patient cohorts",
                    "guiding_questions": ["What is the sensitivity and specificity?"],
                    "search_queries": ["biomarker validation clinical"],
                },
                {
                    "description": "Develop diagnostic assay",
                    "instructions": "Create standardized testing protocol",
                    "guiding_questions": ["How can we standardize the assay?"],
                    "search_queries": ["diagnostic assay development"],
                },
            ],
        }

        mock_wikidata_response = {
            "core_scientific_terms": ["biomarkers", "proteomics", "clinical validation", "diagnostic assay"],
            "scientific_context": "Comprehensive biomarker discovery and validation pipeline",
        }
        mock_get_wikidata_context.return_value = mock_wikidata_response

        # Execute
        result = await enrich_objective_with_wikidata(
            enrichment_response=enrichment_response_multi_tasks,
            trace_id="test-trace",
        )

        # Verify result
        assert result == mock_wikidata_response
        assert len(result["core_scientific_terms"]) == 4

        # Verify service call with all task descriptions
        call_args = mock_get_wikidata_context.call_args
        assert len(call_args.kwargs["research_tasks_descriptions"]) == 3
        expected_descriptions = [
            "Identify candidate biomarkers through proteomics",
            "Validate biomarkers in clinical samples",
            "Develop diagnostic assay",
        ]
        assert call_args.kwargs["research_tasks_descriptions"] == expected_descriptions

    @patch("services.rag.src.grant_application.enrich_terminology_stage.get_wikidata_context")
    async def test_enrich_objective_with_wikidata_error_handling(
        self, mock_get_wikidata_context, sample_enrichment_response
    ) -> None:
        """Test error handling when Wikidata service fails."""
        # Setup mock to raise exception
        mock_get_wikidata_context.side_effect = Exception("Wikidata service unavailable")

        # Execute and verify exception is propagated
        with pytest.raises(Exception, match="Wikidata service unavailable"):
            await enrich_objective_with_wikidata(
                enrichment_response=sample_enrichment_response,
                trace_id="test-trace",
            )

        # Verify service was called
        mock_get_wikidata_context.assert_called_once()