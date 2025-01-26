from typing import TypedDict

from src.db.json_objects import GrantPart, GrantSection
from src.exceptions import ValidationError


def create_dependencies_text(depends_on: list[str], texts: dict[str, str]) -> dict[str, str]:
    """Create the dependencies text.

    Args:
        depends_on: The dependencies.
        texts: The texts.

    Returns:
        The dependencies text.
    """
    if not depends_on:
        return {}

    dependency_texts: dict[str, str] = {}

    for dependency in depends_on:
        dependency_texts[dependency] = texts[dependency]

    return dependency_texts


def create_generation_groups(sections: list[GrantSection]) -> list[list[GrantSection]]:
    """Create the groups for LLM generation.

        - First group has no dependencies
        - Second group has dependencies in the first group
        - Third group has dependencies in the second or first group
        - ... ad infinitum

    Args:
        sections: The sections.

    Raises:
        ValidationError: If a circular dependency is detected or if a section is missing in the dependencies.

    Returns:
        The generation groups.
    """
    groups: list[list[GrantSection]] = []
    generated = set[str]()

    while len(generated) < len(sections):
        if current_group := [
            section
            for section in sections
            if section["name"] not in generated and all(dep in generated for dep in section["depends_on"])
        ]:
            groups.append(current_group)
            generated.update(section["name"] for section in current_group)
            continue

        raise ValidationError(
            "Circular dependency detected or missing sections in dependencies.",
            context={"generated": generated, "sections": sections},
        )

    return groups


class TreeNode(TypedDict):
    """Tree node data."""

    order: int
    """The order of the element relative to its parents."""
    title: str
    """The title of the section."""
    text: str | None
    """The text of the section."""
    children: list["TreeNode"]
    """The children of the section."""


def map_to_tree(
    *,
    parent_id: str = "<root>",
    section_texts: dict[str, str],
    sections: list[GrantPart | GrantSection],
) -> list[TreeNode]:
    """Map the sections to a tree structure.

    Args:
        parent_id: The parent ID.
        section_texts: The section texts.
        sections: The sections.

    Returns:
        The tree structure.
    """
    return sorted(
        [
            TreeNode(
                order=section["order"],
                title=section["title"],
                text=section_texts.get(section["name"]),
                children=map_to_tree(sections=sections, section_texts=section_texts, parent_id=section["name"]),
            )
            for section in sections
            if section["parent_id"] == parent_id
        ],
        key=lambda s: s["order"],
    )


def create_text_recursively(node: TreeNode, *, depth: int = 1) -> str:
    """Create the text recursively.

    Args:
        node: The node.
        depth: The depth of the node.

    Returns:
        The text.
    """
    title_prefix = "#" * min(depth + 1, 6)
    text = f"{title_prefix} {node['title']}\n\n"

    if node_text := node["text"]:
        text += f"{node_text}\n\n"

    for child in node["children"]:
        text += create_text_recursively(child, depth=depth + 1)

    return text.strip()
