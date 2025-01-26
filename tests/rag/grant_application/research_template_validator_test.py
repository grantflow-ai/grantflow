from typing import Any

import pytest

from src.exceptions import ValidationError
from src.rag.grant_template.generate_template_data import TemplateSectionsResponse, validate_template_sections
from tests.factories import GrantPartFactory, GrantSectionFactory


@pytest.fixture
def base_response() -> TemplateSectionsResponse:
    research_plan = GrantSectionFactory.build(name="research_strategy", is_research_plan=True)
    background = GrantSectionFactory.build(name="background", depends_on=[research_plan["name"]])
    impact = GrantSectionFactory.build(name="impact", depends_on=[research_plan["name"]])

    return {"parts": [GrantPartFactory.build()], "sections": [research_plan, background, impact]}


def test_valid_template(base_response: TemplateSectionsResponse) -> None:
    validate_template_sections(base_response)


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
def test_research_plan_count(base_response: TemplateSectionsResponse, research_plan_count: int, valid: bool) -> None:
    base_response["sections"] = [
        GrantSectionFactory.build(is_research_plan=i < research_plan_count)
        for i, _ in enumerate(base_response["sections"])
    ]

    if valid:
        validate_template_sections(base_response)
    else:
        with pytest.raises(ValidationError):
            validate_template_sections(base_response)


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
