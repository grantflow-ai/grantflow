"""
~keep
Red Team Output - Saves grant application outputs for review and testing.

This module provides functionality to export complete grant application text,
section breakdowns, and editorial workflow outputs after pipeline completion.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantElement, GrantLongFormSection
    from services.rag.src.dto import (
        EditorialStatsDTO,
        EditorialTimingDTO,
        SelectiveEditsDTO,
    )

logger = get_logger(__name__)


def save_application_output(
    *,
    application_id: str,
    application_title: str,
    application_text: str,
    output_format: str = "md",
    output_dir: str | None = None,
) -> Path:
    """
    ~keep
    Save final grant application output to file for red team review.

    Args:
        application_id: UUID of the grant application
        application_title: Title of the grant application
        application_text: Complete generated application text
        output_format: Output format - 'md' (markdown) or 'txt' (plain text)
        output_dir: Optional custom output directory (default: testing/results/red_team/)

    Returns:
        Path to the saved output file
    """
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "red_team"
    else:
        base_dir = Path(output_dir)

    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in application_title)
    safe_title = safe_title.replace(" ", "_").lower()[:50]
    filename = f"{safe_title}_{timestamp.strftime('%Y%m%d_%H%M%S')}.{output_format}"
    output_path = date_dir / filename

    word_count = len(application_text.split())
    char_count = len(application_text)

    header = f"""---
Application ID: {application_id}
Title: {application_title}
Generated: {timestamp.isoformat()}
Word Count: {word_count:,}
Character Count: {char_count:,}
Output Format: {output_format}
---

"""

    full_content = header + application_text

    try:
        output_path.write_text(full_content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write red team output",
            application_id=application_id,
            output_path=str(output_path),
            error=str(e),
        )
        raise

    logger.info(
        "Saved red team output",
        application_id=application_id,
        output_path=str(output_path),
        word_count=word_count,
        format=output_format,
    )

    return output_path


def save_sections_breakdown(
    *,
    application_id: str,
    application_title: str,
    grant_sections: list[GrantElement | GrantLongFormSection],
    section_texts: dict[str, str],
    output_dir: str | None = None,
) -> Path:
    """
    ~keep
    Save detailed section-by-section breakdown for analysis.

    Args:
        application_id: UUID of the grant application
        application_title: Title of the grant application
        grant_sections: List of grant sections from template
        section_texts: Dictionary mapping section IDs to generated text
        output_dir: Optional custom output directory

    Returns:
        Path to the saved breakdown file
    """
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "red_team" / "sections"
    else:
        base_dir = Path(output_dir)

    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in application_title)
    safe_title = safe_title.replace(" ", "_").lower()[:50]
    filename = f"{safe_title}_sections_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    output_path = date_dir / filename

    lines = [
        f"# Section Breakdown: {application_title}",
        "",
        f"**Application ID**: {application_id}",
        f"**Generated**: {timestamp.isoformat()}",
        f"**Total Sections**: {len(section_texts)}",
        "",
        "---",
        "",
    ]

    for section in grant_sections:
        section_id = section["id"]
        section_title = section["title"]
        section_text = section_texts.get(section_id, "[No text generated]")

        word_count = len(section_text.split())
        char_count = len(section_text)

        lines.extend(
            [
                f"## {section_title}",
                "",
                f"**Section ID**: `{section_id}`",
                f"**Word Count**: {word_count:,}",
                f"**Character Count**: {char_count:,}",
                "",
                section_text,
                "",
                "---",
                "",
            ]
        )

    content = "\n".join(lines)

    try:
        output_path.write_text(content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write sections breakdown",
            application_id=application_id,
            output_path=str(output_path),
            error=str(e),
        )
        raise

    logger.info(
        "Saved red team sections breakdown",
        application_id=application_id,
        output_path=str(output_path),
        sections_count=len(section_texts),
    )

    return output_path


def save_editorial_workflow_output(
    *,
    application_id: str,
    application_title: str,
    original_text: str,
    review_letter: str,
    approved_edits: SelectiveEditsDTO,
    final_text: str,
    timing: EditorialTimingDTO,
    statistics: EditorialStatsDTO,
    output_dir: str | None = None,
) -> Path:
    """
    ~keep
    Save complete editorial workflow output: original → review → edits → final.

    Args:
        application_id: UUID of the grant application
        application_title: Title of the grant application
        original_text: Original generated proposal text (before editing)
        review_letter: Editorial review letter from LLM 1
        approved_edits: Approved changes from LLM 2 (SelectiveEdits)
        final_text: Final proposal text after applying approved changes
        timing: Timing breakdown for workflow steps
        statistics: Statistics (word counts, approval rates, etc.)
        output_dir: Optional custom output directory

    Returns:
        Path to the saved workflow output file
    """
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "red_team" / "editorial"
    else:
        base_dir = Path(output_dir)

    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in application_title)
    safe_title = safe_title.replace(" ", "_").lower()[:50]
    filename = f"{safe_title}_editorial_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    output_path = date_dir / filename

    lines = [
        f"# Editorial Workflow Output: {application_title}",
        "",
        f"**Application ID**: {application_id}",
        f"**Generated**: {timestamp.isoformat()}",
        "",
        "---",
        "",
        "## PERFORMANCE METRICS",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| **Total Duration** | {timing['elapsed_ms'] / 1000:.2f} seconds |",
        f"| Review Generation (LLM 1) | {timing['review_ms'] / 1000:.2f} seconds |",
        f"| Selective Editing (LLM 2) | {timing['editing_ms'] / 1000:.2f} seconds |",
        f"| Text Application | {timing['apply_ms'] / 1000:.2f} seconds |",
        f"| **Review Word Count** | {statistics['review_words']:,} words |",
        f"| **Suggestions Total** | {statistics['total']} |",
        f"| **Approved Changes** | {statistics['approved']} |",
        f"| **Rejected Changes** | {statistics['rejected']} |",
        f"| **Approval Rate** | {statistics['approval_rate']:.1f}% |",
        f"| **Original Word Count** | {statistics['original_words']:,} words |",
        f"| **Final Word Count** | {statistics['edited_words']:,} words |",
        f"| **Word Change** | {statistics['word_change']:+,} words |",
        "",
        "---",
        "",
        "## WORKFLOW SUMMARY",
        "",
        "### Step 1: Editorial Review (LLM 1 - Scientific Grant Editor)",
        "- **Input:** Original Proposal + CFP + RAG Knowledge Base",
        f"- **Output:** {statistics['review_words']:,}-word editorial review",
        "- **Focus:** Background facts verification + Writing quality",
        f"- **Duration:** {timing['review_ms'] / 1000:.2f}s",
        "",
        "### Step 2: Selective Editing (LLM 2 - Great Application Editor)",
        "- **Input:** Original Proposal → Review → RAG Knowledge Base (in order)",
        "- **Decision Criteria:** Correct? RAG-based? Makes it better? (ALL 3 must be YES)",
        f"- **Output:** {statistics['approved']} approved changes, {statistics['rejected']} rejected",
        f"- **Duration:** {timing['editing_ms'] / 1000:.2f}s",
        "",
        "### Step 3: Final Proposal",
        f"- **Changes applied:** {statistics['approved']} sentence-level edits",
        f"- **Net change:** {statistics['word_change']:+,} words",
        "",
        "---",
        "",
        "## APPROVED CHANGES SUMMARY",
        "",
        approved_edits["summary"],
        "",
        "---",
        "",
        "## DETAILED APPROVED CHANGES",
        "",
    ]

    for i, change in enumerate(approved_edits["changes"], 1):
        lines.extend(
            [
                f"### Change {i}: {change['section']}",
                "",
                f"**Reason:** {change['reason']}",
                "",
                "**Original:**",
                f"> {change['original']}",
                "",
                "**Revised:**",
                f"> {change['revised']}",
                "",
                "---",
                "",
            ]
        )

    lines.extend(
        [
            "# ORIGINAL PROPOSAL (Before Editing)",
            "",
            original_text,
            "",
            "---",
            "",
            "# EDITORIAL REVIEW (LLM 1 Output)",
            "",
            review_letter,
            "",
            "---",
            "",
            "# FINAL PROPOSAL (After Editing)",
            "",
            final_text,
        ]
    )

    content = "\n".join(lines)

    try:
        output_path.write_text(content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write editorial workflow output",
            application_id=application_id,
            output_path=str(output_path),
            error=str(e),
        )
        raise

    logger.info(
        "Saved editorial workflow output",
        application_id=application_id,
        output_path=str(output_path),
        approved_changes=statistics["approved"],
        rejected_changes=statistics["rejected"],
    )

    return output_path
