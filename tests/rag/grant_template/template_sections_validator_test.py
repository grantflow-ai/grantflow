"""Tests for the template sections validator."""

import pytest

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.grant_template.generate_grant_template import validate_template_sections
from tests.factories import GrantSectionFactory


def test_validate_empty_sections() -> None:
    """Test validation of empty sections."""
    with pytest.raises(ValidationError, match="No sections generated"):
        validate_template_sections({"sections": []}, input_sections=[])

    with pytest.raises(InsufficientContextError, match="test error"):
        validate_template_sections({"sections": [], "error": "test error"}, input_sections=[])


def test_validate_section_mismatch() -> None:
    """Test validation of section ID matching between input and output."""
    input_sections = [{"id": "section_one", "title": "Section One", "parent_id": None}]
    output_sections = [GrantSectionFactory.build(id="section_two")]

    with pytest.raises(ValidationError, match="Section mismatch detected"):
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)


def test_validate_parent_relationship_preserved() -> None:
    """Test validation that parent relationships are preserved."""
    input_sections = [
        {"id": "parent", "title": "Parent", "parent_id": None},
        {"id": "child", "title": "Child", "parent_id": "parent"},
    ]
    output_sections = [
        GrantSectionFactory.build(id="parent"),
        GrantSectionFactory.build(id="child", parent_id="different_parent"),
    ]

    with pytest.raises(ValidationError, match="Parent relationship modified"):
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)


def test_validate_order_values() -> None:
    """Test validation of section order values."""
    input_sections = [
        {"id": "section_one", "title": "Section One", "parent_id": None},
        {"id": "section_two", "title": "Section Two", "parent_id": None},
    ]

    # Test duplicate order values
    output_sections = [
        GrantSectionFactory.build(id="section_one", order=1),
        GrantSectionFactory.build(id="section_two", order=1),
    ]
    with pytest.raises(ValidationError, match="Duplicate order values found"):
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)

    # Test non-consecutive order values
    output_sections = [
        GrantSectionFactory.build(id="section_one", order=1),
        GrantSectionFactory.build(id="section_two", order=3),
    ]
    with pytest.raises(ValidationError, match="Order values must start at 1 and be consecutive"):
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)


def test_validate_dependencies() -> None:
    input_sections = [
        {"id": "section_one", "title": "Section One", "parent_id": None},
        {"id": "section_two", "title": "Section Two", "parent_id": None},
    ]

    # Test invalid dependency reference
    output_sections = [
        GrantSectionFactory.build(id="section_one", order=1, depends_on=["nonexistent"]),
        GrantSectionFactory.build(id="section_two", order=2),
    ]
    with pytest.raises(ValidationError) as exc:
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)
    assert "Invalid dependencies found: {'nonexistent'}" in str(exc.value)

    # Test circular dependency
    output_sections = [
        GrantSectionFactory.build(id="section_one", order=1, depends_on=["section_two"]),
        GrantSectionFactory.build(id="section_two", order=2, depends_on=["section_one"]),
    ]
    with pytest.raises(ValidationError) as exc:
        validate_template_sections({"sections": output_sections}, input_sections=input_sections)
    assert "Circular dependencies detected" in str(exc.value)
    assert "starting_node" in str(exc.value)


def test_valid_template_sections() -> None:
    """Test validation of valid template sections."""
    input_sections = [
        {"id": "section_one", "title": "Section One", "parent_id": None},
        {"id": "section_two", "title": "Section Two", "parent_id": "section_one"},
    ]

    output_sections = [
        GrantSectionFactory.build(id="section_one", order=1),
        GrantSectionFactory.build(id="section_two", parent_id="section_one", order=2, depends_on=["section_one"]),
    ]

    # Should not raise any exceptions
    validate_template_sections({"sections": output_sections}, input_sections=input_sections)
