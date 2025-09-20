from typing import TypedDict

from packages.db.src.json_objects import GrantElement, GrantLongFormSection


class TreeNode(TypedDict):
    order: int
    title: str
    text: str | None
    children: list["TreeNode"]


def map_to_tree(
    *,
    parent_id: str | None = None,
    section_texts: dict[str, str],
    sections: list[GrantElement | GrantLongFormSection],
) -> list[TreeNode]:
    return sorted(
        [
            TreeNode(
                order=section["order"],
                title=section["title"],
                text=section_texts.get(section["id"]),
                children=map_to_tree(sections=sections, section_texts=section_texts, parent_id=section["id"]),
            )
            for section in sorted(sections, key=lambda s: s["order"])
            if section.get("parent_id") == parent_id
        ],
        key=lambda s: s["order"],
    )


def create_text_recursively(node: TreeNode, *, depth: int = 2) -> str:
    title_prefix = "#" * min(depth, 6)
    text = f"{title_prefix} {node['title']}\n\n"

    if node_text := node["text"]:
        text += f"{node_text}\n\n"

    for child in node["children"]:
        text += f"{create_text_recursively(child, depth=depth + 1)}\n\n"

    return text.strip()


def generate_application_text(
    title: str, grant_sections: list[GrantElement | GrantLongFormSection], section_texts: dict[str, str]
) -> str:
    tree = map_to_tree(sections=grant_sections, section_texts=section_texts)
    return "\n\n".join([f"# {title}", *[create_text_recursively(node) for node in tree]])
