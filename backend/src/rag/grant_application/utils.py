from typing import TypedDict, TypeGuard

from src.db.json_objects import GrantElement, GrantLongFormSection
from src.exceptions import ValidationError
from src.rag.grant_template.utils import detect_cycle


def is_grant_long_form_section(section: GrantElement | GrantLongFormSection) -> TypeGuard[GrantLongFormSection]:
    return "depends_on" in section


def create_dependencies_text(depends_on: list[str], texts: dict[str, str]) -> dict[str, str]:
    if not depends_on:
        return {}

    dependency_texts: dict[str, str] = {}

    for dependency in depends_on:
        dependency_texts[dependency] = texts[dependency]

    return dependency_texts


def create_generation_groups(sections: list[GrantLongFormSection]) -> list[list[GrantLongFormSection]]:
    groups: list[list[GrantLongFormSection]] = []
    generated = set[str]()

    while len(generated) < len(sections):
        if current_group := [
            section
            for section in sections
            if section["id"] not in generated and all(dep in generated for dep in section["depends_on"])
        ]:
            groups.append(current_group)
            generated.update(section["id"] for section in current_group)
            continue

        dependency_graph = {s["id"]: s["depends_on"] for s in sections}

        cycle_detected = False
        for section_id in [s["id"] for s in sections if s["id"] not in generated]:
            if cycle_nodes := detect_cycle(graph=dependency_graph, start=section_id):
                cycle_detected = True
                raise ValidationError(
                    "Circular dependency detected in section dependencies.",
                    context={
                        "generated": list(generated),
                        "remaining": [s["id"] for s in sections if s["id"] not in generated],
                        "dependency_graph": dependency_graph,
                        "cycle_nodes": list(cycle_nodes),
                        "cycle_path": " → ".join([*list(cycle_nodes), next(iter(cycle_nodes))]),
                        "recovery_instruction": "Break the circular dependency by removing one of these dependencies or reorganizing your sections.",
                    },
                )

        if not cycle_detected:
            raise ValidationError(
                "Missing sections in dependencies.",
                context={
                    "generated": list(generated),
                    "remaining": [s["id"] for s in sections if s["id"] not in generated],
                    "dependency_graph": dependency_graph,
                    "sections_with_unresolved_deps": {
                        s["id"]: [dep for dep in s["depends_on"] if dep not in generated]
                        for s in sections
                        if s["id"] not in generated and any(dep not in generated for dep in s["depends_on"])
                    },
                    "recovery_instruction": "Ensure all section IDs referenced in dependencies exist and there are no typos.",
                },
            )

    return groups


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
