import pytest

from src.exceptions import ValidationError
from src.rag.grant_template.generate_template_data import TemplateSectionsResponse, validate_template_sections
from tests.factories import GrantPartFactory, GrantSectionFactory


@pytest.fixture
def valid_response() -> TemplateSectionsResponse:
    research_plan = GrantSectionFactory.build(
        name="research_plan", is_research_plan=True, parent_id="<root>", order=1, depends_on=[]
    )
    background = GrantSectionFactory.build(
        name="background", is_research_plan=False, parent_id="<root>", order=2, depends_on=[]
    )
    summary = GrantPartFactory.build(name="summary", parent_id="<root>", order=3)
    return {"parts": [summary], "sections": [research_plan, background]}


def test_valid_template_sections(valid_response: TemplateSectionsResponse) -> None:
    validate_template_sections(valid_response)


def test_duplicate_names(valid_response: TemplateSectionsResponse) -> None:
    duplicate_part = GrantPartFactory.build(name="research_plan", parent_id="<root>")
    valid_response["parts"].append(duplicate_part)

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "duplicate_name" in exc.value.context


def test_missing_research_plan(valid_response: TemplateSectionsResponse) -> None:
    valid_response["sections"] = [s for s in valid_response["sections"] if not s["is_research_plan"]]

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "research_plan_count" in exc.value.context


def test_multiple_research_plans(valid_response: TemplateSectionsResponse) -> None:
    second_research_plan = GrantSectionFactory.build(
        name="research_plan_2", is_research_plan=True, parent_id="<root>", order=4
    )
    valid_response["sections"].append(second_research_plan)

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "research_plan_count" in exc.value.context


def test_research_plan_with_section_dependencies(valid_response: TemplateSectionsResponse) -> None:
    research_plan = next(s for s in valid_response["sections"] if s["is_research_plan"])
    research_plan["depends_on"] = ["background"]

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "invalid_dependencies" in exc.value.context


def test_invalid_parent_reference(valid_response: TemplateSectionsResponse) -> None:
    section = next(s for s in valid_response["sections"] if not s["is_research_plan"])
    section["parent_id"] = "nonexistent"

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "invalid_parent" in exc.value.context


def test_max_tree_depth(valid_response: TemplateSectionsResponse) -> None:
    current = "<root>"
    parts = []

    # Create a chain of parts each parenting the next
    for i in range(7):
        part = GrantPartFactory.build(
            name=f"part_{i}",
            parent_id=current,
            order=i + 4,  # Start after existing items
        )
        parts.append(part)
        current = part["name"]

    valid_response["parts"].extend(parts)

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "depth" in exc.value.context


def test_invalid_section_dependencies(valid_response: TemplateSectionsResponse) -> None:
    section = next(s for s in valid_response["sections"] if not s["is_research_plan"])
    section["depends_on"] = ["nonexistent"]

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "invalid_dependencies" in exc.value.context


def test_non_sequential_order(valid_response: TemplateSectionsResponse) -> None:
    valid_response["sections"][0]["order"] = 10

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "found_orders" in exc.value.context


def test_circular_parent_relationships(valid_response: TemplateSectionsResponse) -> None:
    # First add both parts with valid parents
    part1 = GrantPartFactory.build(name="part1", parent_id="<root>", order=4)
    part2 = GrantPartFactory.build(name="part2", parent_id="<root>", order=5)
    valid_response["parts"].extend([part1, part2])

    # Run validation to ensure basic structure is valid
    validate_template_sections(valid_response)

    # Now create the cycle - both parents exist
    part1["parent_id"] = "part2"
    part2["parent_id"] = "part1"

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "starting_node" in exc.value.context


def test_circular_dependencies(valid_response: TemplateSectionsResponse) -> None:
    # Create two sections with circular dependencies
    section1 = GrantSectionFactory.build(
        name="section1", is_research_plan=False, parent_id="<root>", order=4, depends_on=["section2"]
    )
    section2 = GrantSectionFactory.build(
        name="section2",
        is_research_plan=False,  # Can't be research plan due to dependency
        parent_id="<root>",
        order=5,
        depends_on=["section1"],
    )
    valid_response["sections"].extend([section1, section2])

    with pytest.raises(ValidationError) as exc:
        validate_template_sections(valid_response)
    assert exc.value.context
    assert "starting_node" in exc.value.context


@pytest.mark.parametrize(
    ("test_case", "expected_valid"),
    [
        # Simple valid case
        (
            {
                "parts": [GrantPartFactory.build(name="part1", parent_id="<root>", order=2)],
                "sections": [
                    GrantSectionFactory.build(
                        name="research", is_research_plan=True, parent_id="<root>", order=1, depends_on=[]
                    ),
                    GrantSectionFactory.build(name="background", is_research_plan=False, parent_id="<root>", order=3),
                ],
            },
            True,
        ),
        # Valid complex nesting
        (
            {
                "parts": [
                    GrantPartFactory.build(name="part1", parent_id="<root>", order=1),
                    GrantPartFactory.build(name="part2", parent_id="<root>", order=3),
                ],
                "sections": [
                    GrantSectionFactory.build(
                        name="research", is_research_plan=True, parent_id="part1", order=2, depends_on=["part1"]
                    ),
                    GrantSectionFactory.build(name="background", is_research_plan=False, parent_id="part2", order=4),
                ],
            },
            True,
        ),
    ],
)
def test_complex_structures(test_case: TemplateSectionsResponse, expected_valid: bool) -> None:
    if expected_valid:
        validate_template_sections(test_case)
    else:
        with pytest.raises(ValidationError):
            validate_template_sections(test_case)
