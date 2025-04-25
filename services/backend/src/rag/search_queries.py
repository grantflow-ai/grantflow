from textwrap import dedent
from typing import Any, Final, NotRequired, TypedDict

from packages.shared_utils.src.embeddings import get_embedding_model
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize
from sentence_transformers import util
from services.backend.src.constants import EVALUATION_MODEL
from services.backend.src.rag.completion import handle_completions_request
from services.backend.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a Retrieval-Augmented Generation (RAG) pipeline designed to assist in writing grant application sections.
Your primary function is to generate search queries that will retrieve relevant content from a vector store using cosine similarity.
"""

DIVERSE_SEARCH_QUERIES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="search_queries_generation",
    template="""
    Here is the user prompt for the next stage of the RAG pipeline:

    <user_prompt>
    ${user_prompt}
    </user_prompt>

    Your task is to generate between 3 and 10 highly diverse search queries based on this user prompt.
    These queries will be executed against the vector store to retrieve relevant information for the grant application section.

    Instructions:
    1. Analyze the user prompt carefully to understand the context and requirements of the grant application section.
    2. Generate search queries that balance specificity with breadth to capture a range of relevant materials.
    3. Ensure that the queries are optimized for the next task in the RAG pipeline, which involves retrieving and processing the relevant information.
    4. Ensure maximum diversity by creating queries that cover different:
       - Aspects of the topic (methodological, theoretical, practical, etc.)
       - Semantic angles (using different terminology for similar concepts)
       - Levels of specificity (broad concepts and specific details)
       - Query types (factual, conceptual, procedural, comparative)

    Before providing your final output, wrap your thought process in <query_generation_process> tags. Follow these steps:
    1. List the key concepts or themes in the user prompt.
    2. Identify specific terminology that might be relevant to the grant application.
    3. Brainstorm different aspects of the topic that could be covered in separate queries.
    4. Consider potential synonyms or related terms that could broaden the search.
    5. Generate initial queries based on steps 1-4.
    6. Evaluate each generated query for relevance, effectiveness, and DIVERSITY from other queries.
    7. Ensure queries are not semantically similar to each other and cover distinct aspects.

    It's OK for this section to be quite long, as thorough consideration will lead to better queries.

    After your thought process, provide your final output as a JSON object strictly adhering to the following structure:

    ```json
    {
        "queries": [
            {
                "text": "Query 1",
                "type": "factual|conceptual|procedural|comparative",
                "aspect": "brief description of what aspect this query covers"
            },
            {
                "text": "Query 2",
                "type": "factual|conceptual|procedural|comparative",
                "aspect": "brief description of what aspect this query covers"
            },
            // Additional queries as needed, up to 10
        ]
    }
    ```

    Ensure that you generate at least 3 queries and no more than 10 queries. Each query should be designed to retrieve distinct, relevant information from the vector store.""",
)


class QueryInfo(TypedDict):
    text: str
    type: str
    aspect: str


class DiverseQueryResponse(TypedDict):
    queries: list[QueryInfo]


class QueryResult(TypedDict):
    query: str
    type: NotRequired[str]
    aspect: NotRequired[str]


response_schema = {
    "type": "object",
    "properties": {
        "queries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "type": {"type": "string", "enum": ["factual", "conceptual", "procedural", "comparative"]},
                    "aspect": {"type": "string"},
                },
                "required": ["text", "type", "aspect"],
            },
            "minItems": 3,
            "maxItems": 10,
        },
    },
    "required": ["queries"],
}


SIMILARITY_THRESHOLD: Final[float] = 0.85


async def deduplicate_queries(queries: list[str]) -> list[str]:
    if len(queries) <= 1:
        return queries

    model = get_embedding_model()
    embeddings = model.encode(queries, convert_to_tensor=True)

    keep_indices = set(range(len(queries)))
    removed = set()

    for i in range(len(queries)):
        if i in removed:
            continue

        for j in range(i + 1, len(queries)):
            if j in removed:
                continue

            similarity = util.pytorch_cos_sim(
                embeddings[i] if isinstance(embeddings, list) else embeddings[i, :],
                embeddings[j] if isinstance(embeddings, list) else embeddings[j, :],
            ).item()

            if similarity > SIMILARITY_THRESHOLD:
                if len(queries[i]) >= len(queries[j]):
                    keep_indices.discard(j)
                    removed.add(j)
                else:
                    keep_indices.discard(i)
                    removed.add(i)
                    break

    return [queries[i] for i in sorted(keep_indices)]


async def handle_create_search_queries(*, user_prompt: str | PromptTemplate, **kwargs: Any) -> list[str]:
    messages = [DIVERSE_SEARCH_QUERIES_USER_PROMPT.to_string(user_prompt=str(user_prompt))]
    if kwargs:
        messages.append(
            dedent(f"""
        Here are additional values to factor in - these values should be regarded as metadata for the task.

        {serialize(kwargs).decode()}
        """)
        )

    query_results: list[QueryResult] = []
    attempts = 0
    max_attempts = 3

    while len(query_results) < 3 and attempts < max_attempts:
        attempts += 1
        response = await handle_completions_request(
            prompt_identifier="diverse_search_queries",
            system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT,
            messages=messages,
            response_schema=response_schema,
            response_type=DiverseQueryResponse,
            model=EVALUATION_MODEL,
        )

        current_query_texts = [q["text"] for q in response["queries"]]
        existing_query_texts = [q["query"] for q in query_results]

        if existing_query_texts:
            deduplicated_texts = await deduplicate_queries(existing_query_texts + current_query_texts)

            new_query_texts = [q for q in deduplicated_texts if q not in existing_query_texts]
        else:
            new_query_texts = await deduplicate_queries(current_query_texts)

        query_results.extend(
            [
                {"query": q["text"], "type": q["type"], "aspect": q["aspect"]}
                for q in response["queries"]
                if q["text"] in new_query_texts
            ]
        )

        if not new_query_texts and len(query_results) < 3:
            messages.append(
                dedent(f"""
            The queries you've generated are too similar to these existing queries:
            {existing_query_texts}

            Please generate completely different queries covering other aspects of the topic.
            """)
            )

    final_queries = [q["query"] for q in query_results]

    query_types = [q.get("type", "unknown") for q in query_results]
    logger.info("Generated diverse search queries", query_count=len(final_queries), query_types=query_types)

    return final_queries[:10]
