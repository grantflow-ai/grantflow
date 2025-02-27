import pytest

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.grant_template.extract_sections import ExtractedSectionDTO, validate_section_extraction


def create_section(
    *, id: str, parent_id: str | None = None, is_detailed_workplan: bool | None = None
) -> ExtractedSectionDTO:
    return {
        "id": id,
        "title": "Test Section",
        "parent_id": parent_id,
        "is_detailed_workplan": is_detailed_workplan,
        "is_long_form": True,
    }


def test_validate_empty_sections() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction({"sections": []})
    assert "No sections extracted" in str(exc.value)

    with pytest.raises(InsufficientContextError) as exc:
        validate_section_extraction({"sections": [], "error": "test error"})
    assert "test error" in str(exc.value)


def test_validate_snake_case_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction({"sections": [create_section(id="notSnakeCase")]})
    assert "Invalid section ID format" in str(exc.value)

    validate_section_extraction({"sections": [create_section(id="valid_snake_case")]})


def test_validate_descriptive_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction({"sections": [create_section(id="short")]})
    assert "Section ID must be descriptive" in str(exc.value)

    validate_section_extraction({"sections": [create_section(id="descriptive_id")]})


def test_validate_unique_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(id="duplicate_id"),
                    create_section(id="duplicate_id"),
                ]
            }
        )
    assert "Duplicate section IDs found" in str(exc.value)


def test_validate_parent_references() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {"sections": [create_section(id="test_child_section", parent_id="nonexistent_parent")]}
        )
    assert "Invalid parent section reference" in str(exc.value)

    validate_section_extraction(
        {
            "sections": [
                create_section(id="test_parent_section"),
                create_section(id="test_child_section", parent_id="test_parent_section"),
            ]
        }
    )


def test_validate_workplan_children() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(id="workplan_section", is_detailed_workplan=True),
                    create_section(id="child_section", parent_id="workplan_section"),
                ]
            }
        )
    assert "The workplan section cannot have any sub-sections" in str(exc.value)


def test_validate_nesting_depth() -> None:
    sections = {
        "sections": [
            create_section(id="level_one"),
            create_section(id="level_two", parent_id="level_one"),
            create_section(id="level_three", parent_id="level_two"),
            create_section(id="level_four", parent_id="level_three"),
            create_section(id="level_five", parent_id="level_four"),
            create_section(id="level_six", parent_id="level_five"),
        ]
    }
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(sections)
    assert "Maximum nesting depth exceeded" in str(exc.value)

    sections["sections"].pop()
    validate_section_extraction(sections)


def test_validate_circular_dependencies() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(id="section_a", parent_id="section_b"),
                    create_section(id="section_b", parent_id="section_c"),
                    create_section(id="section_c", parent_id="section_a"),
                ]
            }
        )
    assert "Circular dependency detected" in str(exc.value)
