from typing import Any, Final, TypedDict, cast

import httpx
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.retry import with_exponential_backoff_retry
from packages.shared_utils.src.tracing import start_span_with_trace_id

from services.rag.src.grant_application.dto import EnrichmentDataDTO, ObjectiveEnrichmentResponse
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

WIKIDATA_API_URL: Final[str] = "https://www.wikidata.org/w/api.php"
WIKIDATA_BATCH_SIZE: Final[int] = 10
WIKIDATA_TIMEOUT: Final[int] = 10
WIKIDATA_MAX_RETRIES: Final[int] = 3
WIKIDATA_SEARCH_LIMIT: Final[int] = 3

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


async def _search_entity_by_label(client: httpx.AsyncClient, term: str, trace_id: str) -> list[dict[str, Any]]:
    with start_span_with_trace_id("wikidata_search_entity", trace_id=trace_id) as span:
        span.set_attribute("search_term", term)

        params: dict[str, str | int] = {
            "action": "wbsearchentities",
            "search": term,
            "language": "en",
            "type": "item",
            "limit": WIKIDATA_SEARCH_LIMIT,
            "format": "json",
        }

        try:
            response = await client.get(WIKIDATA_API_URL, params=params)
            response.raise_for_status()
            data = response.json()

            results = data.get("search", [])
            logger.debug(
                "Wikidata entity search successful",
                term=term,
                results_count=len(results),
                trace_id=trace_id,
            )

            return cast("list[dict[str, Any]]", results)

        except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.NetworkError) as e:
            logger.warning(
                "Wikidata entity search failed",
                term=term,
                error=str(e),
                trace_id=trace_id,
            )
            return []


@with_exponential_backoff_retry(httpx.HTTPError, httpx.TimeoutException, max_retries=WIKIDATA_MAX_RETRIES)
async def _get_entity_details(client: httpx.AsyncClient, entity_ids: list[str], trace_id: str) -> dict[str, Any]:
    with start_span_with_trace_id("wikidata_get_entities", trace_id=trace_id) as span:
        span.set_attribute("entity_count", len(entity_ids))

        params: dict[str, str] = {
            "action": "wbgetentities",
            "ids": "|".join(entity_ids[:50]),
            "props": "descriptions|labels",
            "languages": "en",
            "format": "json",
        }

        try:
            response = await client.get(WIKIDATA_API_URL, params=params)
            response.raise_for_status()
            data = response.json()

            logger.info(
                "Wikidata entity details retrieved",
                entity_count=len(entity_ids),
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
                return {"entities": {}}
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            logger.warning(
                "Wikidata network error",
                error=str(e),
                trace_id=trace_id,
            )
            return {"entities": {}}


def _parse_entity_details(data: dict[str, Any]) -> list[WikidataItem]:
    results: list[WikidataItem] = []

    entities = data.get("entities", {})
    for entity_id, entity in entities.items():
        label = entity.get("labels", {}).get("en", {}).get("value", "")
        description = entity.get("descriptions", {}).get("en", {}).get("value", "")

        if label and description:
            result = WikidataItem(
                item_id=entity_id,
                label=label,
                description=description,
                scientific_field="",
            )
            results.append(result)

    return results


async def _expand_scientific_terms(terms: list[str], trace_id: str) -> list[WikidataItem]:
    if not terms:
        return []

    client = get_wikimedia_client()

    entity_ids: list[str] = []
    for term in terms:
        try:
            search_results = await _search_entity_by_label(client, term, trace_id)
            for result in search_results[:2]:
                entity_id = result.get("id")
                if entity_id:
                    entity_ids.append(entity_id)
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.warning(
                "Entity search failed for term - continuing",
                term=term,
                error=str(e),
                trace_id=trace_id,
            )
            continue

    if not entity_ids:
        return []

    all_results: list[WikidataItem] = []
    for i in range(0, len(entity_ids), 50):
        batch = entity_ids[i : i + 50]

        with start_span_with_trace_id("wikidata_batch_details", trace_id=trace_id) as span:
            span.set_attribute("batch_size", len(batch))
            span.set_attribute("batch_index", i // 50)

            try:
                details_data = await _get_entity_details(client, batch, trace_id)
                batch_results = _parse_entity_details(details_data)
                all_results.extend(batch_results)

            except (httpx.HTTPError, httpx.TimeoutException) as e:
                logger.warning(
                    "Batch details retrieval failed - continuing with next batch",
                    batch_size=len(batch),
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

    context_parts = []
    for item in expanded_data:
        label = item["label"]
        description = item["description"]
        if label and description:
            context_parts.append(f"**{label}**: {description}")

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
