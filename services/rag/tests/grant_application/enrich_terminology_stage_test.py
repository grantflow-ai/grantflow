import unittest.mock
from copy import deepcopy
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from services.rag.src.grant_application.dto import EnrichmentDataDTO, ObjectiveEnrichmentResponse
from services.rag.src.grant_application.enrich_terminology_stage import enrich_objective_with_wikidata


def _make_enrichment_data(
    *,
    description: str,
    instructions: str,
    guiding_questions: list[str],
    search_queries: list[str],
    core_terms: list[str],
) -> EnrichmentDataDTO:
    return EnrichmentDataDTO(
        enriched_objective="",
        description=description,
        instructions=instructions,
        guiding_questions=guiding_questions,
        search_queries=search_queries,
        core_scientific_terms=core_terms,
        scientific_context="",
    )


@pytest.fixture
def sample_enrichment_response() -> ObjectiveEnrichmentResponse:
    research_objective = _make_enrichment_data(
        description="Develop novel biomarkers for early cancer detection",
        instructions="Focus on identifying protein-based biomarkers",
        guiding_questions=["What biomarkers are most promising?"],
        search_queries=["cancer biomarkers proteomics"],
        core_terms=["biomarkers", "proteomics"],
    )

    research_tasks = [
        _make_enrichment_data(
            description="Identify candidate biomarkers through proteomics",
            instructions="Use mass spectrometry techniques",
            guiding_questions=["Which proteins show differential expression?"],
            search_queries=["proteomics mass spectrometry"],
            core_terms=["mass spectrometry"],
        )
    ]

    return ObjectiveEnrichmentResponse(
        research_objective=research_objective,
        research_tasks=research_tasks,
    )


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_success(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: ObjectiveEnrichmentResponse
) -> None:
    mock_get_scientific_context.return_value = (
        "**Biochemistry:** biomarkers, proteomics\n**Analytical Chemistry:** mass spectrometry"
    )

    test_trace_id = str(uuid4())

    result = await enrich_objective_with_wikidata(
        enrichment_response=sample_enrichment_response,
        trace_id=test_trace_id,
    )

    expected_terms = ["biomarkers", "proteomics", "mass spectrometry"]
    assert result["core_scientific_terms"] == expected_terms
    assert "scientific_context" in result
    assert "Biochemistry" in result["scientific_context"]
    mock_get_scientific_context.assert_called_once_with(expected_terms, test_trace_id)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_empty_tasks(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: ObjectiveEnrichmentResponse
) -> None:
    enrichment_response_no_tasks = deepcopy(sample_enrichment_response)
    enrichment_response_no_tasks["research_tasks"] = []
    enrichment_response_no_tasks["research_objective"]["core_scientific_terms"] = ["biomarkers"]

    mock_get_scientific_context.return_value = "**Biochemistry:** biomarkers"

    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_no_tasks,
        trace_id=str(uuid4()),
    )

    assert result["core_scientific_terms"] == ["biomarkers"]
    mock_get_scientific_context.assert_called_once_with(["biomarkers"], unittest.mock.ANY)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_multiple_tasks(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: ObjectiveEnrichmentResponse
) -> None:
    enrichment_response_multi_tasks = deepcopy(sample_enrichment_response)
    enrichment_response_multi_tasks["research_objective"]["core_scientific_terms"] = [
        "biomarkers",
        "proteomics",
    ]
    enrichment_response_multi_tasks["research_tasks"] = [
        _make_enrichment_data(
            description="Identify candidate biomarkers through proteomics",
            instructions="Use mass spectrometry techniques",
            guiding_questions=["Which proteins show differential expression?"],
            search_queries=["proteomics mass spectrometry"],
            core_terms=["mass spectrometry", "protein analysis"],
        ),
        _make_enrichment_data(
            description="Validate biomarkers in clinical samples",
            instructions="Test in patient cohorts",
            guiding_questions=["What is the sensitivity and specificity?"],
            search_queries=["biomarker validation clinical"],
            core_terms=["clinical validation", "sensitivity"],
        ),
        _make_enrichment_data(
            description="Develop diagnostic assay",
            instructions="Create standardized testing protocol",
            guiding_questions=["How can we standardize the assay?"],
            search_queries=["diagnostic assay development"],
            core_terms=["diagnostic assay", "standardization"],
        ),
    ]

    mock_get_scientific_context.return_value = (
        "**Biochemistry:** biomarkers, proteomics\n**Analytics:** mass spectrometry\n**Clinical:** validation, assay"
    )

    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_multi_tasks,
        trace_id=str(uuid4()),
    )

    expected_terms = [
        "biomarkers",
        "proteomics",
        "mass spectrometry",
        "protein analysis",
        "clinical validation",
        "sensitivity",
        "diagnostic assay",
        "standardization",
    ]
    assert result["core_scientific_terms"] == expected_terms
    assert "Biochemistry" in result["scientific_context"]
    assert "Analytics" in result["scientific_context"]
    mock_get_scientific_context.assert_called_once_with(expected_terms, unittest.mock.ANY)


@patch("services.rag.src.grant_application.enrich_terminology_stage._get_scientific_context")
async def test_enrich_objective_with_wikidata_error_handling(
    mock_get_scientific_context: AsyncMock, sample_enrichment_response: ObjectiveEnrichmentResponse
) -> None:
    enrichment_response_with_terms = deepcopy(sample_enrichment_response)
    enrichment_response_with_terms["research_objective"]["core_scientific_terms"] = ["biomarkers"]
    enrichment_response_with_terms["research_tasks"] = [
        _make_enrichment_data(
            description="Analyze proteomics dataset",
            instructions="Use shotgun proteomics",
            guiding_questions=["Which proteins correlate with outcomes?"],
            search_queries=["proteomics outcome analysis"],
            core_terms=["proteomics"],
        )
    ]

    mock_get_scientific_context.side_effect = Exception("Wikidata service unavailable")

    result = await enrich_objective_with_wikidata(
        enrichment_response=enrichment_response_with_terms,
        trace_id=str(uuid4()),
    )

    assert result == {
        "enriched_objective": "",
        "search_queries": [],
        "core_scientific_terms": [],
        "scientific_context": "",
    }
    mock_get_scientific_context.assert_called_once()
