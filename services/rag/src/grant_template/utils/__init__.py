from typing import TypedDict

from packages.shared_utils.src.dto import ExtractedCFPData
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError

from services.rag.src.constants import MAX_CHUNK_SIZE, MAX_SOURCE_SIZE, NUM_CHUNKS
from services.rag.src.grant_template.utils.category_extraction import (
    CategorizationAnalysisResult,
    format_nlp_hints_for_extraction,
)
from services.rag.src.utils.text_processing import sanitize_text_content


class RagSourceData(TypedDict):
    source_id: str
    source_type: str
    text_content: str
    chunks: list[str]
    nlp_analysis: CategorizationAnalysisResult


def detect_cycle(
    graph: dict[str, list[str]],
    start: str,
    visited: set[str] | None = None,
    path: set[str] | None = None,
    path_list: list[str] | None = None,
) -> set[str]:
    if visited is None:
        visited = set()

    if path is None:
        path = set()

    if path_list is None:
        path_list = []

    if start in path:
        cycle_start_idx = path_list.index(start)
        return set(path_list[cycle_start_idx:])

    if start in visited:
        return set()

    path.add(start)
    path_list.append(start)

    cycle_nodes = set()
    for neighbor in graph.get(start, []):
        if found_cycle := detect_cycle(graph, neighbor, visited, path, path_list):
            cycle_nodes.update(found_cycle)
            break

    path_list.pop()
    path.remove(start)
    visited.add(start)

    return cycle_nodes


def format_rag_sources_for_prompt(rag_sources: list[RagSourceData]) -> str:
    formatted_sources = []

    for i, source in enumerate(rag_sources):
        source_section = f"### Source {i}: {source['source_type'].upper()} (ID: {source['source_id']})\n\n"

        nlp_analysis = source["nlp_analysis"]
        formatted_nlp = format_nlp_hints_for_extraction(nlp_analysis)
        if formatted_nlp:
            source_section += f"#### NLP Hints:\n{formatted_nlp}\n\n"

        sanitized_content = sanitize_text_content(source["text_content"])
        source_section += "#### Full Content:\n"
        source_section += (
            f"{sanitized_content[:MAX_SOURCE_SIZE]}{'...' if len(sanitized_content) > MAX_SOURCE_SIZE else ''}\n\n"
        )

        source_section += "#### Key Chunks:\n"
        for j, chunk in enumerate(source["chunks"][:NUM_CHUNKS]):
            sanitized_chunk = sanitize_text_content(chunk)
            source_section += (
                f"{j}. {sanitized_chunk[:MAX_CHUNK_SIZE]}{'...' if len(sanitized_chunk) > MAX_CHUNK_SIZE else ''}\n"
            )

        formatted_sources.append(source_section)

    return "\n".join(formatted_sources)


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(
                error,
                context={
                    "subject": response.get("subject", ""),
                    "org_id": response.get("org_id"),
                    "recovery_instruction": "The CFP content appears to be insufficient or unclear. Try extracting more specific guidelines or requirements from all available sources.",
                },
            )
        raise ValidationError(
            "No content extracted from any source. Please provide an error message.",
            context={
                "subject": response.get("subject", ""),
                "org_id": response.get("org_id"),
                "recovery_instruction": "Extract at least 3-5 relevant guidelines or requirements from the available RAG sources, or provide a specific error message.",
            },
        )
