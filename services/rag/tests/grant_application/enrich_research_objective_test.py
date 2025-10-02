from typing import cast
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_application.dto import EnrichObjectiveInputDTO
from services.rag.src.grant_application.enrich_research_objective import (
    ObjectiveEnrichmentDTO,
    enrich_objective_generation,
    handle_enrich_objective,
    validate_enrichment_response,
)


@pytest.fixture
def sample_research_objective() -> ResearchObjective:
    return ResearchObjective(
        number=1,
        title="Develop novel biomarkers",
        research_tasks=[
            ResearchTask(number=1, title="Identify candidate biomarkers"),
            ResearchTask(number=2, title="Validate biomarkers"),
        ],
    )


@pytest.fixture
def valid_enrichment_response() -> ObjectiveEnrichmentDTO:
    return cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Develop and validate novel protein biomarkers for early cancer detection through comprehensive proteomics analysis, utilizing mass spectrometry techniques to identify specific proteins that can reliably distinguish cancerous from healthy tissue states.",
                "core_scientific_terms": ["biomarkers", "proteomics", "mass spectrometry", "validation", "specificity"],
                "scientific_context": "Early cancer detection remains a critical challenge in oncology, with current biomarkers lacking sufficient sensitivity and specificity. Recent advances in proteomics and mass spectrometry offer unprecedented opportunities to identify novel protein signatures that could revolutionize cancer screening programs.",
                "instructions": "Write a comprehensive description focusing on scientific rigor and methodological precision. Emphasize the innovative approach and potential impact on cancer research. Use formal academic tone with technical detail appropriate for grant reviewers.",
                "description": "This research objective aims to discover and validate novel protein biomarkers for early cancer detection using advanced proteomics techniques. The methodology involves mass spectrometry analysis of patient samples to identify differentially expressed proteins.",
                "guiding_questions": [
                    "What biomarkers show the highest specificity for early detection?",
                    "How can we ensure reproducibility across different patient populations?",
                    "What validation strategies will provide the strongest evidence?",
                ],
                "search_queries": [
                    "cancer biomarker discovery",
                    "proteomics mass spectrometry",
                    "biomarker validation methods",
                ],
            },
            "research_tasks": [
                {
                    "enriched_objective": "Systematically identify candidate protein biomarkers through state-of-the-art proteomics analysis, employing advanced mass spectrometry platforms to detect and quantify differentially expressed proteins between cancer and healthy tissue samples with high statistical confidence.",
                    "core_scientific_terms": [
                        "proteomics",
                        "mass spectrometry",
                        "differential expression",
                        "protein analysis",
                        "biomarker discovery",
                    ],
                    "scientific_context": "Proteomics-based biomarker discovery has emerged as a powerful approach for cancer diagnosis, leveraging high-throughput mass spectrometry to analyze complex protein mixtures and identify disease-specific protein signatures that traditional genomic approaches may miss.",
                    "instructions": "Focus on technical methodology and experimental design for biomarker identification. Emphasize innovative proteomics approaches and data analysis techniques.",
                    "description": "Systematic identification of candidate biomarkers through comprehensive proteomics analysis using mass spectrometry techniques to detect differentially expressed proteins in cancer versus control samples.",
                    "guiding_questions": [
                        "Which proteomics platform provides optimal sensitivity?",
                        "How do we control for biological variability?",
                        "What statistical methods best identify significant differences?",
                    ],
                    "search_queries": [
                        "proteomics biomarker identification",
                        "mass spectrometry cancer",
                        "differential protein expression",
                    ],
                },
                {
                    "enriched_objective": "Comprehensively validate identified protein biomarkers through rigorous clinical studies, establishing their diagnostic performance characteristics including sensitivity, specificity, and predictive values across diverse patient populations to ensure clinical utility and regulatory compliance.",
                    "core_scientific_terms": [
                        "biomarker validation",
                        "clinical sensitivity",
                        "specificity",
                        "assay development",
                        "clinical trials",
                    ],
                    "scientific_context": "Clinical validation of biomarkers is a critical bottleneck in translating laboratory discoveries into clinical practice, requiring carefully designed studies that demonstrate consistent performance across diverse populations and real-world clinical conditions.",
                    "instructions": "Emphasize clinical validation methodology and regulatory considerations. Focus on translational aspects and clinical utility of identified biomarkers.",
                    "description": "Comprehensive validation of identified biomarkers through clinical studies to establish sensitivity, specificity, and clinical utility for cancer detection in diverse patient populations.",
                    "guiding_questions": [
                        "What sample size ensures adequate statistical power?",
                        "How do we address population diversity in validation?",
                        "What regulatory requirements must be considered?",
                    ],
                    "search_queries": [
                        "biomarker clinical validation",
                        "diagnostic test sensitivity",
                        "clinical trial design",
                    ],
                },
            ],
        },
    )


@pytest.fixture
def sample_dto_input() -> EnrichObjectiveInputDTO:
    from uuid import uuid4

    from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive

    return EnrichObjectiveInputDTO(
        application_id=str(uuid4()),
        grant_section=GrantLongFormSection(
            id="work_plan",
            title="Work Plan",
            order=1,
            evidence="CFP evidence for Work Plan",
            parent_id=None,
            depends_on=[],
            generation_instructions="Generate detailed work plan",
            is_clinical_trial=None,
            is_detailed_research_plan=True,
            keywords=["work plan"],
            max_words=2000,
            search_queries=["work plan"],
            topics=["research methodology"],
        ),
        research_objective=ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        form_inputs=ResearchDeepDive(background_context="Cancer research project"),
        retrieval_context="Retrieved context about biomarker research methods and validation techniques.",
        keywords=["biomarkers", "cancer", "detection"],
        topics=["proteomics", "clinical validation"],
        trace_id=str(uuid4()),
    )


async def test_validate_enrichment_response_valid_data(
    valid_enrichment_response: ObjectiveEnrichmentDTO, sample_research_objective: ResearchObjective
) -> None:
    validate_enrichment_response(valid_enrichment_response, input_objective=sample_research_objective)


async def test_validate_enrichment_response_missing_objective() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast("ObjectiveEnrichmentDTO", {"research_tasks": []})

    with pytest.raises(ValidationError, match="Missing objective in response"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_invalid_objective_type() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO", {"research_objective": "not a dict", "research_tasks": []}
    )

    with pytest.raises(ValidationError, match="Objective must be a dictionary"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_missing_objective_fields() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Missing enriched_objective in objective"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_wrong_terms_count() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective that is longer than fifty characters",
                "core_scientific_terms": ["term1", "term2"],
                "scientific_context": "Test scientific context that is longer than fifty characters",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Objective must have exactly 5 core scientific terms"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_insufficient_questions() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective that is longer than fifty characters",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that is longer than fifty characters",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Objective must have at least 3 guiding questions"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_insufficient_queries() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective that is longer than fifty characters",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that is longer than fifty characters",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Objective must have at least 3 search queries"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_short_instructions() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Short",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Objective instructions too short"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_short_description() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Short",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [],
        },
    )

    with pytest.raises(ValidationError, match="Objective description too short"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_missing_tasks() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            }
        },
    )

    with pytest.raises(ValidationError, match="Missing tasks in response"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_mismatched_task_count(sample_research_objective: ResearchObjective) -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [
                {
                    "enriched_objective": "Test enriched task objective with sufficient length",
                    "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                    "scientific_context": "Test task scientific context with background",
                    "instructions": "Test instructions that are longer than fifty characters",
                    "description": "Test description that is longer than fifty characters",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["Q1", "Q2", "Q3"],
                }
            ],
        },
    )

    with pytest.raises(ValidationError, match="Number of enriched tasks doesn't match input objective tasks"):
        validate_enrichment_response(invalid_response, input_objective=sample_research_objective)


async def test_validate_enrichment_response_invalid_task_fields() -> None:
    invalid_response: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [
                {
                    "enriched_objective": "Test task enriched objective with sufficient length",
                    "core_scientific_terms": ["term1", "term2"],
                    "scientific_context": "Test task scientific context with background information for validation",
                    "instructions": "Test instructions that are longer than fifty characters",
                    "description": "Test description that is longer than fifty characters",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["Q1", "Q2", "Q3"],
                }
            ],
        },
    )

    with pytest.raises(ValidationError, match="Task at index 0 must have exactly 5 core scientific terms"):
        validate_enrichment_response(invalid_response, input_objective=None)


@patch("services.rag.src.grant_application.enrich_research_objective.handle_completions_request")
async def test_enrich_objective_generation_success(
    mock_handle_completions_request: AsyncMock, valid_enrichment_response: ObjectiveEnrichmentDTO
) -> None:
    from uuid import uuid4

    mock_handle_completions_request.return_value = valid_enrichment_response

    result = await enrich_objective_generation(
        "Test task description with research objectives and tasks", trace_id=str(uuid4()), input_objective=None
    )

    assert result == valid_enrichment_response
    mock_handle_completions_request.assert_called_once()


@patch("services.rag.src.grant_application.enrich_research_objective.with_evaluation")
async def test_handle_enrich_objective_success(
    mock_with_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
    sample_dto_input: EnrichObjectiveInputDTO,
    valid_enrichment_response: ObjectiveEnrichmentDTO,
) -> None:
    mock_with_evaluation.return_value = valid_enrichment_response

    result = await handle_enrich_objective(sample_dto_input, job_manager=mock_job_manager)

    assert result == valid_enrichment_response

    mock_with_evaluation.assert_called_once()
    call_args = mock_with_evaluation.call_args
    assert call_args.kwargs["prompt_identifier"] == "enrich_objective"
    assert call_args.kwargs["passing_score"] == 60
    assert call_args.kwargs["increment"] == 10
    assert "criteria" in call_args.kwargs


@patch("services.rag.src.grant_application.enrich_research_objective.with_evaluation")
async def test_handle_enrich_objective_error_handling(
    mock_with_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
    sample_dto_input: EnrichObjectiveInputDTO,
) -> None:
    mock_with_evaluation.side_effect = Exception("Enrichment service error")

    with pytest.raises(Exception, match="Enrichment service error"):
        await handle_enrich_objective(sample_dto_input, job_manager=mock_job_manager)

    mock_with_evaluation.assert_called_once()


async def test_validation_with_empty_research_objective() -> None:
    response_with_empty_tasks: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [],
        },
    )

    objective_with_no_tasks = ResearchObjective(number=1, title="Test objective", research_tasks=[])

    validate_enrichment_response(response_with_empty_tasks, input_objective=objective_with_no_tasks)


async def test_validation_comprehensive_task_validation() -> None:
    response_with_invalid_task: ObjectiveEnrichmentDTO = cast(
        "ObjectiveEnrichmentDTO",
        {
            "research_objective": {
                "enriched_objective": "Test enriched objective with sufficient length for validation",
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "scientific_context": "Test scientific context that provides background information",
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            },
            "research_tasks": [
                {
                    "enriched_objective": "Test task enriched objective with sufficient length",
                    "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                    "scientific_context": "Test task scientific context with background information that meets the minimum length requirement",
                    "instructions": "Short",
                    "description": "Test description that is longer than fifty characters",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["Q1", "Q2", "Q3"],
                }
            ],
        },
    )

    with pytest.raises(ValidationError, match="Task at index 0 instructions too short"):
        validate_enrichment_response(response_with_invalid_task, input_objective=None)
