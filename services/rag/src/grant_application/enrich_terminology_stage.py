"""Wikidata terminology enrichment stage for grant applications.

This module handles the enrichment of scientific terminology using Wikidata,
providing additional scientific context for grant applications.
"""

import asyncio
from typing import Any, Final

import httpx
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.tracing import start_span_with_trace_id

from services.rag.src.grant_application.dto import EnrichmentDataDTO, ObjectiveEnrichmentResponse
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

WIKIDATA_BASE_URL: Final[str] = "https://query.wikidata.org/sparql"
WIKIDATA_BATCH_SIZE: Final[int] = 5
WIKIDATA_TIMEOUT: Final[int] = 30
WIKIDATA_MAX_RETRIES: Final[int] = 3

SCIENTIFIC_CONTEXT_TEMPLATE: Final[PromptTemplate] = PromptTemplate(
    name="scientific_context",
    template="""## Scientific Foundation Context
${scientific_context}

This context provides foundational scientific concepts and terminology relevant to the research objective. Use these terms and concepts to enhance the depth and accuracy of your response.""",
)


def _build_sparql_query(terms: list[str]) -> str:
    """Build a SPARQL query for Wikidata to expand scientific terms."""
    quoted_terms = [f'"{term}"' for term in terms]
    terms_filter = " || ".join([f"?label = {term}" for term in quoted_terms])

    return f"""
    SELECT DISTINCT ?item ?label ?description ?scientific_field
    WHERE {{
        ?item rdfs:label ?label .
        FILTER({terms_filter})
        FILTER(LANG(?label) = "en")

        OPTIONAL {{
            ?item schema:description ?description .
            FILTER(LANG(?description) = "en")
        }}

        OPTIONAL {{
            ?item wdt:P31 ?type .
            ?type rdfs:label ?scientific_field .
            FILTER(LANG(?scientific_field) = "en")
            FILTER(CONTAINS(LCASE(?scientific_field), "scientific") ||
                   CONTAINS(LCASE(?scientific_field), "research") ||
                   CONTAINS(LCASE(?scientific_field), "study"))
        }}
    }}
    LIMIT 100
    """


async def _make_request_with_retry(client: httpx.AsyncClient, query: str, trace_id: str) -> Any:
    """Make a request to Wikidata with retry logic."""
    for attempt in range(WIKIDATA_MAX_RETRIES):
        try:
            with start_span_with_trace_id("wikidata_sparql_query", trace_id=trace_id) as span:
                span.set_attribute("query", query)
                span.set_attribute("attempt", attempt + 1)

                params = {
                    "query": query,
                    "format": "json",
                }

                response = await client.get(WIKIDATA_BASE_URL, params=params, timeout=WIKIDATA_TIMEOUT)
                response.raise_for_status()
                data = response.json()

                logger.info(
                    "Wikidata query successful",
                    query_length=len(query),
                    response_size=len(str(data)),
                    attempt=attempt + 1,
                    trace_id=trace_id,
                )

                return data

        except httpx.HTTPError as e:
            logger.warning(
                "Wikidata request failed",
                error=str(e),
                attempt=attempt + 1,
                max_retries=WIKIDATA_MAX_RETRIES,
                trace_id=trace_id,
            )

            if attempt == WIKIDATA_MAX_RETRIES - 1:
                raise

            wait_time = 2**attempt
            await asyncio.sleep(wait_time)

    raise RuntimeError(f"Failed after {WIKIDATA_MAX_RETRIES} attempts")


def _parse_wikidata_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse the Wikidata SPARQL response."""
    results = []

    if "results" in data and "bindings" in data["results"]:
        for binding in data["results"]["bindings"]:
            result = {
                "item_id": binding.get("item", {}).get("value", ""),
                "label": binding.get("label", {}).get("value", ""),
                "description": binding.get("description", {}).get("value", ""),
                "scientific_field": binding.get("scientific_field", {}).get("value", ""),
            }
            results.append(result)

    return results


async def _expand_scientific_terms(terms: list[str], trace_id: str) -> list[dict[str, Any]]:
    """Expand scientific terms using Wikidata."""
    if not terms:
        return []

    logger.info(
        "Expanding scientific terms",
        term_count=len(terms),
        batch_size=WIKIDATA_BATCH_SIZE,
        trace_id=trace_id,
    )

    async with httpx.AsyncClient(headers={"User-Agent": "GrantFlow.AI/1.0 (https://grantflow.ai)"}) as client:
        all_results = []
        for i in range(0, len(terms), WIKIDATA_BATCH_SIZE):
            batch = terms[i : i + WIKIDATA_BATCH_SIZE]

            with start_span_with_trace_id("wikidata_batch_expansion", trace_id=trace_id) as span:
                span.set_attribute("batch_size", len(batch))
                span.set_attribute("batch_index", i // WIKIDATA_BATCH_SIZE)

                try:
                    query = _build_sparql_query(batch)
                    response_data = await _make_request_with_retry(client, query, trace_id)
                    batch_results = _parse_wikidata_response(response_data)
                    all_results.extend(batch_results)

                    logger.info(
                        "Batch expansion completed",
                        batch_size=len(batch),
                        results_count=len(batch_results),
                        trace_id=trace_id,
                    )

                except Exception as e:
                    logger.error(
                        "Batch expansion failed",
                        batch=batch,
                        error=str(e),
                        trace_id=trace_id,
                    )
                    continue

        return all_results


async def _get_scientific_context(terms: list[str], trace_id: str) -> str:
    """Get scientific context for a list of terms from Wikidata."""
    if not terms:
        return ""

    expanded_data = await _expand_scientific_terms(terms, trace_id)

    if not expanded_data:
        return ""

    field_groups: dict[str, list[str]] = {}
    for item in expanded_data:
        field = item.get("scientific_field", "General Science")
        label = item.get("label", "")
        if label:
            if field not in field_groups:
                field_groups[field] = []
            field_groups[field].append(label)

    context_parts = []
    for field, labels in field_groups.items():
        context_parts.append(f"**{field}:** {', '.join(labels)}")

    return "\n".join(context_parts)


def _format_scientific_context(scientific_context: str) -> str:
    """Format scientific context using the template."""
    if not scientific_context:
        return ""

    try:
        formatted_context = SCIENTIFIC_CONTEXT_TEMPLATE.to_string(scientific_context=scientific_context)

        logger.info(
            "Scientific context formatted successfully",
            context_length=len(scientific_context),
            formatted_length=len(formatted_context),
        )

        return formatted_context

    except Exception as e:
        logger.error(
            "Failed to format scientific context",
            error=str(e),
            context_length=len(scientific_context),
        )
        return scientific_context


async def enrich_objective_with_wikidata(
    enrichment_response: ObjectiveEnrichmentResponse,
    trace_id: str,
) -> EnrichmentDataDTO:
    """Enrich a research objective with Wikidata scientific context.

    This is the main entry point for the Wikidata enrichment stage.
    """
    try:
        all_terms = []
        all_terms.extend(enrichment_response["research_objective"]["core_scientific_terms"])

        for task in enrichment_response["research_tasks"]:
            all_terms.extend(task["core_scientific_terms"])

        unique_terms = list(dict.fromkeys(all_terms))

        if not unique_terms:
            return {
                "enriched_objective": "",
                "search_queries": [],
                "core_scientific_terms": [],
                "scientific_context": "",
            }

        scientific_context = await _get_scientific_context(unique_terms, trace_id)
        formatted_context = _format_scientific_context(scientific_context)

        return {
            "enriched_objective": "",
            "search_queries": [],
            "core_scientific_terms": unique_terms,
            "scientific_context": formatted_context,
        }

    except Exception as e:
        logger.error(
            "Failed to enrich objective with Wikidata",
            error=str(e),
            trace_id=trace_id,
        )
        return {
            "enriched_objective": "",
            "search_queries": [],
            "core_scientific_terms": [],
            "scientific_context": "",
        }
