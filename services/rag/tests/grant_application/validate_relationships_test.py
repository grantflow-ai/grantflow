import pytest
from packages.db.src.json_objects import ResearchObjective
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_application.extract_relationships import validate_relationships_response


def create_research_objective(*, tasks: list[dict[str, str]] | None = None) -> ResearchObjective:
    return {
        "number": 1,
        "title": "Test Objective",
        "description": "Test objective",
        "research_tasks": [
            {"number": 1, "title": t["title"], "description": t.get("description", "")} for t in (tasks or [])
        ],
    }


def test_validate_no_research_objectives() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=None)
    assert "Relationships array is empty" in str(exc.value)

    validate_relationships_response(
        {
            "relationships": [
                {"source": "1", "target": "2", "desc": "Valid description that is long enough to pass validation"}
            ]
        },
        research_objectives=None,
    )


def test_validate_with_research_objectives() -> None:
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=objectives)
    assert "Relationships array is empty" in str(exc.value)


def test_validate_relationship_format() -> None:
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "1", "target": "1.1", "desc": "A detailed description of the relationship"}]},
            research_objectives=objectives,
        )
    assert "is too short" in str(exc.value)


def test_validate_relationship_ids() -> None:
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "3", "target": "1", "desc": valid_description}]},
            research_objectives=objectives,
        )
    assert "Invalid source ID" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "1", "target": "3", "desc": valid_description}]},
            research_objectives=objectives,
        )
    assert "Invalid target ID" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "1", "target": "1.3", "desc": valid_description}]},
            research_objectives=objectives,
        )
    assert "Invalid target ID" in str(exc.value)


def test_validate_relationship_description() -> None:
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "1", "target": "1.1", "desc": ""}]},
            research_objectives=objectives,
        )
    assert "missing required fields" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [{"source": "1", "target": "1.1", "desc": "Too short"}]},
            research_objectives=objectives,
        )
    assert "too short" in str(exc.value)


def test_validate_self_relationships() -> None:
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {
                "relationships": [
                    {
                        "source": "1",
                        "target": "1",
                        "desc": "This description is long enough to pass the length validation",
                    }
                ]
            },
            research_objectives=objectives,
        )
    assert "Self-relationship detected" in str(exc.value)

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {
                "relationships": [
                    {
                        "source": "1.1",
                        "target": "1.1",
                        "desc": "This description is long enough to pass the length validation",
                    }
                ]
            },
            research_objectives=objectives,
        )
    assert "Self-relationship detected" in str(exc.value)


def test_validate_duplicate_relationships() -> None:
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {
                "relationships": [
                    {"source": "1", "target": "2", "desc": valid_description},
                    {
                        "source": "1",
                        "target": "2",
                        "desc": "This is another detailed description of the relationship that is definitely long enough to pass validation.",
                    },
                ]
            },
            research_objectives=objectives,
        )
    assert "Duplicate relationships detected" in str(exc.value)

    validate_relationships_response(
        {
            "relationships": [
                {"source": "1", "target": "2", "desc": valid_description},
                {
                    "source": "2",
                    "target": "1",
                    "desc": "This is another detailed description of the relationship that is definitely long enough to pass validation.",
                },
            ]
        },
        research_objectives=objectives,
    )


def test_validate_valid_relationships() -> None:
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    validate_relationships_response(
        {
            "relationships": [
                {"source": "1", "target": "2", "desc": valid_description},
                {"source": "2", "target": "1.1", "desc": valid_description},
                {"source": "1.1", "target": "1.2", "desc": valid_description},
            ]
        },
        research_objectives=objectives,
    )

    more_objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    validate_relationships_response(
        {
            "relationships": [
                {"source": "1", "target": "2", "desc": valid_description},
                {"source": "2", "target": "3", "desc": valid_description},
                {"source": "3", "target": "1", "desc": valid_description},
                {"source": "1.1", "target": "2.1", "desc": valid_description},
            ]
        },
        research_objectives=more_objectives,
    )
