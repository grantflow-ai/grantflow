"""
Editorial Workflow - Two-LLM system for grant proposal review and editing.

This module orchestrates the editorial workflow:
1. LLM 1 (Editorial Reviewer): Generates editorial review of proposal
2. LLM 2 (Selective Editor): Conservatively applies approved changes
3. Text Application: Applies sentence-level edits to original text

The workflow ensures:
- AI phrasing removal (groundbreaking, transformative, etc.)
- Word repetition prevention
- RAG fact verification
- Conservative editing to protect scientist's work
"""

import time

from packages.shared_utils.src.logger import get_logger

from services.rag.src.utils.editorial_dto import (
    EditorialMetadataDTO,
    RedTeamReviewDTO,
    SelectiveEditsDTO,
    SentenceChangeDTO,
)
from services.rag.src.utils.red_team_reviewer import apply_selective_edits, run_critical_review

logger = get_logger(__name__)


def apply_text_changes(original_text: str, changes: list[SentenceChangeDTO]) -> str:
    """
    Apply sentence-level changes to the original text.

    Args:
        original_text: Original proposal text
        changes: List of approved sentence-level changes from SelectiveEditsDTO

    Returns:
        Text with approved changes applied
    """
    result = original_text

    applied_count = 0
    failed_count = 0

    for change in changes:
        original_sentence = change["original"]
        revised_sentence = change["revised"]
        section = change["section"]

        if original_sentence in result:
            result = result.replace(original_sentence, revised_sentence, 1)
            applied_count += 1
            logger.debug(
                "Applied editorial change",
                section=section,
                original_length=len(original_sentence),
                revised_length=len(revised_sentence),
            )
        else:
            failed_count += 1
            sentence_preview = original_sentence[:100]
            logger.warning(
                "Could not find sentence to replace",
                section=section,
                sentence_preview=sentence_preview,
                sentence_full_length=len(original_sentence),
                result_length=len(result),
            )

    logger.debug(
        "Text changes applied",
        applied_count=applied_count,
        failed_count=failed_count,
        total_changes=len(changes),
    )

    return result


async def run_editorial_workflow(
    *,
    application_text: str,
    cfp_text: str,
    knowledge_base: str,
    trace_id: str,
) -> tuple[str, EditorialMetadataDTO]:
    """
    Run two-LLM editorial workflow on generated grant application.

    Args:
        application_text: Generated grant application text
        cfp_text: Call for Proposals text
        knowledge_base: RAG knowledge base
        trace_id: Trace ID for logging

    Returns:
        Tuple of (edited_text, workflow_metadata)
    """
    workflow_start = time.perf_counter()

    logger.debug(
        "Starting editorial workflow",
        application_length=len(application_text),
        application_words=len(application_text.split()),
        cfp_length=len(cfp_text),
        kb_length=len(knowledge_base),
        trace_id=trace_id,
    )

    review_start = time.perf_counter()
    logger.debug("Running editorial review (LLM 1)", trace_id=trace_id)

    review: RedTeamReviewDTO = await run_critical_review(
        application_text=application_text,
        cfp_text=cfp_text,
        knowledge_base=knowledge_base,
        trace_id=trace_id,
    )

    review_duration = time.perf_counter() - review_start
    review_words = len(review["review"].split())

    logger.debug(
        "Editorial review completed",
        elapsed_ms=int(review_duration * 1000),
        review_words=review_words,
        trace_id=trace_id,
    )

    editing_start = time.perf_counter()
    logger.debug("Running selective editing (LLM 2)", trace_id=trace_id)

    edits: SelectiveEditsDTO = await apply_selective_edits(
        application_text=application_text,
        review_letter=review["review"],
        knowledge_base=knowledge_base,
        trace_id=trace_id,
    )

    editing_duration = time.perf_counter() - editing_start

    logger.debug(
        "Selective editing completed",
        elapsed_ms=int(editing_duration * 1000),
        approved_count=len(edits["changes"]),
        rejected_count=edits["rejected"],
        approval_rate=round(len(edits["changes"]) / (len(edits["changes"]) + edits["rejected"]) * 100, 1)
        if (len(edits["changes"]) + edits["rejected"]) > 0
        else 0.0,
        trace_id=trace_id,
    )

    apply_start = time.perf_counter()
    logger.debug(
        "Applying approved changes to text",
        changes_count=len(edits["changes"]),
        trace_id=trace_id,
    )

    edited_text = apply_text_changes(application_text, edits["changes"])

    apply_duration = time.perf_counter() - apply_start
    workflow_duration = time.perf_counter() - workflow_start

    original_words = len(application_text.split())
    edited_words = len(edited_text.split())
    word_change = edited_words - original_words

    logger.info(
        "Editorial workflow completed",
        elapsed_ms=int(workflow_duration * 1000),
        review_ms=int(review_duration * 1000),
        editing_ms=int(editing_duration * 1000),
        apply_ms=int(apply_duration * 1000),
        original_words=original_words,
        edited_words=edited_words,
        word_change=word_change,
        approved_changes=len(edits["changes"]),
        rejected_suggestions=edits["rejected"],
        trace_id=trace_id,
    )

    workflow_metadata: EditorialMetadataDTO = {
        "review": review["review"],
        "edits": edits,
        "timing": {
            "elapsed_ms": int(workflow_duration * 1000),
            "review_ms": int(review_duration * 1000),
            "editing_ms": int(editing_duration * 1000),
            "apply_ms": int(apply_duration * 1000),
        },
        "stats": {
            "review_words": review_words,
            "original_words": original_words,
            "edited_words": edited_words,
            "word_change": word_change,
            "approved": len(edits["changes"]),
            "rejected": edits["rejected"],
            "total": len(edits["changes"]) + edits["rejected"],
            "approval_rate": round(len(edits["changes"]) / (len(edits["changes"]) + edits["rejected"]) * 100, 1)
            if (len(edits["changes"]) + edits["rejected"]) > 0
            else 0.0,
        },
    }

    return edited_text, workflow_metadata
