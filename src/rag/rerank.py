from textwrap import dedent
from typing import Final, TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.db.tables import TextVector
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

RERANKING_SYSTEM_PROMPT: Final[str] = """
You are a specialized reranking component within a RAG pipeline for STEM grant applications.
Your task is to analyze multiple documents and return an ordered list of document indices
based on their relevance to the query. Focus on technical accuracy and relevance to grant-writing contexts.
"""

RERANKING_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="batch_reranking",
    template="""
Analyze and rank the following documents based on their relevance to the query.

<query>
${query}
</query>

<documents>
${documents}
</documents>

Evaluation criteria:
1. Query relevance: Direct correspondence to the query content
2. Technical depth: Substantive technical or scientific content
3. Grant context fit: Relevance for grant writing purposes

Return a JSON array of document indices in order of highest to lowest relevance. Use zero-based indexing.
The array should include all document indices exactly once.

Example response format:
```json
{
    "ranked_indices": [2, 0, 1, 3],
    "reasoning": [
        {
            "index": 2,
            "score": 95,
            "explanation": "Highest technical relevance with direct query alignment..."
        },
        // ... explanations for other top documents
    ]
}
```
""",
)


class RerankingExplanation(TypedDict):
    """Explanation for a document's ranking."""

    index: int
    score: int
    explanation: str


class BatchRerankingResponse(TypedDict):
    """Response from batch reranking."""

    ranked_indices: list[int]
    reasoning: list[RerankingExplanation]


RERANKING_SCHEMA = {
    "type": "object",
    "properties": {
        "ranked_indices": {
            "type": "array",
            "items": {"type": "integer", "minimum": 0},
            "description": "Ordered list of document indices by relevance",
        },
        "reasoning": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer", "minimum": 0},
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "explanation": {"type": "string"},
                },
                "required": ["index", "score", "explanation"],
            },
        },
    },
    "required": ["ranked_indices", "reasoning"],
}


async def rerank_vectors(vectors: list[TextVector], query: str) -> list[TextVector]:
    """Rerank vectors based on content relevance.

    Args:
        vectors: List of vectors to rerank
        query: The query to rerank against

    Returns:
        Reranked list of vectors
    """
    documents_text = [
        dedent(f"""
        Document {idx}:
        Content: {vector.chunk["content"]}
        Element Type: {vector.chunk.get("element_type", "N/A")}
        Role: {vector.chunk.get("role", "N/A")}
        """)
        for idx, vector in enumerate(vectors)
    ]

    response = await handle_completions_request(
        prompt_identifier="batch_reranking",
        response_schema=RERANKING_SCHEMA,
        response_type=BatchRerankingResponse,
        model=FAST_TEXT_GENERATION_MODEL,
        messages=RERANKING_USER_PROMPT.to_string(query=query, documents="\n".join(documents_text)),
    )

    logger.debug("Reranking explanations", explanations=response["reasoning"], num_docs=len(vectors))

    return [vectors[i] for i in response["ranked_indices"]]
