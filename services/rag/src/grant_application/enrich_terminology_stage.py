from collections import defaultdict
from functools import lru_cache
from typing import Any, Final, TypedDict, cast

import httpx
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.retry import with_exponential_backoff_retry
from packages.shared_utils.src.tracing import start_span_with_trace_id

from services.rag.src.grant_application.dto import EnrichmentDataDTO, ObjectiveEnrichmentResponse
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

WIKIDATA_BASE_URL: Final[str] = "https://query.wikidata.org/sparql"
WIKIDATA_BATCH_SIZE: Final[int] = 5
WIKIDATA_TIMEOUT: Final[int] = 30
WIKIDATA_MAX_RETRIES: Final[int] = 3

_client_ref = Ref[httpx.AsyncClient]()


def get_wikimedia_client() -> httpx.AsyncClient:
    if _client_ref.value is None:
        _client_ref.value = httpx.AsyncClient(
            headers={"User-Agent": "GrantFlow.AI/1.0 (https://grantflow.ai)"},
            timeout=httpx.Timeout(WIKIDATA_TIMEOUT),
        )
    return _client_ref.value


class WikidataItem(TypedDict):
    item_id: str
    label: str
    description: str
    scientific_field: str


SCIENTIFIC_CONTEXT_TEMPLATE: Final[PromptTemplate] = PromptTemplate(
    name="scientific_context",
    template="""## Scientific Foundation Context
${scientific_context}

This context provides foundational scientific concepts and terminology relevant to the research objective. Use these terms and concepts to enhance the depth and accuracy of your response.""",
)


@lru_cache
def _build_sparql_query(terms: tuple[str, ...]) -> str:
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


@with_exponential_backoff_retry(httpx.HTTPError, httpx.TimeoutException, max_retries=WIKIDATA_MAX_RETRIES)
async def _make_request_with_retry(client: httpx.AsyncClient, query: str, trace_id: str) -> dict[str, Any]:
    with start_span_with_trace_id("wikidata_sparql_query", trace_id=trace_id) as span:
        span.set_attribute("query", query)

        params = {
            "query": query,
            "format": "json",
        }

        try:
            response = await client.get(WIKIDATA_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            logger.info(
                "Wikidata query successful",
                query_length=len(query),
                response_size=len(str(data)),
                trace_id=trace_id,
            )

            return cast("dict[str, Any]", data)
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                logger.warning(
                    "Wikidata service unavailable",
                    status_code=e.response.status_code,
                    trace_id=trace_id,
                )
                return {"results": {"bindings": []}}
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            logger.warning(
                "Wikidata network error",
                error=str(e),
                trace_id=trace_id,
            )
            return {"results": {"bindings": []}}


def _parse_wikidata_response(data: dict[str, Any]) -> list[WikidataItem]:
    results: list[WikidataItem] = []

    if "results" in data and "bindings" in data["results"]:
        for binding in data["results"]["bindings"]:
            result = WikidataItem(
                item_id=binding.get("item", {}).get("value", ""),
                label=binding.get("label", {}).get("value", ""),
                description=binding.get("description", {}).get("value", ""),
                scientific_field=binding.get("scientific_field", {}).get("value", ""),
            )
            results.append(result)

    return results


async def _expand_scientific_terms(terms: list[str], trace_id: str) -> list[WikidataItem]:
    if not terms:
        return []

    client = get_wikimedia_client()
    all_results: list[WikidataItem] = []
    for i in range(0, len(terms), WIKIDATA_BATCH_SIZE):
        batch = terms[i : i + WIKIDATA_BATCH_SIZE]

        with start_span_with_trace_id("wikidata_batch_expansion", trace_id=trace_id) as span:
            span.set_attribute("batch_size", len(batch))
            span.set_attribute("batch_index", i // WIKIDATA_BATCH_SIZE)

            try:
                query = _build_sparql_query(tuple(batch))
                response_data = await _make_request_with_retry(client, query, trace_id)
                batch_results = _parse_wikidata_response(response_data)
                all_results.extend(batch_results)

            except (httpx.HTTPError, httpx.TimeoutException) as e:
                logger.warning(
                    "Batch expansion failed - continuing with next batch",
                    batch=batch,
                    error=str(e),
                    trace_id=trace_id,
                )
                continue

    return all_results


async def _get_scientific_context(terms: list[str], trace_id: str) -> str:
    if not terms:
        return ""

    expanded_data = await _expand_scientific_terms(terms, trace_id)

    if not expanded_data:
        return ""

    field_groups: defaultdict[str, list[str]] = defaultdict(list)
    for item in expanded_data:
        field = item["scientific_field"] or "General Science"
        label = item["label"]
        if label:
            field_groups[field].append(label)

    context_parts = []
    for field, labels in field_groups.items():
        context_parts.append(f"**{field}:** {', '.join(labels)}")

    return "\n".join(context_parts)


async def enrich_objective_with_wikidata(
    enrichment_response: ObjectiveEnrichmentResponse,
    trace_id: str,
) -> EnrichmentDataDTO:
    try:
        all_terms = []
        all_terms.extend(enrichment_response["research_objective"]["terms"])

        for task in enrichment_response["research_tasks"]:
            all_terms.extend(task["terms"])

        unique_terms = sorted(set(all_terms))

        if not unique_terms:
            return {
                "enriched": "",
                "queries": [],
                "terms": [],
                "context": "",
                "instructions": "",
                "description": "",
                "questions": [],
            }

        scientific_context = await _get_scientific_context(unique_terms, trace_id)
        formatted_context = SCIENTIFIC_CONTEXT_TEMPLATE.to_string(scientific_context=scientific_context)

        return {
            "enriched": "",
            "queries": [],
            "terms": unique_terms,
            "context": formatted_context,
            "instructions": "",
            "description": "",
            "questions": [],
        }

    except (httpx.HTTPError, httpx.TimeoutException) as e:
        logger.warning(
            "Wikidata enrichment failed - returning empty context",
            error=str(e),
            trace_id=trace_id,
        )
        return EnrichmentDataDTO(
            enriched="",
            queries=[],
            terms=[],
            context="",
            instructions="",
            description="",
            questions=[],
        )
