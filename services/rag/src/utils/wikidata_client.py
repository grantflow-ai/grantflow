import asyncio
import logging
from typing import Any

import httpx
from packages.shared_utils.src.tracing import start_span_with_trace_id

logger = logging.getLogger(__name__)

# Constants instead of environment variables
WIKIDATA_BASE_URL = "https://query.wikidata.org/sparql"
WIKIDATA_BATCH_SIZE = 5
WIKIDATA_TIMEOUT = 30
WIKIDATA_MAX_RETRIES = 3


def _build_sparql_query(terms: list[str]) -> str:
    """Build SPARQL query for scientific term expansion."""
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


async def _make_request_with_retry(client: httpx.AsyncClient, query: str, trace_id: str | None = None) -> Any:
    """Make SPARQL request with exponential backoff retry logic."""
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
                    extra={
                        "query_length": len(query),
                        "response_size": len(str(data)),
                        "attempt": attempt + 1,
                        "trace_id": trace_id,
                    },
                )

                return data

        except httpx.HTTPError as e:
            logger.warning(
                "Wikidata request failed",
                extra={
                    "error": str(e),
                    "attempt": attempt + 1,
                    "max_retries": WIKIDATA_MAX_RETRIES,
                    "trace_id": trace_id,
                },
            )

            if attempt == WIKIDATA_MAX_RETRIES - 1:
                raise

            wait_time = 2**attempt
            await asyncio.sleep(wait_time)

    raise RuntimeError(f"Failed after {WIKIDATA_MAX_RETRIES} attempts")


def _parse_wikidata_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse Wikidata SPARQL response into structured format."""
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


async def expand_scientific_terms(terms: list[str], trace_id: str | None = None) -> list[dict[str, Any]]:
    """Expand scientific terms using Wikidata knowledge base."""
    if not terms:
        return []

    logger.info(
        "Expanding scientific terms",
        extra={
            "term_count": len(terms),
            "batch_size": WIKIDATA_BATCH_SIZE,
            "trace_id": trace_id,
        },
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
                        extra={
                            "batch_size": len(batch),
                            "results_count": len(batch_results),
                            "trace_id": trace_id,
                        },
                    )

                except Exception as e:
                    logger.error(
                        "Batch expansion failed",
                        extra={
                            "batch": batch,
                            "error": str(e),
                            "trace_id": trace_id,
                        },
                    )
                    continue

        return all_results


async def get_scientific_context(terms: list[str], trace_id: str | None = None) -> str:
    """Generate scientific context from expanded terms."""
    if not terms:
        return ""

    expanded_data = await expand_scientific_terms(terms, trace_id)

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
