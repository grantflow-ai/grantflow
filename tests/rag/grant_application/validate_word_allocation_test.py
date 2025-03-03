import pytest

from src.exceptions import ValidationError
from src.rag.grant_application.allocate_word_counts import validate_word_allocation_response
from src.rag.grant_application.dto import ResearchComponentGenerationDTO


def create_research_component(*, number: str = "1") -> ResearchComponentGenerationDTO:
    return {
        "number": number,
        "title": f"Component {number}",
        "description": "A test component",
        "instructions": "Test instructions",
        "guiding_questions": ["Q1", "Q2", "Q3"],
        "search_queries": ["Q1", "Q2", "Q3"],
        "relationships": [],
        "type": "objective" if "." not in number else "task",
    }


def test_validate_empty_response() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_word_allocation_response(
            response={},
            max_words=1000,
            research_components=[create_research_component()],
        )
    assert "Empty response" in str(exc.value)


def test_validate_missing_component() -> None:
    components = [
        create_research_component(number="1"),
        create_research_component(number="1.1"),
    ]

    with pytest.raises(ValidationError) as exc:
        validate_word_allocation_response(
            response={"1": 500},
            max_words=1000,
            research_components=components,
        )
    assert "Missing word allocation for component 1.1" in str(exc.value)


def test_validate_unknown_component() -> None:
    components = [create_research_component(number="1")]

    with pytest.raises(ValidationError) as exc:
        validate_word_allocation_response(
            response={"1": 500, "2": 500},
            max_words=1000,
            research_components=components,
        )
    assert "Unknown component ID in response: 2" in str(exc.value)


@pytest.mark.parametrize(
    ("total_words", "max_words"),
    [
        (1100, 1000),
        (2000, 1500),
        (3000, 2000),
        (5000, 4000),
    ],
)
def test_validate_exceeds_max_words(total_words: int, max_words: int) -> None:
    components = [
        create_research_component(number="1"),
        create_research_component(number="2"),
    ]

    words_per_component = total_words // len(components)
    response = {comp["number"]: words_per_component for comp in components}

    with pytest.raises(ValidationError) as exc:
        validate_word_allocation_response(
            response=response,
            max_words=max_words,
            research_components=components,
        )
    assert f"Total allocated words ({total_words}) exceed maximum limit ({max_words})" in str(exc.value)


@pytest.mark.parametrize(
    ("component_id", "word_count"),
    [
        ("1", 30),
        ("2", 40),
        ("1.1", 25),
        ("2.1", 45),
    ],
)
def test_validate_low_word_count(component_id: str, word_count: int) -> None:
    components = [create_research_component(number=component_id)]

    with pytest.raises(ValidationError) as exc:
        validate_word_allocation_response(
            response={component_id: word_count},
            max_words=1000,
            research_components=components,
        )
    assert f"Word count for component {component_id} is too low ({word_count})" in str(exc.value)


def test_validate_valid_allocation() -> None:
    components = [
        create_research_component(number="1"),
        create_research_component(number="1.1"),
        create_research_component(number="1.2"),
        create_research_component(number="2"),
        create_research_component(number="2.1"),
    ]

    response: dict[str, int] = {
        "1": 300,
        "1.1": 150,
        "1.2": 150,
        "2": 250,
        "2.1": 150,
    }

    # Should not raise any validation errors
    validate_word_allocation_response(
        response=response,
        max_words=1000,
        research_components=components,
    )
