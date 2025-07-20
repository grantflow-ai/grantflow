import asyncio
import logging
from typing import Any

import aiohttp
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.tracing import start_span_with_trace_id

logger = logging.getLogger(__name__)


class WikidataClient:
    """Async client for Wikidata SPARQL queries with batch processing and retry logic."""

    def __init__(self) -> None:
        self.base_url = get_env("WIKIDATA_BASE_URL", fallback="https://query.wikidata.org/sparql")
        self.batch_size = int(get_env("WIKIDATA_BATCH_SIZE", fallback="5"))
        self.timeout = int(get_env("WIKIDATA_TIMEOUT", fallback="30"))
        self.max_retries = int(get_env("WIKIDATA_MAX_RETRIES", fallback="3"))
        self.session: aiohttp.ClientSession | None = None

    async def __aenter__(self) -> "WikidataClient":
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout),
            headers={"User-Agent": "GrantFlow.AI/1.0 (https://grantflow.ai)"},
        )
        return self

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    def _build_sparql_query(self, terms: list[str]) -> str:
        """Build SPARQL query for scientific term expansion."""
        # Escape and quote terms for SPARQL
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

    async def _make_request_with_retry(self, query: str, trace_id: str | None = None) -> Any:
        """Make SPARQL request with exponential backoff retry logic."""
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")

        for attempt in range(self.max_retries):
            try:
                with start_span_with_trace_id("wikidata_sparql_query", trace_id=trace_id) as span:
                    span.set_attribute("query", query)
                    span.set_attribute("attempt", attempt + 1)

                    params = {
                        "query": query,
                        "format": "json",
                    }

                    async with self.session.get(self.base_url, params=params) as response:
                        response.raise_for_status()
                        data = await response.json()

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

            except aiohttp.ClientError as e:
                logger.warning(
                    "Wikidata request failed",
                    extra={
                        "error": str(e),
                        "attempt": attempt + 1,
                        "max_retries": self.max_retries,
                        "trace_id": trace_id,
                    },
                )

                if attempt == self.max_retries - 1:
                    raise

                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2**attempt
                await asyncio.sleep(wait_time)

        raise RuntimeError(f"Failed after {self.max_retries} attempts")

    async def _parse_wikidata_response(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        """Parse Wikidata SPARQL response into structured format."""
        # TODO: Implement response parsing logic
        # This is a stub that will be fleshed out in later commits
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

    async def expand_scientific_terms(self, terms: list[str], trace_id: str | None = None) -> list[dict[str, Any]]:
        """Expand scientific terms using Wikidata knowledge base."""
        if not terms:
            return []

        logger.info(
            "Expanding scientific terms",
            extra={
                "term_count": len(terms),
                "batch_size": self.batch_size,
                "trace_id": trace_id,
            },
        )

        # Process terms in batches
        all_results = []
        for i in range(0, len(terms), self.batch_size):
            batch = terms[i : i + self.batch_size]

            with start_span_with_trace_id("wikidata_batch_expansion", trace_id=trace_id) as span:
                span.set_attribute("batch_size", len(batch))
                span.set_attribute("batch_index", i // self.batch_size)

                try:
                    query = self._build_sparql_query(batch)
                    response_data = await self._make_request_with_retry(query, trace_id)
                    batch_results = await self._parse_wikidata_response(response_data)
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
                    # Continue with other batches even if one fails
                    continue

        return all_results

    async def get_scientific_context(self, terms: list[str], trace_id: str | None = None) -> str:
        """Generate scientific context from expanded terms."""
        if not terms:
            return ""

        expanded_data = await self.expand_scientific_terms(terms, trace_id)

        if not expanded_data:
            return ""

        # Group by scientific field for better organization
        field_groups: dict[str, list[str]] = {}
        for item in expanded_data:
            field = item.get("scientific_field", "General Science")
            label = item.get("label", "")
            if label:
                if field not in field_groups:
                    field_groups[field] = []
                field_groups[field].append(label)

        # Build context string
        context_parts = []
        for field, labels in field_groups.items():
            context_parts.append(f"**{field}:** {', '.join(labels)}")

        return "\n".join(context_parts)
