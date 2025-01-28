import pytest

from src.db.json_objects import GrantSection
from src.exceptions import ValidationError
from src.rag.grant_application.utils import (
    TreeNode,
    create_dependencies_text,
    create_generation_groups,
    create_text_recursively,
    map_to_tree,
)
from tests.factories import GrantSectionFactory

SAMPLE_TEXTS = {
    "abstract": "This is an abstract.",
    "research_strategy": "This is the research strategy.",
    "preliminary_results": "These are preliminary results.",
    "risks_and_mitigations": "These are risks and mitigations.",
    "impact": "This is the impact.",
}


def test_create_dependencies_text_empty() -> None:
    result = create_dependencies_text(depends_on=[], texts={})
    assert result == {}


def test_create_dependencies_text_with_dependencies() -> None:
    result = create_dependencies_text(
        depends_on=["research_strategy"],
        texts=SAMPLE_TEXTS,
    )
    assert result == {"research_strategy": "This is the research strategy."}


@pytest.mark.parametrize(
    ("sections", "expected_groups"),
    [
        (
            [
                {"id": "a", "depends_on": []},
                {"id": "b", "depends_on": ["a"]},
            ],
            [["a"], ["b"]],
        ),
        (
            [
                {"id": "a", "depends_on": []},
                {"id": "b", "depends_on": []},
                {"id": "c", "depends_on": ["a", "b"]},
            ],
            [["a", "b"], ["c"]],
        ),
    ],
)
def test_create_generation_groups(sections: list[GrantSection], expected_groups: list[list[str]]) -> None:
    groups = create_generation_groups(sections)
    assert len(groups) == len(expected_groups)
    assert all(len(group) == len(expected) for group, expected in zip(groups, expected_groups, strict=False))
    assert all(
        section["id"] in expected for group, expected in zip(groups, expected_groups, strict=False) for section in group
    )


def test_create_generation_groups_circular_dependency() -> None:
    sections = [
        {"id": "a", "depends_on": ["b"]},
        {"id": "b", "depends_on": ["a"]},
    ]
    with pytest.raises(ValidationError):
        create_generation_groups(sections)  # type: ignore[arg-type]


def test_create_generation_groups_missing_dependency() -> None:
    sections = [{"id": "a", "depends_on": ["missing"]}]
    with pytest.raises(ValidationError):
        create_generation_groups(sections)  # type: ignore[arg-type]


def test_map_to_tree_simple(grant_sections: list[GrantSection]) -> None:
    result = map_to_tree(sections=grant_sections, section_texts=SAMPLE_TEXTS)
    assert len(result) == 2  # abstract and narrative at root
    assert result[0]["title"] == "Narrative"
    assert result[1]["title"] == "Abstract"
    assert result[1]["text"] == "This is an abstract."
    assert not result[1]["children"]


def test_map_to_tree_nested(grant_sections: list[GrantSection]) -> None:
    result = map_to_tree(sections=grant_sections, section_texts=SAMPLE_TEXTS)
    narrative = next(node for node in result if node["title"] == "Narrative")
    assert len(narrative["children"]) == 3  # research_strategy, risks_and_mitigations, impact
    assert narrative["children"][0]["title"] == "Research Strategy"


def test_map_to_tree_ordering(grant_sections: list[GrantSection]) -> None:
    result = map_to_tree(sections=grant_sections, section_texts=SAMPLE_TEXTS)
    narrative = next(node for node in result if node["title"] == "Narrative")
    children_titles = [child["title"] for child in narrative["children"]]
    assert children_titles == ["Research Strategy", "Risks and Mitigations", "Potential Impact"]


@pytest.mark.parametrize(
    ("node", "expected_text"),
    [
        (
            TreeNode(
                order=1,
                title="Test",
                text="Content",
                children=[],
            ),
            "## Test\n\nContent",
        ),
        (
            TreeNode(
                order=1,
                title="Parent",
                text="Parent content",
                children=[
                    TreeNode(
                        order=1,
                        title="Child",
                        text="Child content",
                        children=[],
                    ),
                ],
            ),
            "## Parent\n\nParent content\n\n### Child\n\nChild content",
        ),
    ],
)
def test_create_text_recursively(node: TreeNode, expected_text: str) -> None:
    result = create_text_recursively(node)
    assert result == expected_text


def test_create_text_recursively_max_depth() -> None:
    deep_node = TreeNode(
        order=1,
        title="Level 1",
        text="Content 1",
        children=[
            TreeNode(
                order=1,
                title="Level 2",
                text="Content 2",
                children=[
                    TreeNode(
                        order=1,
                        title="Level 3",
                        text="Content 3",
                        children=[
                            TreeNode(
                                order=1,
                                title="Level 4",
                                text="Content 4",
                                children=[
                                    TreeNode(
                                        order=1,
                                        title="Level 5",
                                        text="Content 5",
                                        children=[
                                            TreeNode(
                                                order=1,
                                                title="Level 6",
                                                text="Content 6",
                                                children=[],
                                            ),
                                        ],
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )
    result = create_text_recursively(deep_node)
    assert "####### " not in result
    assert "###### Level 6" in result


@pytest.fixture
def multi_level_sections() -> list[GrantSection]:
    return [
        GrantSectionFactory.build(
            id="part_b",
            title="Part B",
            parent_id="<root>",
            order=2,
        ),
        GrantSectionFactory.build(
            id="part_a",
            title="Part A",
            parent_id="<root>",
            order=1,
        ),
        GrantSectionFactory.build(
            id="section_b2",
            title="Section B2",
            parent_id="part_b",
            order=2,
            depends_on=[],
        ),
        GrantSectionFactory.build(
            id="section_b1",
            title="Section B1",
            parent_id="part_b",
            order=1,
            depends_on=[],
        ),
        GrantSectionFactory.build(
            id="section_a2",
            title="Section A2",
            parent_id="part_a",
            order=2,
            depends_on=[],
        ),
        GrantSectionFactory.build(
            id="section_a1",
            title="Section A1",
            parent_id="part_a",
            order=1,
            depends_on=[],
        ),
        GrantSectionFactory.build(
            id="subsection_b1_2",
            title="Subsection B1.2",
            parent_id="section_b1",
            order=2,
            depends_on=[],
        ),
        GrantSectionFactory.build(
            id="subsection_b1_1",
            title="Subsection B1.1",
            parent_id="section_b1",
            order=1,
            depends_on=[],
        ),
    ]


def test_tree_multi_level_root_ordering(multi_level_sections: list[GrantSection]) -> None:
    tree = map_to_tree(sections=multi_level_sections, section_texts={})
    root_titles = [node["title"] for node in tree]
    assert root_titles == ["Part A", "Part B"]


def test_tree_multi_level_children_ordering(multi_level_sections: list[GrantSection]) -> None:
    tree = map_to_tree(sections=multi_level_sections, section_texts={})

    part_a = next(node for node in tree if node["title"] == "Part A")
    part_a_children = [node["title"] for node in part_a["children"]]
    assert part_a_children == ["Section A1", "Section A2"]

    part_b = next(node for node in tree if node["title"] == "Part B")
    part_b_children = [node["title"] for node in part_b["children"]]
    assert part_b_children == ["Section B1", "Section B2"]


def test_tree_multi_level_grandchildren_ordering(multi_level_sections: list[GrantSection]) -> None:
    tree = map_to_tree(sections=multi_level_sections, section_texts={})

    part_b = next(node for node in tree if node["title"] == "Part B")
    section_b1 = next(node for node in part_b["children"] if node["title"] == "Section B1")
    section_b1_children = [node["title"] for node in section_b1["children"]]
    assert section_b1_children == ["Subsection B1.1", "Subsection B1.2"]


def test_tree_multi_level_text_generation(multi_level_sections: list[GrantSection]) -> None:
    section_texts = {
        "part_a": "Part A content",
        "part_b": "Part B content",
        "section_a1": "Section A1 content",
        "section_a2": "Section A2 content",
        "section_b1": "Section B1 content",
        "section_b2": "Section B2 content",
        "subsection_b1_1": "Subsection B1.1 content",
        "subsection_b1_2": "Subsection B1.2 content",
    }

    tree = map_to_tree(sections=multi_level_sections, section_texts=section_texts)
    text = create_text_recursively(tree[0])  # Part A

    expected_order = [
        "## Part A",
        "### Section A1",
        "### Section A2",
    ]

    for i, expected in enumerate(expected_order[:-1]):
        assert text.index(expected) < text.index(expected_order[i + 1])


def test_tree_multi_level_complete_structure(multi_level_sections: list[GrantSection]) -> None:
    tree = map_to_tree(sections=multi_level_sections, section_texts={})

    assert len(tree) == 2
    for root in tree:
        assert len(root["children"]) == 2

        if root["title"] == "Part B":
            section_b1 = next(node for node in root["children"] if node["title"] == "Section B1")
            assert len(section_b1["children"]) == 2
