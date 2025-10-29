"""
Scientific Grant Editor - Comprehensive editorial review of grant applications.

Uses Gemini Flash to perform editorial review of generated grant applications with dual focus:
1. Data Verification: Ensures all facts, numbers, and entities are accurately preserved from RAG
2. Writing Supervision: Evaluates clarity, specificity, scientific language, and absence of repetition

The editor does NOT judge scientific merit, feasibility, or logic - it only verifies data
preservation and writing quality. Output is a 600-1000 word editorial letter with constructive
feedback and specific suggestions for improvement.
"""

from typing import TYPE_CHECKING

from packages.db.src.connection import get_session_maker
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import EDITORIAL_REVIEW_THINKING_BUDGET, SELECTIVE_EDITING_THINKING_BUDGET
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.editorial_types import RedTeamReview, SelectiveEdits
from services.rag.src.utils.retrieval import retrieve_documents

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchObjective

logger = get_logger(__name__)


CRITICAL_REVIEWER_SYSTEM_PROMPT = """You are a scientific grant editor checking writing quality and verifying background facts from RAG knowledge base.

## Key Distinction

**RAG Knowledge Base**: Background literature (current state of science, published studies, existing methods)
**Proposal**: Scientist's proposed research (their goals, targets, research objectives)

## What to Check

### 1. Background Facts from RAG

When proposal states current facts about the field, verify against RAG:
- Check: "Current BRAF inhibitors show 50% response" - is this in RAG?
- Check: "Previous studies demonstrated X" - is this in RAG?
- Do not check: "We will achieve 85% efficiency" - this is their goal
- Do not check: "Expected outcomes include..." - these are hopes, not facts

### 2. Temporal Clarity

Check if proposal confuses past published work (should cite RAG), preliminary data (should provide evidence), and future proposed work (research goals). Do not comment on whether goals are achievable.

### 3. Writing Quality

Identify AI/marketing phrasing that should be removed:
- "groundbreaking", "revolutionary", "transformative", "paradigm-shifting"
- "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Overuse of "novel" (only use once if truly first-of-its-kind)

Check for word repetition in consecutive sentences:
- Flag: "This aims to develop... This project aims to demonstrate..."
- Suggest varying vocabulary or combining sentences

Evaluate clarity, specificity, scientific language, and logical flow.

## Output Format

Write 600-1000 word editorial letter focusing only on issues requiring changes. No positive observations. Structure:

1. Opening (50-75 words)
2. Background Facts Issues (quote proposal, cite RAG, explain mismatch, provide specific rewrite)
3. Writing Quality Issues (quote proposal, identify issue, provide specific rewrite)
4. Closing (summary of changes needed, 50-75 words)

Be thorough: if issue appears multiple times, document all instances with rewrites."""


CRITICAL_REVIEWER_USER_PROMPT = """# Editorial Review Task

Review the grant proposal for factual accuracy and writing quality. Check background facts against RAG. Do not judge research goals.

## Materials

### 1. RAG Knowledge Base (Background Literature)
{knowledge_base}

### 2. Grant Proposal
{application_text}

### 3. CFP Requirements
{cfp_text}

## Review Framework

### Background Facts Verification

Check if background literature claims match RAG:
- Verify current state-of-field statistics
- Confirm previous studies mentioned are in RAG
- Check entity names (proteins, genes, drugs) are correct

Do not check research goals or targets (these are what they want to achieve, not facts).

### Writing Quality Check

Flag AI/marketing phrasing: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough". Use "novel" once maximum.

Flag word repetition in consecutive sentences:
- Bad: "This aims to develop... This project aims to demonstrate..."
- Fix: Vary vocabulary or combine sentences

Check repetition, clarity, specificity, evidence for claims, and flow.

## Output Format

Write 600-1000 word letter focusing only on issues needing changes. No positive observations.

**Opening** (50-75 words): State review purpose

**Background Facts Issues**: For each mismatch, provide:
1. Quote from proposal
2. RAG states (quote)
3. Issue explanation
4. Specific rewrite

**Writing Quality Issues**: For each problem, provide:
1. Quote from proposal
2. Issue type
3. Specific rewrite

**Closing** (50-75 words): Summary of changes needed

Be thorough: document all instances of repeated issues with specific rewrites."""


REVIEW_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "review_letter": {
            "type": "string",
            "description": "Editorial review letter (600-1000 words)",
            "minLength": 400,
        },
    },
    "required": ["review_letter"],
}


async def retrieve_knowledge_base_for_application(
    *,
    application_id: str,
    trace_id: str,
    max_tokens: int = 12000,
) -> str:
    """
    Retrieve the knowledge base (source literature) used to generate an application.

    This retrieves the same RAG context that was used during application generation,
    allowing the editor to verify that data was accurately preserved from source material.

    Args:
        application_id: ID of the grant application
        trace_id: Trace ID for logging
        max_tokens: Maximum tokens to retrieve (default: 12000)

    Returns:
        Formatted knowledge base as string

    Example:
        >>> kb = await retrieve_knowledge_base_for_application(application_id="app-123", trace_id="review-456")
        >>> print(kb[:100])
        # Scientific Literature Context...
    """
    session_maker = get_session_maker()

    async with session_maker() as session:
        result = await session.scalar(select_active(GrantApplication).where(GrantApplication.id == application_id))

        if not result:
            logger.warning("Application not found", application_id=application_id, trace_id=trace_id)
            return "No application found to retrieve knowledge base."

        research_objectives: list[ResearchObjective] = result.research_objectives or []

        if not research_objectives:
            logger.warning(
                "No research objectives found for application",
                application_id=application_id,
                trace_id=trace_id,
            )
            return "No research objectives found - cannot retrieve knowledge base."

    # Build search queries from research objectives
    search_queries = []
    for obj in research_objectives:
        search_queries.append(obj["title"])
        if description := obj.get("description"):
            search_queries.append(description)

        # Extract tasks
        search_queries.extend(task["title"] for task in obj.get("research_tasks", []))

    # Retrieve documents using the same method as application generation
    logger.info(
        "Retrieving knowledge base for editorial review",
        application_id=application_id,
        search_query_count=len(search_queries),
        trace_id=trace_id,
    )

    retrieval_results = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries[:15],  # Limit to top 15 queries
        task_description="Retrieve source literature for editorial review data verification",
        max_tokens=max_tokens,
        trace_id=trace_id,
    )

    knowledge_base = "\n\n".join(retrieval_results)

    logger.info(
        "Knowledge base retrieved",
        application_id=application_id,
        kb_length=len(knowledge_base),
        document_count=len(retrieval_results),
        trace_id=trace_id,
    )

    return knowledge_base


async def run_critical_review(
    *,
    application_text: str,
    cfp_text: str,
    knowledge_base: str | None = None,
    trace_id: str,
) -> RedTeamReview:
    """
    Run comprehensive editorial review on grant application.

    Performs dual-focus editorial review:
    1. Data Verification: Checks that all facts, numbers, entities match RAG source
    2. Writing Supervision: Evaluates clarity, specificity, scientific language

    The editor does NOT judge scientific merit or feasibility - only data preservation
    and writing quality.

    Args:
        application_text: Complete grant application markdown
        cfp_text: Call for Proposals full text
        knowledge_base: RAG retrieval context (source literature used to generate application)
        trace_id: Trace ID for logging

    Returns:
        RedTeamReview with 600-1000 word editorial letter containing:
        - Data verification issues (numbers, entities, temporal clarity)
        - Writing quality issues (repetition, clarity, specificity)
        - Positive observations
        - Constructive suggestions for improvement

    Example:
        >>> review = await run_critical_review(
        ...     application_text="# Abstract\\n\\nOur revolutionary...",
        ...     cfp_text="NIH R01 Requirements:\\n1. Abstract (300 words)...",
        ...     knowledge_base="Scientific papers:\\n\\n1. Paper by Smith et al...",
        ...     trace_id="review-123",
        ... )
        >>> print(len(review["review_letter"].split()))
        847  # Word count in 600-1000 range
    """
    logger.info(
        "Starting editorial review",
        trace_id=trace_id,
        application_length=len(application_text),
        cfp_length=len(cfp_text),
        has_knowledge_base=knowledge_base is not None,
        knowledge_base_length=len(knowledge_base) if knowledge_base else 0,
    )

    # Format the prompt
    if knowledge_base:
        knowledge_base_text = knowledge_base
    else:
        knowledge_base_text = """⚠️ NO SOURCE LITERATURE PROVIDED

WARNING: No RAG knowledge base was provided for this review.
This means DATA VERIFICATION cannot be performed.

You should:
1. Clearly state at the beginning of your letter: "Note: This review focuses only on writing quality as no RAG knowledge base was provided for data verification."
2. Skip all data verification checks (numbers, entities, facts from RAG)
3. Focus entirely on WRITING SUPERVISION: repetition, clarity, scientific language, specificity
4. Still provide 600-1000 word editorial letter with constructive feedback"""

    user_prompt = CRITICAL_REVIEWER_USER_PROMPT.format(
        cfp_text=cfp_text,
        application_text=application_text,
        knowledge_base=knowledge_base_text,
    )

    review = await handle_completions_request(
        messages=user_prompt,
        system_prompt=CRITICAL_REVIEWER_SYSTEM_PROMPT,
        response_schema=REVIEW_JSON_SCHEMA,
        response_type=RedTeamReview,
        prompt_identifier="editorial_review",
        temperature=0.1,
        top_p=0.9,
        trace_id=trace_id,
        thinking_budget=EDITORIAL_REVIEW_THINKING_BUDGET,
        model=GEMINI_FLASH_MODEL,
    )

    logger.info(
        "Editorial review completed",
        trace_id=trace_id,
        letter_length=len(review["review_letter"]),
        word_count=len(review["review_letter"].split()),
    )

    return review


SELECTIVE_EDITOR_SYSTEM_PROMPT = """You are a conservative grant application editor who selectively applies editorial suggestions. RAG knowledge base is ground truth. You protect the scientist's work.

## Decision Process

For each suggestion, determine if you should approve or reject:

**Always approve (no RAG check needed):**
- Removing AI/marketing words: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Fixing word repetition in consecutive sentences (e.g., "aims...aims")

**For other suggestions, ask three questions:**
1. Is the comment correct?
2. Is the comment based on RAG?
3. Does it make the proposal better?

Approve only if all 3 are YES. Make minor changes only (1-2 sentences).

## What You Can Change

Always allowed: Remove AI/marketing words, fix word repetition

Allowed with RAG verification: Correct factual errors, remove unsupported claims, clarify ambiguous statements

Not allowed: Rewrite paragraphs, change >2 consecutive sentences, make changes not supported by RAG, change research goals

## Critical Check

Before finalizing any change, check if your proposed wording creates new word repetition in adjacent sentences:
1. Read surrounding sentences
2. Check if your edit repeats words from adjacent sentences
3. If yes, vary vocabulary or combine sentences

Example bad: "This proposal aims..." followed by "This project aims..." (repetition created)
Example good: "This proposal aims..." followed by "We will demonstrate..." (varied vocabulary)

## Output Format

Return JSON with:
- `changes`: list of approved sentence-level edits (section, original_sentence, revised_sentence, reason)
- `rejected_count`: number of suggestions rejected
- `summary`: brief explanation of what changed and why

Be conservative: when in doubt, reject the change."""


SELECTIVE_EDITOR_USER_PROMPT = """# Selective Editing Task

Review editorial suggestions and decide which to apply. Evaluate each using three criteria: correct, RAG-based, and makes proposal better. Approve only if all three are yes.

## Reading Order

1. Original Proposal
2. Editorial Review
3. RAG Knowledge Base

## Materials

### 1. Original Proposal
{application_text}

### 2. Editorial Review
{review_letter}

### 3. RAG Knowledge Base (Ground Truth)
{knowledge_base}

## Evaluation Process

For each suggestion:
1. Locate issue in original proposal
2. Check RAG - does it support the claim?
3. Evaluate - is correction necessary and beneficial?
4. Draft proposed change
5. Check adjacent sentences - does your change create new word repetition?
6. Decide - approve (1-2 sentences only) or reject

## Approval Criteria

Reject if:
- Subjective preference
- RAG doesn't support claim
- Change too extensive
- Original is fine
- Creates new repetition

Approve only if:
- Factual error contradicted by RAG
- Unsupported claim not in RAG
- Clear ambiguity confusing readers
- Removing AI/marketing words
- Change doesn't create new problems

## Output

Return JSON:
- `changes`: approved sentence-level edits
- `rejected_count`: number rejected
- `summary`: what changed and why

Be conservative: protect the scientist's work."""


SELECTIVE_EDITS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "changes": {
            "type": "array",
            "description": "Approved sentence-level changes",
            "items": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Section name"},
                    "original_sentence": {"type": "string", "description": "Original sentence"},
                    "revised_sentence": {"type": "string", "description": "Revised sentence"},
                    "reason": {"type": "string", "description": "Reason for change"},
                },
                "required": ["section", "original_sentence", "revised_sentence", "reason"],
            },
            "maxItems": 20,
        },
        "rejected_count": {"type": "integer", "description": "Number of rejected suggestions", "minimum": 0},
        "summary": {"type": "string", "description": "Brief summary of changes", "minLength": 10},
    },
    "required": ["changes", "rejected_count", "summary"],
}


async def apply_selective_edits(
    *,
    application_text: str,
    review_letter: str,
    knowledge_base: str,
    trace_id: str,
) -> SelectiveEdits:
    """
    Selectively apply editorial suggestions to a grant proposal.

    This function acts as a "Great Application Editor" that:
    1. Reads the original proposal, review, and RAG knowledge base
    2. Evaluates each review suggestion using three criteria:
       - Is the comment correct?
       - Is the comment based on RAG?
       - Does it make the proposal better?
    3. Only approves changes if ALL THREE criteria are met
    4. Makes only minor changes (1-2 sentences)
    5. Protects the scientist's work by being conservative

    Args:
        application_text: Original grant application text
        review_letter: Editorial review with suggestions
        knowledge_base: RAG knowledge base (ground truth)
        trace_id: Trace ID for logging

    Returns:
        SelectiveEdits with approved changes, rejected count, and summary

    Example:
        >>> edits = await apply_selective_edits(
        ...     application_text=proposal_text, review_letter=review_text, knowledge_base=rag_kb, trace_id="edit-123"
        ... )
        >>> print(f"Applied {len(edits['changes'])} changes")
        >>> print(f"Rejected {edits['rejected_count']} suggestions")
    """
    logger.info(
        "Starting selective editing",
        trace_id=trace_id,
        application_length=len(application_text),
        review_length=len(review_letter),
        knowledge_base_length=len(knowledge_base),
    )

    # Format the prompt
    user_prompt = SELECTIVE_EDITOR_USER_PROMPT.format(
        application_text=application_text,
        review_letter=review_letter,
        knowledge_base=knowledge_base,
    )

    edits = await handle_completions_request(
        messages=user_prompt,
        system_prompt=SELECTIVE_EDITOR_SYSTEM_PROMPT,
        response_schema=SELECTIVE_EDITS_JSON_SCHEMA,
        response_type=SelectiveEdits,
        prompt_identifier="selective_editing",
        temperature=0.1,
        top_p=0.9,
        trace_id=trace_id,
        thinking_budget=SELECTIVE_EDITING_THINKING_BUDGET,
        model=GEMINI_FLASH_MODEL,
    )

    logger.info(
        "Selective editing completed",
        trace_id=trace_id,
        approved_changes=len(edits["changes"]),
        rejected_count=edits["rejected_count"],
    )

    return edits
