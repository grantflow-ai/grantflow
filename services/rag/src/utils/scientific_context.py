"""Scientific context utilities for RAG processing."""

import re
from typing import Any, TypedDict

from services.rag.src.utils.prompt_template import PromptTemplate


class ValidationResult(TypedDict):
    """Validation result for scientific context."""
    is_valid: bool
    has_content: bool
    has_scientific_terms: bool
    term_count: int
    errors: list[str]


SCIENTIFIC_CONTEXT_TEMPLATE = PromptTemplate(
    name="scientific_context",
    template="""## Scientific Foundation Context
${scientific_context}

This context provides foundational scientific concepts and terminology relevant to the research objective. Use these terms and concepts to enhance the depth and accuracy of your response.""",
)


def extract_scientific_terms_from_context(context: str) -> list[str]:
    """Extract scientific terms from a context string formatted with **term** markdown."""
    if not context:
        return []

    # Extract terms from markdown bold format **term**
    bold_pattern = r"\*\*([^*]+)\*\*"
    terms = re.findall(bold_pattern, context)

    # Also extract capitalized scientific terms
    scientific_pattern = r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b"
    capitalized_terms = re.findall(scientific_pattern, context)

    # Combine and filter for scientific relevance
    all_terms = terms + capitalized_terms

    scientific_keywords = [
        "acid", "protein", "enzyme", "cell", "gene", "dna", "rna",
        "molecule", "compound", "synthesis", "analysis", "study",
        "research", "method", "technique", "process", "system",
        "learning", "intelligence", "network", "algorithm", "data"
    ]

    scientific_terms = [
        term.strip() for term in all_terms
        if term.strip() and any(keyword in term.lower() for keyword in scientific_keywords)
    ]

    return list(set(scientific_terms))


def format_scientific_context(context: str) -> str:
    """Format scientific context using the template."""
    if not context:
        return ""

    try:
        return SCIENTIFIC_CONTEXT_TEMPLATE.to_string(scientific_context=context)
    except Exception:
        # If template fails, return original context
        return context


def validate_scientific_context(context: Any) -> ValidationResult:
    """Validate that the provided context is scientifically relevant and return detailed results."""
    errors: list[str] = []

    if not isinstance(context, str):
        errors.append("Context must be a string")
        return ValidationResult(
            is_valid=False,
            has_content=False,
            has_scientific_terms=False,
            term_count=0,
            errors=errors
        )

    if not context.strip():
        errors.append("Context is empty")
        return ValidationResult(
            is_valid=False,
            has_content=False,
            has_scientific_terms=False,
            term_count=0,
            errors=errors
        )

    # Check for scientific content
    scientific_keywords = [
        "research", "study", "analysis", "method", "technique",
        "experiment", "hypothesis", "theory", "model", "data",
        "result", "conclusion", "investigation", "observation",
        "measurement", "assessment", "evaluation"
    ]

    context_lower = context.lower()
    has_scientific_keywords = any(keyword in context_lower for keyword in scientific_keywords)

    # Extract scientific terms
    terms = extract_scientific_terms_from_context(context)
    term_count = len(terms)
    has_scientific_terms = term_count > 0

    if not has_scientific_keywords and not has_scientific_terms:
        errors.append("No scientific terms found")

    is_valid = len(errors) == 0 and (has_scientific_keywords or has_scientific_terms)

    return ValidationResult(
        is_valid=is_valid,
        has_content=True,
        has_scientific_terms=has_scientific_terms,
        term_count=term_count,
        errors=errors
    )
