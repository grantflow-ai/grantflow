from typing import Any, TypedDict, TypeGuard

from packages.db.src.json_objects import GrantElement, GrantLongFormSection

from services.rag.src.grant_application.dto import (
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
)


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


# Type guards for validating checkpoint DTO structures


def is_grant_long_form_section(value: Any) -> bool:
    """Validate GrantLongFormSection structure."""
    if not isinstance(value, dict):
        return False

    required_fields = {
        "id",
        "order",
        "title",
        "evidence",
        "parent_id",
        "depends_on",
        "generation_instructions",
        "is_clinical_trial",
        "is_detailed_research_plan",
        "keywords",
        "max_words",
        "search_queries",
        "topics",
    }

    return all(field in value for field in required_fields)


def is_extract_relationships_dto(checkpoint: Any) -> TypeGuard[ExtractRelationshipsStageDTO]:
    """Validate ExtractRelationshipsStageDTO structure."""
    if not isinstance(checkpoint, dict):
        return False

    # Check required fields
    if "work_plan_section" not in checkpoint or "relationships" not in checkpoint:
        return False

    # Validate work_plan_section structure
    if not is_grant_long_form_section(checkpoint["work_plan_section"]):
        return False

    # Validate relationships structure (dict mapping str to list of tuples)
    relationships = checkpoint["relationships"]
    if not isinstance(relationships, dict):
        return False

    for key, value in relationships.items():
        if not isinstance(key, str):
            return False
        if not isinstance(value, list):
            return False
        for item in value:
            if not isinstance(item, (list, tuple)) or len(item) != 2:
                return False
            if not isinstance(item[0], str) or not isinstance(item[1], str):
                return False

    return True


def is_enrichment_data_dto(value: Any) -> bool:
    """Validate EnrichmentDataDTO structure."""
    if not isinstance(value, dict):
        return False

    required_fields = {
        "enriched",
        "queries",
        "terms",
        "context",
        "instructions",
        "description",
        "questions",
    }

    if not all(field in value for field in required_fields):
        return False

    # Validate list fields
    for list_field in ["queries", "terms", "questions"]:
        if not isinstance(value[list_field], list):
            return False
        if not all(isinstance(item, str) for item in value[list_field]):
            return False

    # Validate string fields
    for str_field in ["enriched", "context", "instructions", "description"]:
        if not isinstance(value[str_field], str):
            return False

    return True


def is_objective_enrichment_response(value: Any) -> bool:
    """Validate ObjectiveEnrichmentResponse structure."""
    if not isinstance(value, dict):
        return False

    if "research_objective" not in value or "research_tasks" not in value:
        return False

    if not is_enrichment_data_dto(value["research_objective"]):
        return False

    if not isinstance(value["research_tasks"], list):
        return False

    return all(is_enrichment_data_dto(task) for task in value["research_tasks"])


def is_enrich_objectives_dto(checkpoint: Any) -> TypeGuard[EnrichObjectivesStageDTO]:
    """Validate EnrichObjectivesStageDTO structure."""
    if not isinstance(checkpoint, dict):
        return False

    # First check if it's a valid ExtractRelationshipsStageDTO
    if not is_extract_relationships_dto(checkpoint):
        return False

    # Check for enrichment_responses field
    if "enrichment_responses" not in checkpoint:
        return False

    enrichment_responses = checkpoint["enrichment_responses"]  # type: ignore[typeddict-item]
    if not isinstance(enrichment_responses, list):
        return False

    return all(is_objective_enrichment_response(resp) for resp in enrichment_responses)


def is_enrich_terminology_dto(checkpoint: Any) -> TypeGuard[EnrichTerminologyStageDTO]:
    """Validate EnrichTerminologyStageDTO structure."""
    if not isinstance(checkpoint, dict):
        return False

    # First check if it's a valid EnrichObjectivesStageDTO
    if not is_enrich_objectives_dto(checkpoint):
        return False

    # Check for wikidata_enrichments field
    if "wikidata_enrichments" not in checkpoint:
        return False

    wikidata_enrichments = checkpoint["wikidata_enrichments"]  # type: ignore[typeddict-item]
    if not isinstance(wikidata_enrichments, list):
        return False

    return all(is_enrichment_data_dto(enrichment) for enrichment in wikidata_enrichments)


def is_generate_research_plan_dto(checkpoint: Any) -> TypeGuard[GenerateResearchPlanStageDTO]:
    """Validate GenerateResearchPlanStageDTO structure."""
    if not isinstance(checkpoint, dict):
        return False

    # First check if it's a valid EnrichTerminologyStageDTO
    if not is_enrich_terminology_dto(checkpoint):
        return False

    # Check for research_plan_text field
    if "research_plan_text" not in checkpoint:
        return False

    return isinstance(checkpoint["research_plan_text"], str)  # type: ignore[typeddict-item]


def is_section_text(value: Any) -> bool:
    """Validate SectionText structure."""
    if not isinstance(value, dict):
        return False

    if "section_id" not in value or "text" not in value:
        return False

    return isinstance(value["section_id"], str) and isinstance(value["text"], str)


def is_generate_sections_dto(checkpoint: Any) -> TypeGuard[GenerateSectionsStageDTO]:
    """Validate GenerateSectionsStageDTO structure."""
    if not isinstance(checkpoint, dict):
        return False

    # First check if it's a valid GenerateResearchPlanStageDTO
    if not is_generate_research_plan_dto(checkpoint):
        return False

    # Check for section_texts field
    if "section_texts" not in checkpoint:
        return False

    section_texts = checkpoint["section_texts"]  # type: ignore[typeddict-item]
    if not isinstance(section_texts, list):
        return False

    return all(is_section_text(section) for section in section_texts)
