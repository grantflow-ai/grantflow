import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

SCIENTIFIC_CONTEXT_TEMPLATE = """## Scientific Foundation Context
{scientific_context}

This context provides foundational scientific concepts and terminology relevant to the research objective. Use these terms and concepts to enhance the depth and accuracy of your response."""


def format_scientific_context(scientific_context: str) -> str:
    """Format scientific context for LLM consumption."""
    if not scientific_context:
        return ""

    try:
        formatted_context = SCIENTIFIC_CONTEXT_TEMPLATE.format(scientific_context=scientific_context)

        logger.info(
            "Scientific context formatted successfully",
            extra={
                "context_length": len(scientific_context),
                "formatted_length": len(formatted_context),
            },
        )

        return formatted_context

    except Exception as e:
        logger.error(
            "Failed to format scientific context",
            extra={
                "error": str(e),
                "context_length": len(scientific_context),
            },
        )
        # Return original context if formatting fails
        return scientific_context


def extract_scientific_terms_from_context(context: str) -> list[str]:
    """Extract scientific terms from formatted context."""
    if not context:
        return []

    try:
        # Simple extraction - look for terms in bold (**term**)
        terms = re.findall(r"\*\*([^*]+)\*\*", context)

        # Remove duplicates and clean up
        unique_terms = list({term.strip() for term in terms if term.strip()})

        logger.info(
            "Extracted scientific terms from context",
            extra={
                "context_length": len(context),
                "terms_count": len(unique_terms),
            },
        )

        return unique_terms

    except Exception as e:
        logger.error(
            "Failed to extract scientific terms",
            extra={
                "error": str(e),
                "context_length": len(context),
            },
        )
        return []


def validate_scientific_context(context: str) -> dict[str, Any]:
    """Validate scientific context format and content."""
    validation_result: dict[str, Any] = {
        "is_valid": False,
        "has_content": False,
        "has_scientific_terms": False,
        "term_count": 0,
        "errors": [],
    }

    try:
        if not context:
            validation_result["errors"].append("Context is empty")
            return validation_result

        validation_result["has_content"] = True

        # Check if it follows the expected format
        if "## Scientific Foundation Context" not in context:
            validation_result["errors"].append("Missing scientific context header")

        # Extract and count scientific terms
        terms = extract_scientific_terms_from_context(context)
        validation_result["term_count"] = len(terms)
        validation_result["has_scientific_terms"] = len(terms) > 0

        if not terms:
            validation_result["errors"].append("No scientific terms found")

        # Mark as valid if no errors
        validation_result["is_valid"] = len(validation_result["errors"]) == 0

        logger.info(
            "Scientific context validation completed",
            extra={
                "is_valid": validation_result["is_valid"],
                "term_count": validation_result["term_count"],
                "error_count": len(validation_result["errors"]),
            },
        )

        return validation_result

    except Exception as e:
        validation_result["errors"].append(f"Validation error: {e!s}")
        logger.error(
            "Scientific context validation failed",
            extra={
                "error": str(e),
                "context_length": len(context),
            },
        )
        return validation_result
