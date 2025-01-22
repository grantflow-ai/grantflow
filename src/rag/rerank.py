from typing import Final, TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.db.tables import TextVector
from src.exceptions import ValidationError
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

RERANKING_SYSTEM_PROMPT: Final[str] = """
You are a specialized reranking component within a RAG pipeline for grant application text generation.
"""

RERANKING_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="batch_reranking",
    template="""
Your task is to analyze multiple documents and return an ordered list of document ids
based on their relevance to the queries and task.

Analyze and rank the following documents based on their relevance to the queries and user prompt:

1. The queries:
    <queries>
    ${queries}
    </queries>

2. The user prompt:
    <user_prompt>
    ${user_prompt}
    </user_prompt>

3. The documents to be ranked:
    <documents>
    ${documents}
    </documents>

Follow these steps to complete the task:

1. Analyze each document in relation to the queries and user prompt.
2. Evaluate each document based on the following criteria:
   a. Query relevance: Direct correspondence to the queries' content
   b. Technical depth: Substantive technical or scientific content
   c. Prompt task fit: Relevance for the text generation task in the user prompt
3. Rank the documents based on your evaluation.
4. Validate that your response includes only valid document IDs.

Respond to the provided tool using a JSON object adhereing to the following format:

```jsonc
{
    "reranked_document_ids": [
        5, 3, 1, // ... etc. this array must contain the document IDs in the order of relevance
    ],
}
```
""",
)


class RerankingToolResponse(TypedDict):
    """Response from batch reranking."""

    reranked_document_ids: list[int]


RERANKING_SCHEMA = {
    "type": "object",
    "properties": {
        "reranked_document_ids": {
            "type": "array",
            "items": {"type": "integer", "minimum": 1},
        },
    },
    "required": ["reranked_document_ids"],
}


async def rerank_vectors(*, vectors: list[TextVector], queries: list[str], user_prompt: str) -> list[TextVector]:
    """Rerank vectors based on content relevance.

    Args:
        vectors: List of vectors to rerank
        queries: The queries to rerank against
        user_prompt: The user prompt for the reranking task

    Returns:
        Reranked list of vectors
    """
    documents = [
        {
            "document_id": idx + 1,
            "content": vector.chunk["content"],
            "element_type": vector.chunk.get("element_type"),
            "role": vector.chunk.get("role"),
        }
        for idx, vector in enumerate(vectors)
    ]

    def validator(tool_response: RerankingToolResponse) -> None:
        document_ids = {d["document_id"] for d in documents}

        if invalid_ids := [i for i in tool_response["reranked_document_ids"] if i not in document_ids]:
            raise ValidationError(
                "Response includes invalid IDs that do not correspond with the provided documents.",
                context={
                    "source_ids": document_ids,
                    "invalid_ids": invalid_ids,
                },
            )

    response = await handle_completions_request(
        prompt_identifier="batch_reranking",
        system_prompt=RERANKING_SYSTEM_PROMPT,
        response_schema=RERANKING_SCHEMA,
        response_type=RerankingToolResponse,
        model=FAST_TEXT_GENERATION_MODEL,
        messages=RERANKING_USER_PROMPT.to_string(queries=queries, documents=documents, user_prompt=user_prompt),
        validator=validator,
    )

    reranked_document_ids = response["reranked_document_ids"]
    logger.info("Reranked documents", num_docs=len(vectors), reranked_document_ids=reranked_document_ids)
    return [vectors[i - 1] for i in reranked_document_ids]
