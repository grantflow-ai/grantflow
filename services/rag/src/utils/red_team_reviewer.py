"""
~keep
Scientific Grant Editor - Comprehensive editorial review of grant applications.

Uses Gemini Flash to perform editorial review of generated grant applications with dual focus:
1. Data Verification: Ensures all facts, numbers, and entities are accurately preserved from RAG
2. Writing Supervision: Evaluates clarity, specificity, scientific language, and absence of repetition

The editor does NOT judge scientific merit, feasibility, or logic - it only verifies data
preservation and writing quality. Output is a 600-1000 word editorial letter with constructive
feedback and specific suggestions for improvement.
"""

from textwrap import dedent
from typing import TYPE_CHECKING

from packages.db.src.connection import get_session_maker
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import SELECTIVE_EDITING_THINKING_BUDGET
from services.rag.src.dto import RedTeamReviewDTO, SelectiveEditsDTO
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.retrieval import retrieve_documents

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchObjective
    from packages.shared_utils.src.scientific_analysis import ScientificAnalysisResult


CRITICAL_REVIEWER_SYSTEM_PROMPT = """You are the LAST SCIENTIFIC EDITOR reviewing this grant proposal before final submission. Your role is comprehensive editorial review ensuring the proposal is polished, accurate, and ready for evaluation.

## Your Role as Last Scientific Editor

You are the final gatekeeper before submission. You must:
1. Verify all background facts against RAG knowledge base and Scientific Analysis
2. Fix all writing quality issues (repetition, clarity, flow, scientific tone)
3. Correct any editorial problems you encounter (grammar, punctuation, formatting, consistency)
4. Ensure the proposal reads professionally and persuasively

## Key Distinction

**RAG Knowledge Base**: Background literature (current state of science, published studies, existing methods)
**Proposal**: Scientist's proposed research (their goals, targets, research objectives)
**Scientific Analysis** (when provided): Structured extraction of arguments, evidence, hypotheses, and conclusions from source materials - use this for precise fact-checking

## Operating Pipeline

### 1. Read
Read all input materials thoroughly:
- Grant proposal text (what scientist wrote)
- CFP requirements (what funder expects)
- RAG knowledge base (published scientific literature for fact-checking)
- Scientific Analysis (if provided): Structured extraction of arguments, evidence, sources from source materials

Understand the distinction: RAG = past/current facts; Proposal = future goals; Scientific Analysis = structured facts with source attribution.

---

### 2. Identify
Identify ALL issues requiring correction:

**Background Facts from RAG and Scientific Analysis**
- When proposal states current facts about the field, verify against RAG AND Scientific Analysis (if provided)
- Use Scientific Analysis for precise fact-checking: it contains extracted evidence with source attribution (writers vs non_writers)
- Check: "Current BRAF inhibitors show 50% response" - is this in RAG or Scientific Analysis evidence?
- Check: "Previous studies demonstrated X" - is this in RAG or extracted arguments/evidence?
- Do not check: "We will achieve 85% efficiency" - this is their goal
- Do not check: "Expected outcomes include..." - these are hopes, not facts

**Temporal Clarity**
- Check if proposal confuses past published work (should cite RAG), preliminary data (should provide evidence), and future proposed work (research goals)
- Do not comment on whether goals are achievable

**Writing Quality**
- AI/marketing phrasing: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Overuse of "novel" (only use once if truly first-of-its-kind)
- Word repetition in consecutive sentences: "This aims to develop... This project aims to demonstrate..."

**Other Editorial Issues (NEW - As Last Scientific Editor)**
- Grammar and punctuation errors
- Awkward sentence constructions
- Unclear or ambiguous phrasing
- Inconsistent terminology or formatting
- Missing transitions between sections
- Passive voice overuse where active voice would be clearer
- Overly long or complex sentences that should be split
- Any other issue that reduces the proposal's professionalism or readability

---

### 3. Reason
For each identified issue, plan your editorial response:
- Quote the problematic text from proposal
- Cite specific RAG evidence (for factual issues)
- Explain the mismatch or problem clearly
- Draft a specific rewrite that fixes the issue

---

### 4. Write
Write 600-1000 word editorial letter focusing only on issues requiring changes. No positive observations. Structure:

1. Opening (50-75 words)
2. Background Facts Issues (quote proposal, cite RAG, explain mismatch, provide specific rewrite)
3. Writing Quality Issues (quote proposal, identify issue, provide specific rewrite)
4. Other Editorial Issues (grammar, clarity, flow - quote and provide specific rewrite)
5. Closing (summary of changes needed, 50-75 words)

Be thorough: if issue appears multiple times, document all instances with rewrites.

## Style and Fidelity
- Preserve scientific terminology from the proposal
- Focus on factual accuracy and writing clarity
- Provide constructive, actionable feedback
- Maintain professional editorial tone
- As the last editor, ensure every correction improves the proposal's chance of success"""


CRITICAL_REVIEWER_USER_PROMPT = """# Last Scientific Editor Review Task

As the LAST SCIENTIFIC EDITOR before submission, review the grant proposal comprehensively for factual accuracy, writing quality, AND all other editorial issues using the Read-Identify-Reason-Write pipeline. Check background facts against RAG. Do not judge research goals. Fix any editorial problems you find.

## Input Materials

### 1. RAG Knowledge Base (Background Literature)
{knowledge_base}

### 2. Grant Proposal
{application_text}

### 3. CFP Requirements
{cfp_text}

{argument_structure_section}
---

## Task Instructions

### Step 1: Read
Read all materials above. Understand:
- What the scientist wrote (proposal)
- What published literature says (RAG)
- What the funder expects (CFP)
- What structured facts were extracted (Scientific Analysis, if provided) - including arguments, evidence, and sources with attribution

### Step 2: Identify
Identify ALL issues requiring correction:

**Background Facts Verification**
- Check if background literature claims match RAG AND Scientific Analysis (if provided)
- Use Scientific Analysis evidence to verify specific claims with precise source attribution
- Verify current state-of-field statistics against extracted evidence
- Confirm previous studies mentioned are in RAG or extracted sources
- Check entity names (proteins, genes, drugs) are correct
- Do not check research goals or targets (these are what they want to achieve, not facts)

**Writing Quality Check**
- Flag AI/marketing phrasing: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Use "novel" once maximum
- Flag word repetition in consecutive sentences: "This aims to develop... This project aims to demonstrate..."
- Check clarity, specificity, evidence for claims, and flow

**Other Editorial Issues (As Last Scientific Editor)**
- Grammar and punctuation errors
- Awkward sentence constructions
- Unclear or ambiguous phrasing
- Inconsistent terminology or formatting
- Missing transitions between sections
- Passive voice overuse
- Overly complex sentences
- Any other issue reducing professionalism

### Step 3: Reason
For each issue you identified:
- Locate exact quote from proposal
- Find relevant RAG evidence AND/OR Scientific Analysis evidence (for factual issues)
- When Scientific Analysis is provided, cite specific extracted arguments or evidence with their source attribution
- Determine what's wrong
- Plan how to fix it

### Step 4: Write
Generate 600-1000 word editorial letter focusing only on issues needing changes. No positive observations.

**Opening** (50-75 words): State review purpose as Last Scientific Editor

**Background Facts Issues**: For each mismatch, provide:
1. Quote from proposal
2. RAG or Scientific Analysis states (quote the evidence with source attribution when available)
3. Issue explanation
4. Specific rewrite

**Writing Quality Issues**: For each problem, provide:
1. Quote from proposal
2. Issue type
3. Specific rewrite

**Other Editorial Issues**: For each problem, provide:
1. Quote from proposal
2. Issue type (grammar, clarity, flow, etc.)
3. Specific rewrite

**Closing** (50-75 words): Summary of changes needed

Be thorough: document all instances of repeated issues with specific rewrites."""


REVIEW_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "review": {
            "type": "string",
            "description": "Editorial review letter (600-1000 words)",
            "minLength": 400,
        },
    },
    "required": ["review"],
}


SELECTIVE_EDITOR_SYSTEM_PROMPT = """You are a conservative grant application editor who selectively applies editorial suggestions. RAG knowledge base is ground truth. You protect the scientist's work.

## Operating Pipeline

### 1. Read
Read materials in this order:
- Original proposal (what scientist wrote)
- Editorial review (what reviewer suggested)
- RAG knowledge base (ground truth for fact-checking)

Understand the scientist's intent and the reviewer's concerns before making any decisions.

---

### 2. Identify
For each editorial suggestion, identify:
- What change is being proposed
- What section it affects
- Whether it's about AI/marketing words, word repetition, factual errors, or other issues
- Whether RAG evidence supports the suggested change

---

### 3. Reason
For each suggestion, apply decision criteria:

**Always approve (no RAG check needed):**
- Removing AI/marketing words: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Fixing word repetition in consecutive sentences (e.g., "aims...aims")

**For other suggestions, ask three questions:**
1. Is the comment correct?
2. Is the comment based on RAG?
3. Does it make the proposal better?

Approve only if all 3 are YES. Make minor changes only (1-2 sentences).

**Critical Check Before Approval:**
1. Read surrounding sentences
2. Check if your edit repeats words from adjacent sentences
3. If yes, vary vocabulary or combine sentences

Example bad: "This proposal aims..." followed by "This project aims..." (repetition created)
Example good: "This proposal aims..." followed by "We will demonstrate..." (varied vocabulary)

---

### 4. Write
Return JSON with:
- `changes`: list of approved sentence-level edits (section, original, revised, reason)
- `rejected`: number of suggestions rejected
- `summary`: brief explanation of what changed and why

## Approval Guidelines

**Always allowed:** Remove AI/marketing words, fix word repetition

**Allowed with RAG verification:** Correct factual errors, remove unsupported claims, clarify ambiguous statements

**Not allowed:** Rewrite paragraphs, change >2 consecutive sentences, make changes not supported by RAG, change research goals

## Style and Fidelity
- Protect the scientist's work and voice
- Be conservative: when in doubt, reject the change
- Preserve scientific terminology and technical accuracy
- Only approve changes that clearly improve the proposal"""


SELECTIVE_EDITOR_USER_PROMPT = """# Selective Editing Task

Review editorial suggestions and decide which to apply using the Read-Identify-Reason-Write pipeline. Evaluate each using three criteria: correct, RAG-based, and makes proposal better. Approve only if all three are yes.

## Input Materials

### 1. Original Proposal
{application_text}

### 2. Editorial Review
{review_letter}

### 3. RAG Knowledge Base (Ground Truth)
{knowledge_base}

---

## Task Instructions

### Step 1: Read
Read materials in this specific order:
1. Original Proposal - understand what the scientist wrote
2. Editorial Review - understand what changes are being suggested
3. RAG Knowledge Base - understand what the ground truth says

### Step 2: Identify
For each editorial suggestion, identify:
- What specific change is proposed
- Which section it affects
- What type of issue it addresses (AI/marketing words, word repetition, factual error, etc.)
- Whether RAG evidence exists to support or refute the change

### Step 3: Reason
For each suggestion, evaluate using decision criteria:

**Always approve (no RAG check needed):**
- Removing AI/marketing words: "groundbreaking", "revolutionary", "transformative", "paradigm-shifting", "cutting-edge", "unprecedented", "game-changing", "breakthrough"
- Fixing word repetition in consecutive sentences

**For other suggestions, ask three questions:**
1. Is the comment correct?
2. Is the comment based on RAG?
3. Does it make the proposal better?

Approve only if all 3 are YES.

**Rejection Criteria:**
- Subjective preference
- RAG doesn't support claim
- Change too extensive
- Original is fine
- Creates new repetition

**Approval Criteria:**
- Factual error contradicted by RAG
- Unsupported claim not in RAG
- Clear ambiguity confusing readers
- Removing AI/marketing words
- Change doesn't create new problems

**Critical Check Before Approval:**
1. Locate issue in original proposal
2. Check RAG - does it support the claim?
3. Evaluate - is correction necessary and beneficial?
4. Draft proposed change (1-2 sentences only)
5. Check adjacent sentences - does your change create new word repetition?
6. Decide - approve or reject

### Step 4: Write
Return JSON:
- `changes`: approved sentence-level edits (section, original, revised, reason)
- `rejected`: number rejected
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
                    "original": {"type": "string", "description": "Original sentence"},
                    "revised": {"type": "string", "description": "Revised sentence"},
                    "reason": {"type": "string", "description": "Reason for change"},
                },
                "required": ["section", "original", "revised", "reason"],
            },
            "maxItems": 20,
        },
        "rejected": {"type": "integer", "description": "Number of rejected suggestions", "minimum": 0},
        "summary": {"type": "string", "description": "Brief summary of changes", "minLength": 10},
    },
    "required": ["changes", "rejected", "summary"],
}


logger = get_logger(__name__)


def _format_argument_structure_for_review(argument_structure: "ScientificAnalysisResult | None") -> str:
    """Format scientific analysis results as additional context for editorial review."""
    if argument_structure is None:
        return ""

    sections = []

    # Add extracted evidence for fact verification
    evidence = argument_structure.get("evidence", [])
    if evidence:
        ev_lines = []
        for ev in evidence:
            ev_type = ev.get("type", "")
            source = ev.get("source", "")
            ev_lines.append(f"- [{ev_type}] {ev['text']} (Source: {source})")
        if ev_lines:
            sections.append("### Extracted Evidence from Source Materials\n" + "\n".join(ev_lines))

    # Add arguments with source attribution
    arguments = argument_structure.get("arguments", [])
    if arguments:
        arg_lines = []
        for arg in arguments:
            source = arg.get("source", "")
            strength = arg.get("strength", "")
            arg_lines.append(f"- [{strength}] {arg['text']} (Source: {source})")
        if arg_lines:
            sections.append("### Extracted Arguments from Source Materials\n" + "\n".join(arg_lines))

    # Add sources for citation verification
    sources = argument_structure.get("sources", [])
    if sources:
        src_lines = [f"- {src['text']}" for src in sources]
        if src_lines:
            sections.append("### Cited Sources from Materials\n" + "\n".join(src_lines))

    if not sections:
        return ""

    return (
        """### 4. Scientific Analysis (Structured Extraction from Source Materials)

**IMPORTANT: You have access to structured scientific analysis data. USE THIS DATA for:**

1. **Evidence-based fact verification**: Cross-reference proposal claims against the extracted evidence. Flag any claims that contradict or are unsupported by this evidence.
2. **Source attribution checking**: Verify that claims attributed to "writers" (proposal authors) vs "non_writers" (RAG/literature) are correctly distinguished.
3. **Argument validation**: Check if the proposal's arguments align with the extracted argument structure. Flag logical gaps or unsupported leaps.
4. **Citation verification**: Use the extracted sources to verify that referenced works are accurately cited.
5. **Temporal consistency**: Ensure the proposal correctly distinguishes between past findings (evidence), current work (experiment), and future goals (objectives/tasks).

When reviewing, explicitly reference this structured data to provide precise, evidence-grounded feedback.

"""
        + "\n\n".join(sections)
        + "\n\n"
    )


async def retrieve_knowledge_base_for_application(
    *,
    application_id: str,
    trace_id: str,
    max_tokens: int = 12000,
) -> str:
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

    search_queries = []
    for obj in research_objectives:
        search_queries.append(obj["title"])
        if description := obj.get("description"):
            search_queries.append(description)

        search_queries.extend(task["title"] for task in obj.get("research_tasks", []))

    logger.info(
        "Retrieving knowledge base for editorial review",
        application_id=application_id,
        search_query_count=len(search_queries),
        trace_id=trace_id,
    )

    retrieval_results = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries[:15],
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


async def perform_critical_review(
    *,
    application_text: str,
    cfp_text: str,
    knowledge_base: str | None = None,
    argument_structure: "ScientificAnalysisResult | None" = None,
    trace_id: str,
) -> RedTeamReviewDTO:
    """
    ~keep
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
        RedTeamReviewDTO with 600-1000 word editorial letter containing:
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
        >>> print(len(review["review"].split()))
        847  # Word count in 600-1000 range
    """
    logger.info(
        "Starting editorial review",
        trace_id=trace_id,
        application_length=len(application_text),
        cfp_length=len(cfp_text),
        has_knowledge_base=knowledge_base is not None,
        knowledge_base_length=len(knowledge_base) if knowledge_base else 0,
        has_argument_structure=argument_structure is not None,
    )

    if knowledge_base:
        knowledge_base_text = knowledge_base
    else:
        knowledge_base_text = dedent("""
            NO SOURCE LITERATURE PROVIDED

            WARNING: No RAG knowledge base was provided for this review.
            This means DATA VERIFICATION cannot be performed.

            You should:
            1. Clearly state at the beginning of your letter: "Note: This review focuses only on writing quality as no RAG knowledge base was provided for data verification."
            2. Skip all data verification checks (numbers, entities, facts from RAG)
            3. Focus entirely on WRITING SUPERVISION: repetition, clarity, scientific language, specificity
            4. Still provide 600-1000 word editorial letter with constructive feedback
        """).strip()

    argument_structure_section = _format_argument_structure_for_review(argument_structure)

    user_prompt = CRITICAL_REVIEWER_USER_PROMPT.format(
        cfp_text=cfp_text,
        application_text=application_text,
        knowledge_base=knowledge_base_text,
        argument_structure_section=argument_structure_section,
    )

    review = await handle_completions_request(
        messages=user_prompt,
        system_prompt=CRITICAL_REVIEWER_SYSTEM_PROMPT,
        response_schema=REVIEW_JSON_SCHEMA,
        response_type=RedTeamReviewDTO,
        prompt_identifier="editorial_review",
        temperature=0.1,
        top_p=0.9,
        trace_id=trace_id,
        thinking_budget=None,
        thinking_level="high",
        model="gemini-3-pro-preview",
    )

    logger.info(
        "Editorial review completed",
        trace_id=trace_id,
        letter_length=len(review["review"]),
        word_count=len(review["review"].split()),
    )

    return review


async def apply_selective_edits(
    *,
    application_text: str,
    review_letter: str,
    knowledge_base: str,
    trace_id: str,
) -> SelectiveEditsDTO:
    """
    ~keep
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
        SelectiveEditsDTO with approved changes, rejected count, and summary

    Example:
        >>> edits = await apply_selective_edits(
        ...     application_text=proposal_text, review_letter=review_text, knowledge_base=rag_kb, trace_id="edit-123"
        ... )
        >>> print(f"Applied {len(edits['changes'])} changes")
        >>> print(f"Rejected {edits['rejected']} suggestions")
    """
    logger.info(
        "Starting selective editing",
        trace_id=trace_id,
        application_length=len(application_text),
        review_length=len(review_letter),
        knowledge_base_length=len(knowledge_base),
    )

    user_prompt = SELECTIVE_EDITOR_USER_PROMPT.format(
        application_text=application_text,
        review_letter=review_letter,
        knowledge_base=knowledge_base,
    )

    edits = await handle_completions_request(
        messages=user_prompt,
        system_prompt=SELECTIVE_EDITOR_SYSTEM_PROMPT,
        response_schema=SELECTIVE_EDITS_JSON_SCHEMA,
        response_type=SelectiveEditsDTO,
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
        rejected_count=edits["rejected"],
    )

    return edits
