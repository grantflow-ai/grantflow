from typing import Any

import pytest

from src.exceptions import ValidationError
from src.rag.grant_template.generate_template_data import TemplateSectionsResponse, validate_template_sections
from tests.factories import GrantPartFactory, GrantSectionFactory


@pytest.fixture
def base_response() -> TemplateSectionsResponse:
    narrative_part = GrantPartFactory.build(name="narrative", parent_id="<root>", order=1)

    research_plan = GrantSectionFactory.build(
        name="research_strategy", is_research_plan=True, parent_id=narrative_part["name"], order=1
    )
    background = GrantSectionFactory.build(
        name="background", depends_on=[research_plan["name"]], parent_id=narrative_part["name"], order=2
    )
    impact = GrantSectionFactory.build(
        name="impact", depends_on=[research_plan["name"]], parent_id=narrative_part["name"], order=3
    )

    return {"parts": [narrative_part], "sections": [research_plan, background, impact]}


def test_valid_template(base_response: TemplateSectionsResponse) -> None:
    validate_template_sections(base_response)


def test_duplicate_order_same_parent() -> None:
    narrative_part = GrantPartFactory.build(name="narrative", parent_id="<root>", order=1)
    sections = [
        GrantSectionFactory.build(parent_id=narrative_part["name"], order=1, is_research_plan=True),
        GrantSectionFactory.build(parent_id=narrative_part["name"], order=1),
        GrantSectionFactory.build(parent_id=narrative_part["name"], order=2),
    ]

    with pytest.raises(ValidationError):
        validate_template_sections({"parts": [narrative_part], "sections": sections})


def test_valid_order_different_parents() -> None:
    narrative_part = GrantPartFactory.build(name="narrative", parent_id="<root>", order=1)
    resources_part = GrantPartFactory.build(name="resources", parent_id="<root>", order=2)

    sections = [
        GrantSectionFactory.build(
            parent_id="<root>", order=3, is_research_plan=True
        ),  # Changed order to 3 to avoid conflict with parts
        GrantSectionFactory.build(parent_id=narrative_part["name"], order=1),
        GrantSectionFactory.build(parent_id=resources_part["name"], order=1),
    ]

    validate_template_sections({"parts": [narrative_part, resources_part], "sections": sections})


def test_duplicate_section_names(base_response: TemplateSectionsResponse) -> None:
    duplicate_section = base_response["sections"][0].copy()
    base_response["sections"].append(duplicate_section)
    with pytest.raises(ValidationError):
        validate_template_sections(base_response)


def test_invalid_parent_id(base_response: TemplateSectionsResponse) -> None:
    base_response["sections"][0]["parent_id"] = "nonexistent"
    with pytest.raises(ValidationError):
        validate_template_sections(base_response)


def test_circular_parent_dependency(base_response: TemplateSectionsResponse) -> None:
    base_response["sections"][0]["parent_id"] = "background"
    base_response["sections"][1]["parent_id"] = "research_strategy"
    with pytest.raises(ValidationError):
        validate_template_sections(base_response)


@pytest.mark.parametrize(
    ("research_plan_count", "valid"),
    [(0, False), (1, True), (2, False)],
)
def test_research_plan_count(research_plan_count: int, valid: bool) -> None:
    narrative_part = GrantPartFactory.build(name="narrative", parent_id="<root>", order=1)
    sections = [
        GrantSectionFactory.build(
            is_research_plan=i < research_plan_count, parent_id=narrative_part["name"], order=i + 1
        )
        for i in range(3)
    ]

    if valid:
        validate_template_sections({"parts": [narrative_part], "sections": sections})
    else:
        with pytest.raises(ValidationError):
            validate_template_sections({"parts": [narrative_part], "sections": sections})


def test_invalid_dependencies(base_response: TemplateSectionsResponse) -> None:
    base_response["sections"][0]["depends_on"] = ["nonexistent"]
    with pytest.raises(ValidationError):
        validate_template_sections(base_response)


def test_circular_dependencies(base_response: TemplateSectionsResponse) -> None:
    base_response["sections"][0]["depends_on"] = ["background"]
    base_response["sections"][1]["depends_on"] = ["research_strategy"]
    with pytest.raises(ValidationError):
        validate_template_sections(base_response)


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("name", 123),
        ("title", 123),
        ("type", "invalid"),
        ("parent_id", 123),
        ("keywords", ["one", "two"]),
        ("topics", ["one"]),
        ("max_words", 0),
        ("max_words", -1),
        ("max_words", 20000),
        ("search_queries", ["one", "two"]),
        ("search_queries", ["q" for _ in range(11)]),
        ("order", 0),
        ("order", -1),
    ],
)
def test_invalid_field_values(base_response: TemplateSectionsResponse, field: str, invalid_value: Any) -> None:
    base_response["sections"][0][field] = invalid_value  # type: ignore
    with pytest.raises((ValidationError, TypeError)):
        validate_template_sections(base_response)
