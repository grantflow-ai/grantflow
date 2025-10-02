from typing import Any

import pytest
from packages.db.src.json_objects import ResearchObjective
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_application.dto import EnrichmentDataDTO
from services.rag.src.grant_application.enrich_research_objective import (
    ObjectiveEnrichmentDTO,
    validate_enrichment_response,
)


def create_enrichment_data(
    *,
    core_scientific_terms: list[str] | None = None,
    instructions: str | None = None,
    description: str | None = None,
    guiding_questions: list[str] | None = None,
    search_queries: list[str] | None = None,
) -> EnrichmentDataDTO:
    return {
        "enriched": "Test enriched objective with sufficient length to pass the validation requirements for testing purposes",
        "queries": search_queries or ["Query 1", "Query 2", "Query 3"],
        "terms": core_scientific_terms or ["term1", "term2", "term3", "term4", "term5"],
        "context": "Test scientific context with background information that meets the minimum length requirement for validation",
        "instructions": instructions
        or "These are detailed instructions for text generation that exceed the minimum length requirement.",
        "description": description
        or "This is a detailed description of the research objective that exceeds the minimum length requirement.",
        "questions": guiding_questions or ["Question 1", "Question 2", "Question 3"],
    }


def create_enrichment_response(
    *,
    research_objective: EnrichmentDataDTO | None = None,
    research_tasks: list[EnrichmentDataDTO] | None = None,
) -> ObjectiveEnrichmentDTO:
    return {
        "research_objective": research_objective or create_enrichment_data(),
        "research_tasks": research_tasks or [create_enrichment_data()],
    }


def create_research_objective(*, tasks: list[dict[str, Any]] | None = None) -> ResearchObjective:
    return {
        "number": 1,
        "title": "Test Objective",
        "description": "Test objective",
        "research_tasks": [
            {
                "number": 1,
                "title": t.get("title", "Task 1"),
                "description": t.get("description", ""),
            }
            for t in (tasks or [{"title": "Task 1"}])
        ],
    }


def test_validate_missing_objective() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response({"research_tasks": []}, input_objective=None)  # type: ignore[typeddict-item]
    assert "Missing objective in response" in str(exc.value)


def test_validate_missing_objective_fields() -> None:
    fields = [
        "enriched",
        "terms",
        "context",
        "instructions",
        "description",
        "questions",
        "queries",
    ]

    for field in fields:
        enrichment_data: dict[str, Any] = {}

        for f in fields:
            if f != field:
                if f == "terms":
                    enrichment_data[f] = ["term1", "term2", "term3", "term4", "term5"]
                elif f in ["questions", "queries"]:
                    enrichment_data[f] = ["Q1", "Q2", "Q3"]
                else:
                    enrichment_data[f] = "This is a test value that is long enough to pass validation requirements"

        with pytest.raises(ValidationError) as exc:
            validate_enrichment_response(
                {"research_objective": enrichment_data, "research_tasks": []},  # type: ignore[typeddict-item]
                input_objective=None,
            )
        assert f"Missing {field} in objective" in str(exc.value)


def test_validate_objective_guiding_questions() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_objective=create_enrichment_data(guiding_questions=["Q1", "Q2"])),
            input_objective=None,
        )
    assert "must have at least 3 guiding questions" in str(exc.value)


def test_validate_objective_search_queries() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_objective=create_enrichment_data(search_queries=["Q1", "Q2"])),
            input_objective=None,
        )
    assert "must have at least 3 search queries" in str(exc.value)


def test_validate_objective_instructions_length() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_objective=create_enrichment_data(instructions="Too short")),
            input_objective=None,
        )
    assert "instructions too short" in str(exc.value)


def test_validate_objective_description_length() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_objective=create_enrichment_data(description="Too short")),
            input_objective=None,
        )
    assert "description too short" in str(exc.value)


def test_validate_missing_tasks() -> None:
    enrichment_data = create_enrichment_data()
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            {"research_objective": enrichment_data},  # type: ignore[typeddict-item]
            input_objective=None,
        )
    assert "Missing tasks in response" in str(exc.value)


def test_validate_task_count_mismatch() -> None:
    input_objective = create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}])

    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_tasks=[create_enrichment_data()]),
            input_objective=input_objective,
        )
    assert "Number of enriched tasks doesn't match" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(
                research_tasks=[create_enrichment_data(), create_enrichment_data(), create_enrichment_data()]
            ),
            input_objective=input_objective,
        )
    assert "Number of enriched tasks doesn't match" in str(exc.value)


def test_validate_task_fields() -> None:
    fields = [
        "enriched",
        "terms",
        "context",
        "instructions",
        "description",
        "questions",
        "queries",
    ]

    for field in fields:
        task_data: dict[str, Any] = {}

        for f in fields:
            if f != field:
                if f == "terms":
                    task_data[f] = ["term1", "term2", "term3", "term4", "term5"]
                elif f in ["questions", "queries"]:
                    task_data[f] = ["Q1", "Q2", "Q3"]
                else:
                    task_data[f] = "This is a test value that is long enough to pass validation requirements"

        with pytest.raises(ValidationError) as exc:
            validate_enrichment_response(
                {
                    "research_objective": create_enrichment_data(),
                    "research_tasks": [task_data],  # type: ignore[list-item]
                },
                input_objective=None,
            )
        assert f"Missing {field} in task at index 0" in str(exc.value)


def test_validate_task_guiding_questions() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_tasks=[create_enrichment_data(guiding_questions=["Q1", "Q2"])]),
            input_objective=None,
        )
    assert "must have at least 3 guiding questions" in str(exc.value)


def test_validate_task_search_queries() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_tasks=[create_enrichment_data(search_queries=["Q1", "Q2"])]),
            input_objective=None,
        )
    assert "must have at least 3 search queries" in str(exc.value)


def test_validate_task_instructions_length() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_tasks=[create_enrichment_data(instructions="Too short")]),
            input_objective=None,
        )
    assert "instructions too short" in str(exc.value)


def test_validate_task_description_length() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_enrichment_response(
            create_enrichment_response(research_tasks=[create_enrichment_data(description="Too short")]),
            input_objective=None,
        )
    assert "description too short" in str(exc.value)


def test_validate_valid_enrichment() -> None:
    input_objective = create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}])

    validate_enrichment_response(
        create_enrichment_response(research_tasks=[create_enrichment_data(), create_enrichment_data()]),
        input_objective=input_objective,
    )

    validate_enrichment_response(
        create_enrichment_response(research_tasks=[create_enrichment_data()]),
        input_objective=None,
    )
