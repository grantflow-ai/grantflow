import json
import logging
from typing import Any

from packages.shared_utils.src.env import get_env

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = get_env("ANTHROPIC_API_KEY", raise_on_missing=False)
AI_EVALUATION_ENABLED = ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "..." and len(ANTHROPIC_API_KEY) > 10

client: Any = None

if AI_EVALUATION_ENABLED:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except ImportError:
        logger.warning("Anthropic library not available, AI evaluation disabled")
        AI_EVALUATION_ENABLED = False
        client = None
else:
    client = None


async def evaluate_retrieval_relevance(
    query: str,
    retrieved_documents: list[str],
    max_documents: int = 5,
) -> dict[str, Any]:
    if not AI_EVALUATION_ENABLED or not client:
        return {
            "relevance_scores": [],
            "avg_relevance": 0.0,
            "evaluation_enabled": False,
            "reason": "AI evaluation not available",
        }

    documents_to_evaluate = retrieved_documents[:max_documents]

    prompt = f"""
    Evaluate the relevance of retrieved documents to the given query.

    Query: {query}

    Documents:
    {json.dumps(documents_to_evaluate, indent=2)}

    For each document, rate its relevance on a scale of 1-5 where:
    1 = Not relevant at all
    2 = Slightly relevant
    3 = Moderately relevant
    4 = Highly relevant
    5 = Extremely relevant

    Respond with a JSON object containing:
    - "relevance_scores": array of scores (1-5) for each document
    - "explanations": array of brief explanations for each score
    - "overall_assessment": brief overall assessment
    """

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307", max_tokens=1000, messages=[{"role": "user", "content": prompt}]
        )

        content_block = response.content[0]
        if hasattr(content_block, "text"):
            result = json.loads(content_block.text)
        else:
            raise ValueError("Response content block has no text attribute")

        relevance_scores = result.get("relevance_scores", [])
        avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.0

        return {
            "relevance_scores": relevance_scores,
            "avg_relevance": avg_relevance,
            "explanations": result.get("explanations", []),
            "overall_assessment": result.get("overall_assessment", ""),
            "evaluation_enabled": True,
        }

    except (Exception, json.JSONDecodeError) as e:
        logger.error("AI evaluation failed: %s", e)
        return {
            "relevance_scores": [],
            "avg_relevance": 0.0,
            "evaluation_enabled": False,
            "error": str(e),
        }


async def evaluate_grant_application_quality(application_content: str) -> dict[str, Any]:
    if not AI_EVALUATION_ENABLED or not client:
        return {
            "quality_score": 0.0,
            "evaluation_enabled": False,
            "reason": "AI evaluation not available",
        }

    prompt = f"""
    Evaluate the quality of this grant application content.

    Application Content:
    {application_content[:5000]}...

    Assess the application on these criteria (scale 1-5):
    1. Clarity and coherence of writing
    2. Logical structure and organization
    3. Completeness of information
    4. Persuasiveness and compelling arguments
    5. Professional tone and style

    Respond with a JSON object containing:
    - "scores": object with scores for each criterion
    - "overall_score": average of all scores
    - "strengths": array of identified strengths
    - "weaknesses": array of identified weaknesses
    - "suggestions": array of improvement suggestions
    """

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307", max_tokens=1500, messages=[{"role": "user", "content": prompt}]
        )

        content_block = response.content[0]
        if hasattr(content_block, "text"):
            result = json.loads(content_block.text)
        else:
            raise ValueError("Response content block has no text attribute")

        return {
            "scores": result.get("scores", {}),
            "overall_score": result.get("overall_score", 0.0),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "suggestions": result.get("suggestions", []),
            "evaluation_enabled": True,
        }

    except (Exception, json.JSONDecodeError) as e:
        logger.error("AI evaluation failed: %s", e)
        return {
            "quality_score": 0.0,
            "evaluation_enabled": False,
            "error": str(e),
        }


async def evaluate_cfp_extraction_accuracy(
    original_cfp: str,
    extracted_data: dict[str, Any],
) -> dict[str, Any]:
    if not AI_EVALUATION_ENABLED or not client:
        return {
            "accuracy_score": 0.0,
            "evaluation_enabled": False,
            "reason": "AI evaluation not available",
        }

    prompt = f"""
    Evaluate how accurately the CFP data was extracted from the original document.

    Original CFP (first 3000 chars):
    {original_cfp[:3000]}...

    Extracted Data:
    {json.dumps(extracted_data, indent=2)}

    Assess the extraction on these criteria (scale 1-5):
    1. Completeness - did it capture all important information?
    2. Accuracy - is the extracted information correct?
    3. Structure - is the data well-organized?
    4. Organization identification - was the funding organization correctly identified?

    Respond with a JSON object containing:
    - "scores": object with scores for each criterion
    - "overall_score": average of all scores
    - "missing_information": array of important information that was missed
    - "extraction_errors": array of any errors in the extracted data
    - "suggestions": array of improvement suggestions
    """

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307", max_tokens=1500, messages=[{"role": "user", "content": prompt}]
        )

        content_block = response.content[0]
        if hasattr(content_block, "text"):
            result = json.loads(content_block.text)
        else:
            raise ValueError("Response content block has no text attribute")

        return {
            "scores": result.get("scores", {}),
            "overall_score": result.get("overall_score", 0.0),
            "missing_information": result.get("missing_information", []),
            "extraction_errors": result.get("extraction_errors", []),
            "suggestions": result.get("suggestions", []),
            "evaluation_enabled": True,
        }

    except (Exception, json.JSONDecodeError) as e:
        logger.error("AI evaluation failed: %s", e)
        return {
            "accuracy_score": 0.0,
            "evaluation_enabled": False,
            "error": str(e),
        }


async def evaluate_query_generation_quality(
    context: str,
    generated_queries: list[str],
) -> dict[str, Any]:
    if not AI_EVALUATION_ENABLED or not client:
        return {
            "quality_score": 0.0,
            "evaluation_enabled": False,
            "reason": "AI evaluation not available",
        }

    prompt = f"""
    Evaluate the quality of generated search queries based on the given context.

    Context (first 2000 chars):
    {context[:2000]}...

    Generated Queries:
    {json.dumps(generated_queries, indent=2)}

    Assess the queries on these criteria (scale 1-5):
    1. Relevance to the context
    2. Diversity and coverage
    3. Specificity and precision
    4. Likely effectiveness for information retrieval

    Respond with a JSON object containing:
    - "scores": object with scores for each criterion
    - "overall_score": average of all scores
    - "best_queries": array of the most effective queries
    - "suggested_improvements": array of ways to improve the queries
    """

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307", max_tokens=1000, messages=[{"role": "user", "content": prompt}]
        )

        content_block = response.content[0]
        if hasattr(content_block, "text"):
            result = json.loads(content_block.text)
        else:
            raise ValueError("Response content block has no text attribute")

        return {
            "scores": result.get("scores", {}),
            "overall_score": result.get("overall_score", 0.0),
            "best_queries": result.get("best_queries", []),
            "suggested_improvements": result.get("suggested_improvements", []),
            "evaluation_enabled": True,
        }

    except (Exception, json.JSONDecodeError) as e:
        logger.error("AI evaluation failed: %s", e)
        return {
            "quality_score": 0.0,
            "evaluation_enabled": False,
            "error": str(e),
        }
