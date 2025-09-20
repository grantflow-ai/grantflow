import unittest.mock
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from services.rag.src.grant_application.enrich_terminology_stage import enrich_objective_with_wikidata


@pytest.fixture
def sample_enrichment_response() -> dict[str, Any]:
    """Sample enrichment response for testing."""
    return {
        "research_objective": {
            "description": "Develop novel biomarkers for early cancer detection",
            "instructions": "Focus on identifying protein-based biomarkers",
            "guiding_questions": ["What biomarkers are most promising?"],
            "search_queries": ["cancer biomarkers proteomics"],
            "core_scientific_terms": ["biomarkers", "proteomics"]
        },
        "research_tasks": [
            {
                "description": "Identify candidate biomarkers through proteomics",
                "instructions": "Use mass spectrometry techniques",
                "guiding_questions": ["Which proteins show differential expression?"],
                "search_queries": ["proteomics mass spectrometry"],
                "core_scientific_terms": ["mass spectrometry"]
            }
        ],
    }


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_success(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: dict[str, Any]
) -> None:
    """Test successful Wikidata enrichment."""
    # Setup mock
    mock_get_scientific_context.return_value = "**Biochemistry:** biomarkers, proteomics\n**Analytical Chemistry:** mass spectrometry"

    test_trace_id = str(uuid4())

    # Execute
    result = await enrich_objective_with_wikidata(
        enrichment_response=sample_enrichment_response,
        trace_id=test_trace_id,
    )

    # Verify result structure
    assert "core_scientific_terms" in result
    assert "scientific_context" in result
    assert "enriched_objective" in result
    assert "search_queries" in result

    # Verify core scientific terms extracted from enrichment response
    expected_terms = ["biomarkers", "proteomics", "mass spectrometry"]
    assert result["core_scientific_terms"] == expected_terms

    # Verify scientific context was formatted
    assert "Biochemistry" in result["scientific_context"]

    # Verify service call
    mock_get_scientific_context.assert_called_once_with(expected_terms, test_trace_id)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_empty_tasks(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: dict[str, Any]
) -> None:
    """Test Wikidata enrichment with empty research tasks."""
    # Modify enrichment response to have no tasks
    enrichment_response_no_tasks = {
        **sample_enrichment_response,
        "research_tasks": [],
    }

    # Add core_scientific_terms to research_objective for this test
    enrichment_response_no_tasks["research_objective"]["core_scientific_terms"] = ["biomarkers"]

    mock_get_scientific_context.return_value = "**Biochemistry:** biomarkers"

    # Execute
    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_no_tasks,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert "core_scientific_terms" in result
    assert "scientific_context" in result
    assert result["core_scientific_terms"] == ["biomarkers"]

    # Verify service call with only objective terms
    mock_get_scientific_context.assert_called_once_with(["biomarkers"], unittest.mock.ANY)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_multiple_tasks(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: dict[str, Any]
) -> None:
    """Test Wikidata enrichment with multiple research tasks."""
    # Add more tasks to enrichment response with core_scientific_terms
    enrichment_response_multi_tasks = {
        **sample_enrichment_response,
        "research_objective": {
            **sample_enrichment_response["research_objective"],
            "core_scientific_terms": ["biomarkers", "proteomics"]
        },
        "research_tasks": [
            {
                "description": "Identify candidate biomarkers through proteomics",
                "instructions": "Use mass spectrometry techniques",
                "guiding_questions": ["Which proteins show differential expression?"],
                "search_queries": ["proteomics mass spectrometry"],
                "core_scientific_terms": ["mass spectrometry", "protein analysis"]
            },
            {
                "description": "Validate biomarkers in clinical samples",
                "instructions": "Test in patient cohorts",
                "guiding_questions": ["What is the sensitivity and specificity?"],
                "search_queries": ["biomarker validation clinical"],
                "core_scientific_terms": ["clinical validation", "sensitivity"]
            },
            {
                "description": "Develop diagnostic assay",
                "instructions": "Create standardized testing protocol",
                "guiding_questions": ["How can we standardize the assay?"],
                "search_queries": ["diagnostic assay development"],
                "core_scientific_terms": ["diagnostic assay", "standardization"]
            },
        ],
    }

    mock_get_scientific_context.return_value = "**Biochemistry:** biomarkers, proteomics\n**Analytics:** mass spectrometry\n**Clinical:** validation, assay"

    # Execute
    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_multi_tasks,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert "core_scientific_terms" in result
    assert "scientific_context" in result

    # Verify all unique terms are collected (objective + all tasks)
    expected_terms = ["biomarkers", "proteomics", "mass spectrometry", "protein analysis", "clinical validation", "sensitivity", "diagnostic assay", "standardization"]
    assert result["core_scientific_terms"] == expected_terms

    # Verify scientific context contains multiple fields
    assert "Biochemistry" in result["scientific_context"]
    assert "Analytics" in result["scientific_context"]

    # Verify service call with all unique terms
    mock_get_scientific_context.assert_called_once_with(expected_terms, unittest.mock.ANY)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_error_handling(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: dict[str, Any]
) -> None:
    """Test error handling when Wikidata service fails."""
    # Add core_scientific_terms to make the test valid
    enrichment_response_with_terms = {
        **sample_enrichment_response,
        "research_objective": {
            **sample_enrichment_response["research_objective"],
            "core_scientific_terms": ["biomarkers"]
        },
        "research_tasks": [
            {
                **sample_enrichment_response["research_tasks"][0],
                "core_scientific_terms": ["proteomics"]
            }
        ]
    }

    # Setup mock to raise exception
    mock_get_scientific_context.side_effect = Exception("Wikidata service unavailable")

    # Execute - should not raise exception but return empty result
    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_with_terms,
        trace_id=str(uuid4()),
    )

    # Verify empty result is returned on error
    assert result == {
        "enriched_objective": "",
        "search_queries": [],
        "core_scientific_terms": [],
        "scientific_context": "",
    }

    # Verify service was called
    mock_get_scientific_context.assert_called_once()
