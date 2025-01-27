import pytest
from pytest_mock import MockerFixture

from src.db.json_objects import ResearchObjective
from src.exceptions import ValidationError
from src.rag.grant_application.plan_research_plan_generation import (
    ResearchObjectiveDTO,
    ResearchPlanDTO,
    ResearchTaskDTO,
    enrich_and_plan_research_plan_generation,
    handle_enrich_and_plan_research_plan,
    research_plan_validator,
)
from tests.factories import GrantSectionFactory

VALID_OBJECTIVE_1: ResearchObjectiveDTO = {
    "objective_number": 1,
    "title": "Test Objective 1",
    "description": "Test Description",
    "max_words": 100,
    "relationships": [("2", "Related to objective 2")],
    "instructions": "Test instructions",
    "guiding_questions": ["Q1", "Q2", "Q3"],
    "keywords": ["k1", "k2", "k3", "k4", "k5"],
    "search_queries": ["q1", "q2", "q3"],
}

VALID_OBJECTIVE_2: ResearchObjectiveDTO = {
    "objective_number": 2,
    "title": "Test Objective 2",
    "description": "Test Description",
    "max_words": 100,
    "relationships": [("1", "Related to objective 1")],
    "instructions": "Test instructions",
    "guiding_questions": ["Q1", "Q2", "Q3"],
    "keywords": ["k1", "k2", "k3", "k4", "k5"],
    "search_queries": ["q1", "q2", "q3"],
}

VALID_TASK_1: ResearchTaskDTO = {
    "objective_number": 1,
    "task_number": 1,
    "title": "Test Task 1",
    "description": "Test Description",
    "max_words": 100,
    "relationships": [("2.1", "Related to task 2.1")],
    "instructions": "Test instructions",
    "guiding_questions": ["Q1", "Q2", "Q3"],
    "keywords": ["k1", "k2", "k3", "k4", "k5"],
    "search_queries": ["q1", "q2", "q3"],
}

VALID_TASK_2: ResearchTaskDTO = {
    "objective_number": 2,
    "task_number": 1,
    "title": "Test Task 2",
    "description": "Test Description",
    "max_words": 100,
    "relationships": [("1.1", "Related to task 1.1")],
    "instructions": "Test instructions",
    "guiding_questions": ["Q1", "Q2", "Q3"],
    "keywords": ["k1", "k2", "k3", "k4", "k5"],
    "search_queries": ["q1", "q2", "q3"],
}


@pytest.fixture
def valid_research_plan() -> ResearchPlanDTO:
    return {
        "research_objectives": [VALID_OBJECTIVE_1, VALID_OBJECTIVE_2],
        "research_tasks": [VALID_TASK_1, VALID_TASK_2],
    }


@pytest.fixture
def input_objectives() -> list[ResearchObjective]:
    return [
        {
            "number": 1,
            "title": "Test Objective 1",
            "description": "Test Description",
            "research_tasks": [{"number": 1, "title": "Test Task 1", "description": "Test Description"}],
        },
        {
            "number": 2,
            "title": "Test Objective 2",
            "description": "Test Description",
            "research_tasks": [{"number": 1, "title": "Test Task 2", "description": "Test Description"}],
        },
    ]


def test_valid_research_plan(valid_research_plan: ResearchPlanDTO, input_objectives: list[ResearchObjective]) -> None:
    research_plan_validator(valid_research_plan, input_objectives=input_objectives)


@pytest.mark.parametrize("missing_objective", [1, 2])
def test_missing_objective(
    valid_research_plan: ResearchPlanDTO,
    input_objectives: list[ResearchObjective],
    missing_objective: int,
) -> None:
    valid_research_plan["research_objectives"] = [
        obj for obj in valid_research_plan["research_objectives"] if obj["objective_number"] != missing_objective
    ]
    with pytest.raises(ValidationError):
        research_plan_validator(valid_research_plan, input_objectives=input_objectives)


def test_missing_task(valid_research_plan: ResearchPlanDTO, input_objectives: list[ResearchObjective]) -> None:
    valid_research_plan["research_tasks"].pop()
    with pytest.raises(ValidationError):
        research_plan_validator(valid_research_plan, input_objectives=input_objectives)


@pytest.mark.parametrize(
    "invalid_relationship",
    [
        ["3", "Invalid objective reference"],
        ["1.3", "Invalid task reference"],
    ],
)
def test_invalid_relationships(
    valid_research_plan: ResearchPlanDTO,
    input_objectives: list[ResearchObjective],
    invalid_relationship: list[tuple[str, str]],
) -> None:
    valid_research_plan["research_objectives"][0]["relationships"] = invalid_relationship
    with pytest.raises(ValidationError):
        research_plan_validator(valid_research_plan, input_objectives=input_objectives)


async def test_enrich_and_plan_research_plan_generation(mocker: MockerFixture) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.grant_application.plan_research_plan_generation.handle_completions_request",
        return_value={"research_objectives": [], "research_tasks": []},
    )

    await enrich_and_plan_research_plan_generation("test", input_objectives=[])
    mock_handle_completions.assert_called_once()


async def test_handle_enrich_and_plan_research_plan(mocker: MockerFixture) -> None:
    mock_retrieve = mocker.patch(
        "src.rag.grant_application.plan_research_plan_generation.retrieve_documents",
        return_value=["test"],
    )
    mock_evaluation = mocker.patch(
        "src.rag.grant_application.plan_research_plan_generation.with_prompt_evaluation",
        return_value={"research_objectives": [], "research_tasks": []},
    )

    grant_section = GrantSectionFactory.build(
        keywords=["k1"],
        topics=["t1"],
        max_words=100,
        search_queries=["q1"],
    )

    result = await handle_enrich_and_plan_research_plan(
        application_id="test",
        grant_section=grant_section,
        research_objectives=[],
        form_inputs={},
    )

    assert isinstance(result, dict)
    mock_retrieve.assert_called_once()
    mock_evaluation.assert_called_once()
