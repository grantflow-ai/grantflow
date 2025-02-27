from typing import cast

import pytest

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.grant_template.determine_application_sections import (
    ExtractedSectionDTO,
    ExtractedSections,
    validate_section_extraction,
)


def create_section(
    *,
    section_id: str,
    parent_section_id: str | None = None,
    is_detailed_workplan: bool | None = None,
    is_long_form: bool = True,
    title: str = "Test Section",
    order: int = 1,
) -> ExtractedSectionDTO:
    return {
        "id": section_id,
        "title": title,
        "parent_id": parent_section_id,
        "is_detailed_workplan": is_detailed_workplan,
        "is_long_form": is_long_form,
        "order": order,
    }


def test_validate_empty_sections() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction({"sections": []})
    assert "No sections extracted" in str(exc.value)

    with pytest.raises(InsufficientContextError) as inc_exc:
        validate_section_extraction({"sections": [], "error": "test error"})
    assert "test error" in str(inc_exc.value)


def test_validate_snake_case_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {"sections": [create_section(section_id="notSnakeCase", is_detailed_workplan=True, order=1)]}
        )
    assert "Invalid section ID format" in str(exc.value)

    # For valid tests, we need to include a workplan section
    validate_section_extraction(
        {"sections": [create_section(section_id="valid_snake_case", is_detailed_workplan=True, order=1)]}
    )


def test_validate_descriptive_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {"sections": [create_section(section_id="short", is_detailed_workplan=True, order=1)]}
        )
    assert "Section ID must be descriptive" in str(exc.value)

    validate_section_extraction(
        {"sections": [create_section(section_id="descriptive_id", is_detailed_workplan=True, order=1)]}
    )


def test_validate_unique_ids() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="duplicate_id", order=1, title="Section One"),
                    create_section(section_id="duplicate_id", order=2, title="Section Two", is_detailed_workplan=True),
                ]
            }
        )
    assert "Duplicate section IDs found" in str(exc.value)
    assert "duplicate_ids" in str(exc.value)  # Check for context info


def test_validate_order_values() -> None:
    """Test validation of order values."""
    # Test duplicate orders
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", order=1, title="Section One", is_detailed_workplan=True),
                    create_section(section_id="section_two", order=1, title="Section Two"),  # Same order value
                ]
            }
        )
    assert "Duplicate order values found" in str(exc.value)

    # Test non-consecutive orders
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", order=1, title="Section One", is_detailed_workplan=True),
                    create_section(section_id="section_two", order=3, title="Section Two"),  # Gap in order
                ]
            }
        )
    assert "Order values must start at 1 and be consecutive" in str(exc.value)


def test_validate_parent_references() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(
                        section_id="test_child_section",
                        parent_section_id="nonexistent_parent",
                        is_detailed_workplan=True,
                        order=1,
                        title="Child Section",
                    )
                ]
            }
        )
    assert "Invalid parent section reference" in str(exc.value)

    validate_section_extraction(
        {
            "sections": [
                create_section(section_id="test_parent_section", order=1, title="Parent Section"),
                create_section(
                    section_id="test_child_section",
                    parent_section_id="test_parent_section",
                    is_detailed_workplan=True,
                    order=2,
                    title="Child Section",
                ),
            ]
        }
    )


def test_validate_workplan_children() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="workplan_section", is_detailed_workplan=True, order=1, title="Workplan"),
                    create_section(
                        section_id="child_section", parent_section_id="workplan_section", order=2, title="Child Section"
                    ),
                ]
            }
        )
    assert "The workplan section cannot have any sub-sections" in str(exc.value)
    assert "workplan_id" in str(exc.value)  # Check for context info


def test_workplan_must_be_longform() -> None:
    """Test that workplan sections must be marked as long-form."""
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="workplan_section", is_detailed_workplan=True, is_long_form=False),
                ]
            }
        )
    assert "must be marked as a long-form section" in str(exc.value)


def test_short_section_title() -> None:
    """Test validation of short section titles."""
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", title="A"),
                ]
            }
        )
    assert "Section title too short" in str(exc.value)


def test_duplicate_section_titles() -> None:
    """Test validation of duplicate section titles."""
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", title="Same Title", order=1),
                    create_section(section_id="section_two", title="Same Title", order=2, is_detailed_workplan=True),
                ]
            }
        )
    assert "Duplicate section titles found" in str(exc.value)


def test_validate_nesting_depth() -> None:
    sections: ExtractedSections = {
        "sections": [
            create_section(section_id="level_one", order=1, title="Level One"),
            create_section(section_id="level_two", parent_section_id="level_one", order=2, title="Level Two"),
            create_section(section_id="level_three", parent_section_id="level_two", order=3, title="Level Three"),
            create_section(section_id="level_four", parent_section_id="level_three", order=4, title="Level Four"),
            create_section(section_id="level_five", parent_section_id="level_four", order=5, title="Level Five"),
            create_section(section_id="level_six", parent_section_id="level_five", order=6, title="Level Six"),
            create_section(section_id="workplan_section", is_detailed_workplan=True, order=7, title="Workplan"),
        ],
        "error": None,
    }
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(cast(ExtractedSections, {"sections": sections["sections"]}))
    assert "Maximum nesting depth exceeded" in str(exc.value)

    # Remove the level six section and fix the order of the workplan section
    sections["sections"].pop(5)  # Remove the level_six section
    # Update the workplan order to maintain consecutive ordering
    sections["sections"][-1]["order"] = 6
    validate_section_extraction(sections)


def test_validate_circular_dependencies() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_a", parent_section_id="section_b", order=1, title="Section A"),
                    create_section(section_id="section_b", parent_section_id="section_c", order=2, title="Section B"),
                    create_section(section_id="section_c", parent_section_id="section_a", order=3, title="Section C"),
                    create_section(section_id="workplan_section", is_detailed_workplan=True, order=4, title="Workplan"),
                ]
            }
        )
    assert "Circular dependency detected" in str(exc.value)


def test_exactly_one_workplan_section() -> None:
    """Test that exactly one section must be marked as workplan."""
    # Test no workplan sections
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", order=1, title="Section One"),
                    create_section(section_id="section_two", order=2, title="Section Two"),
                ]
            }
        )
    assert "Exactly one section must be marked as detailed workplan" in str(exc.value)

    # Test multiple workplan sections
    with pytest.raises(ValidationError) as exc:
        validate_section_extraction(
            {
                "sections": [
                    create_section(section_id="section_one", is_detailed_workplan=True, order=1, title="Section One"),
                    create_section(section_id="section_two", is_detailed_workplan=True, order=2, title="Section Two"),
                ]
            }
        )
    assert "Exactly one section must be marked as detailed workplan" in str(exc.value)

    # Test valid case with exactly one workplan section
    validate_section_extraction(
        {
            "sections": [
                create_section(section_id="section_one", order=1, title="Section One"),
                create_section(section_id="section_two", is_detailed_workplan=True, order=2, title="Section Two"),
            ]
        }
    )
