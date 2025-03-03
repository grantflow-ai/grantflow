import pytest

from src.db.json_objects import ResearchObjective
from src.exceptions import ValidationError
from src.rag.grant_application.extract_relationships import validate_relationships_response


def create_research_objective(*, tasks: list[dict[str, str]] | None = None) -> ResearchObjective:
    return {
        "number": 1,
        "title": "Test Objective",
        "description": "Test objective",
        "research_tasks": [
            {"number": 1, "title": t["title"], "description": t.get("description", ""), "relationships": []}
            for t in (tasks or [])
        ],
    }


def test_validate_no_research_objectives() -> None:
    """Test validation when no research objectives are provided."""
    # Test with missing relationships key
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=None)
    assert "Missing relationships in response" in str(exc.value)

    # Test with empty relationships array
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=None)
    assert "Relationships array is empty" in str(exc.value)

    # Test with valid relationships
    validate_relationships_response(
        {"relationships": [("1", "2", "Valid description that is long enough to pass validation")]},
        research_objectives=None,
    )


def test_validate_with_research_objectives() -> None:
    """Test validation with research objectives."""
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    # Test with missing relationships key
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=objectives)
    assert "Missing relationships in response" in str(exc.value)

    # Test with empty relationships array
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response({"relationships": []}, research_objectives=objectives)
    assert "Relationships array is empty" in str(exc.value)


def test_validate_relationship_format() -> None:
    """Test validation of relationship format."""
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    # Test with incorrect relationship format (too few elements)
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1.1", "A detailed description of the relationship")]},
            research_objectives=objectives,
        )
    assert "incorrect format" in str(exc.value)

    # Test with incorrect relationship format (too many elements)
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1.1", "A detailed description of the relationship")]},
            research_objectives=objectives,
        )
    assert "incorrect format" in str(exc.value)


def test_validate_relationship_ids() -> None:
    """Test validation of relationship IDs."""
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    # Test with invalid source ID
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("3", "1", valid_description)]},
            research_objectives=objectives,
        )
    assert "Invalid source ID" in str(exc.value)

    # Test with invalid target ID
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "3", valid_description)]},
            research_objectives=objectives,
        )
    assert "Invalid target ID" in str(exc.value)

    # Test with invalid task ID format
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1.3", valid_description)]},
            research_objectives=objectives,
        )
    assert "Invalid target ID" in str(exc.value)


def test_validate_relationship_description() -> None:
    """Test validation of relationship description."""
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    # Test with empty description
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1.1", "")]},
            research_objectives=objectives,
        )
    assert "too short" in str(exc.value)

    # Test with short description
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1.1", "Too short")]},
            research_objectives=objectives,
        )
    assert "too short" in str(exc.value)


def test_validate_self_relationships() -> None:
    """Test validation of self-relationships."""
    objectives = [create_research_objective(tasks=[{"title": "Task 1"}])]

    # Test with self-relationship between objectives
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1", "1", "This description is long enough to pass the length validation")]},
            research_objectives=objectives,
        )
    assert "Self-relationship detected" in str(exc.value)

    # Test with self-relationship between tasks
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {"relationships": [("1.1", "1.1", "This description is long enough to pass the length validation")]},
            research_objectives=objectives,
        )
    assert "Self-relationship detected" in str(exc.value)


def test_validate_duplicate_relationships() -> None:
    """Test validation of duplicate relationships."""
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    # Test with duplicate relationships (same direction)
    with pytest.raises(ValidationError) as exc:
        validate_relationships_response(
            {
                "relationships": [
                    ("1", "2", valid_description),
                    (
                        "1",
                        "2",
                        "This is another detailed description of the relationship that is definitely long enough to pass validation.",
                    ),
                ]
            },
            research_objectives=objectives,
        )
    assert "Duplicate relationships detected" in str(exc.value)

    # Test with different source and target (should not raise)
    validate_relationships_response(
        {
            "relationships": [
                ("1", "2", valid_description),
                (
                    "2",
                    "1",
                    "This is another detailed description of the relationship that is definitely long enough to pass validation.",
                ),
            ]
        },
        research_objectives=objectives,
    )


def test_validate_valid_relationships() -> None:
    """Test validation of valid relationships."""
    objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}, {"title": "Task 2"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    valid_description = "This is a detailed description of the relationship between these research components that explains how they interact and depend on each other in meaningful ways."

    # Test with valid relationships ensuring sufficient objective coverage
    validate_relationships_response(
        {
            "relationships": [
                # Cover all objectives (1 and 2) to meet the 70% threshold
                ("1", "2", valid_description),
                ("2", "1.1", valid_description),
                # Additional task relationships
                ("1.1", "1.2", valid_description),
            ]
        },
        research_objectives=objectives,
    )

    # Test with more objectives to verify coverage threshold
    more_objectives = [
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
        create_research_objective(tasks=[{"title": "Task 1"}]),
    ]

    validate_relationships_response(
        {
            "relationships": [
                # Cover 3 out of 4 objectives (75% > 70% threshold)
                ("1", "2", valid_description),
                ("2", "3", valid_description),
                ("3", "1", valid_description),
                # Additional task relationships
                ("1.1", "2.1", valid_description),
            ]
        },
        research_objectives=more_objectives,
    )
