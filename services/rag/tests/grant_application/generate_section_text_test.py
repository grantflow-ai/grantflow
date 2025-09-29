from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from packages.db.src.json_objects import CFPAnalysisResult, GrantLongFormSection, ResearchObjective, ResearchTask
from pytest_mock import MockerFixture

from services.rag.src.grant_application.generate_section_text import generate_section_text, handle_generate_section_text


@pytest.fixture
def sample_grant_section() -> GrantLongFormSection:
    return GrantLongFormSection(
        id="research_strategy",
        title="Research Strategy",
        order=1,
        parent_id=None,
        keywords=["methodology", "approach"],
        topics=["methods", "experimental design"],
        generation_instructions="Describe the research methodology and experimental approach",
        depends_on=[],
        max_words=1500,
        search_queries=["research methodology", "experimental design"],
        is_detailed_research_plan=True,
        is_clinical_trial=False,
    )


@pytest.fixture
def sample_research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            description="Identify and validate novel biomarkers for early disease detection",
            research_tasks=[
                ResearchTask(number=1, title="Screen candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarker performance"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Analyze disease mechanisms",
            description="Elucidate molecular mechanisms underlying disease progression",
            research_tasks=[
                ResearchTask(number=1, title="Perform pathway analysis"),
            ],
        ),
    ]


@pytest.fixture
def sample_cfp_analysis() -> CFPAnalysisResult:
    return CFPAnalysisResult(
        cfp_analysis={
            "required_sections": [
                {
                    "section_name": "Research Strategy",
                    "definition": "The research strategy section of the proposal",
                    "requirements": [
                        {
                            "requirement": "Include detailed methodology",
                            "quote_from_source": "The proposal must include a detailed methodology section",
                            "category": "methodology",
                        },
                        {
                            "requirement": "Describe experimental approach",
                            "quote_from_source": "Clearly describe your experimental approach",
                            "category": "approach",
                        },
                    ],
                    "dependencies": [],
                }
            ],
            "length_constraints": [
                {
                    "section_name": "Research Strategy",
                    "measurement_type": "pages",
                    "limit_description": "Research Strategy section limited to 6 pages",
                    "quote_from_source": "The Research Strategy must not exceed 6 pages",
                    "exclusions": [],
                }
            ],
            "evaluation_criteria": [
                {
                    "criterion_name": "Scientific Merit",
                    "description": "The scientific merit and rigor of the proposal",
                    "quote_from_source": "The proposal must demonstrate strong scientific merit",
                },
                {
                    "criterion_name": "Innovation",
                    "description": "The innovative nature of the proposed approach",
                    "quote_from_source": "The approach should be innovative and novel",
                },
            ],
            "additional_requirements": [],
            "sections_count": 1,
            "length_constraints_found": 1,
            "evaluation_criteria_count": 2,
        },
        nlp_analysis={
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
        analysis_metadata={
            "content_length": 1000,
            "categories_found": 3,
            "total_sentences": 10,
        },
    )


async def test_generate_section_text_function(
    mocker: MockerFixture,
    sample_grant_section: GrantLongFormSection,
) -> None:
    mock_generate_long_form = mocker.patch(
        "services.rag.src.grant_application.generate_section_text.generate_long_form_text",
        return_value="Generated section content with sufficient detail.",
    )

    trace_id = str(uuid4())
    task_description = "Generate a comprehensive research strategy section"

    result = await generate_section_text(
        task_description=task_description,
        trace_id=trace_id,
        section=sample_grant_section,
    )

    assert result == "Generated section content with sufficient detail."
    mock_generate_long_form.assert_called_once_with(
        task_description=task_description,
        max_words=1500,
        min_words=1200,
        prompt_identifier="section_generation",
        trace_id=trace_id,
    )


async def test_handle_generate_section_text_with_evaluation(
    mocker: MockerFixture,
    mock_job_manager: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.handle_source_validation",
        return_value=None,
    )

    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.compress_prompt_text",
        side_effect=lambda text, aggressive: f"compressed_{text[:20]}",
    )

    mock_with_evaluation = mocker.patch(
        "services.rag.src.grant_application.generate_section_text.with_prompt_evaluation",
        return_value="Final evaluated section text",
    )

    trace_id = str(uuid4())
    shared_context = "This is the shared retrieval context with background information."

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=shared_context,
        cfp_analysis=sample_cfp_analysis,
        research_plan_text="Sample research plan text for testing",
        enrichment_responses=[],
        relationships={},
        trace_id=trace_id,
        job_manager=mock_job_manager,
    )

    assert result == "Final evaluated section text"

    mock_with_evaluation.assert_called_once()
    call_kwargs = mock_with_evaluation.call_args.kwargs

    assert call_kwargs["prompt_identifier"] == "section_generation"
    assert call_kwargs["increment"] == 10
    assert call_kwargs["retries"] == 2
    assert call_kwargs["passing_score"] == 60
    assert call_kwargs["trace_id"] == trace_id
    assert len(call_kwargs["criteria"]) == 6

    prompt_handler = call_kwargs["prompt_handler"]
    assert hasattr(prompt_handler, "func")
    assert hasattr(prompt_handler, "keywords")
    assert "section" in prompt_handler.keywords
    assert prompt_handler.keywords["section"] == sample_grant_section


async def test_handle_generate_section_text_with_cfp_requirements(
    mocker: MockerFixture,
    mock_job_manager: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.handle_source_validation",
        return_value=None,
    )

    compressed_prompts = []

    def capture_and_return(text: str, aggressive: bool) -> str:
        compressed_prompts.append(text)
        return text

    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.compress_prompt_text",
        side_effect=capture_and_return,
    )

    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.with_prompt_evaluation",
        return_value="Result text",
    )

    trace_id = str(uuid4())
    shared_context = "Shared context"

    await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=shared_context,
        cfp_analysis=sample_cfp_analysis,
        research_plan_text="Sample research plan text for testing",
        enrichment_responses=[],
        relationships={},
        trace_id=trace_id,
        job_manager=mock_job_manager,
    )

    assert len(compressed_prompts) == 1
    full_prompt = compressed_prompts[0]
    assert "Research Strategy" in full_prompt
    assert "Include detailed methodology" in full_prompt
    assert "The proposal must include a detailed methodology section" in full_prompt
    assert "Research Strategy section limited to 6 pages" in full_prompt
    assert "The Research Strategy must not exceed 6 pages" in full_prompt


async def test_handle_generate_section_text_with_missing_information_warning(
    mocker: MockerFixture,
    mock_job_manager: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mock_validation = mocker.patch(
        "services.rag.src.grant_application.generate_section_text.handle_source_validation",
        return_value="Missing critical methodology details",
    )

    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.compress_prompt_text",
        side_effect=lambda text, aggressive: text,
    )

    mocker.patch(
        "services.rag.src.grant_application.generate_section_text.with_prompt_evaluation",
        return_value="Generated with warnings",
    )

    mock_logger_warning = mocker.patch("services.rag.src.grant_application.generate_section_text.logger.warning")

    trace_id = str(uuid4())

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context="Context",
        cfp_analysis=sample_cfp_analysis,
        research_plan_text="Sample research plan text for testing",
        enrichment_responses=[],
        relationships={},
        trace_id=trace_id,
        job_manager=mock_job_manager,
    )

    assert result == "Generated with warnings"

    mock_validation.assert_called_once()

    mock_logger_warning.assert_called_once()
    call_args = mock_logger_warning.call_args
    assert call_args[0][0] == "Source validation identified missing information, proceeding with available context"
    assert call_args[1]["section"] == "Research Strategy"
    assert call_args[1]["missing_info"] == "Missing critical methodology details"
    assert call_args[1]["trace_id"] == trace_id


async def test_generate_section_text_respects_min_words_ratio(
    mocker: MockerFixture,
    sample_grant_section: GrantLongFormSection,
) -> None:
    from services.rag.src.constants import MIN_WORDS_RATIO

    mock_generate_long_form = mocker.patch(
        "services.rag.src.grant_application.generate_section_text.generate_long_form_text",
        return_value="Generated text",
    )

    trace_id = str(uuid4())

    test_cases = [
        (1000, int(1000 * MIN_WORDS_RATIO)),
        (500, int(500 * MIN_WORDS_RATIO)),
        (2000, int(2000 * MIN_WORDS_RATIO)),
    ]

    for max_words, expected_min_words in test_cases:
        sample_grant_section["max_words"] = max_words

        await generate_section_text(
            task_description="Generate section",
            trace_id=trace_id,
            section=sample_grant_section,
        )

        call_args = mock_generate_long_form.call_args
        assert call_args.kwargs["max_words"] == max_words
        assert call_args.kwargs["min_words"] == expected_min_words
