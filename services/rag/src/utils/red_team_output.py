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
    from packages.shared_utils.src.scientific_analysis import ScientificAnalysisResult

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


def save_scientific_analysis_output(
    *,
    source_id: str,
    source_filename: str,
    analysis_result: ScientificAnalysisResult,
    output_dir: str | None = None,
) -> Path:
    """
    ~keep
    Save scientific analysis output for a source document.

    Args:
        source_id: UUID of the source document
        source_filename: Original filename of the source
        analysis_result: Complete scientific analysis result
        output_dir: Optional custom output directory

    Returns:
        Path to the saved analysis file
    """
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "scientific_analysis"
    else:
        base_dir = Path(output_dir)

    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = "".join(c if c.isalnum() or c in (" ", "-", "_", ".") else "" for c in source_filename)
    safe_filename = safe_filename.replace(" ", "_").lower()[:50]
    filename = f"{safe_filename}_analysis_{timestamp.strftime('%Y%m%d_%H%M%S')}.txt"
    output_path = date_dir / filename

    metadata = analysis_result["metadata"]

    lines = [
        "=" * 80,
        "SCIENTIFIC ANALYSIS OUTPUT",
        "=" * 80,
        "",
        f"Source ID: {source_id}",
        f"Source File: {source_filename}",
        f"Generated: {timestamp.isoformat()}",
        f"Article Type: {metadata['article_type']}",
        "",
        "--- ELEMENT COUNTS ---",
        f"Arguments: {metadata['total_arguments']}",
        f"Evidence: {metadata['total_evidence']}",
        f"Hypotheses: {metadata['total_hypotheses']}",
        f"Conclusions: {metadata['total_conclusions']}",
        f"Experiment Results: {metadata['total_results']}",
        f"Sources: {metadata['total_sources']}",
        f"Objectives: {metadata['total_objectives']}",
        f"Tasks: {metadata['total_tasks']}",
        "",
        "=" * 80,
        "ARGUMENTS",
        "=" * 80,
    ]

    for arg in analysis_result["arguments"]:
        pivot_marker = " [PIVOT]" if arg.get("pivot", False) else ""
        lines.extend(
            [
                "",
                f"--- Argument {arg['id']}{pivot_marker} ---",
                f"Type: {arg['type']} | Source: {arg['source']} | Rhetorical: {arg['rhetorical_action']}",
                f"Temporal: {arg['temporal_context']} (order: {arg['temporal_order']}) | Hierarchy: {arg['hierarchy']}",
                f"Context: {arg['context']}",
                f"Text: {arg['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "EVIDENCE",
            "=" * 80,
        ]
    )

    for ev in analysis_result["evidence"]:
        pivot_marker = " [PIVOT]" if ev.get("pivot", False) else ""
        lines.extend(
            [
                "",
                f"--- Evidence {ev['id']}{pivot_marker} ---",
                f"Type: {ev['type']} | Source: {ev['source']} | Rhetorical: {ev['rhetorical_action']}",
                f"Temporal: {ev['temporal_context']} (order: {ev['temporal_order']}) | Hierarchy: {ev['hierarchy']}",
                f"Supports: {ev['supports']}",
                f"Text: {ev['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "HYPOTHESES",
            "=" * 80,
        ]
    )

    for hyp in analysis_result["hypotheses"]:
        pivot_marker = " [PIVOT]" if hyp.get("pivot", False) else ""
        lines.extend(
            [
                "",
                f"--- Hypothesis {hyp['id']}{pivot_marker} ---",
                f"Type: {hyp['type']} | Source: {hyp['source']} | Rhetorical: {hyp['rhetorical_action']}",
                f"Temporal: {hyp['temporal_context']} (order: {hyp['temporal_order']}) | Hierarchy: {hyp['hierarchy']}",
                f"Testable: {hyp['testable']}",
                f"Text: {hyp['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "CONCLUSIONS",
            "=" * 80,
        ]
    )

    for conc in analysis_result["conclusions"]:
        pivot_marker = " [PIVOT]" if conc.get("pivot", False) else ""
        lines.extend(
            [
                "",
                f"--- Conclusion {conc['id']}{pivot_marker} ---",
                f"Type: {conc['type']} | Source: {conc['source']} | Rhetorical: {conc['rhetorical_action']}",
                f"Temporal: {conc['temporal_context']} (order: {conc['temporal_order']}) | Hierarchy: {conc['hierarchy']}",
                f"Based On: {conc['based_on']}",
                f"Text: {conc['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "EXPERIMENT RESULTS",
            "=" * 80,
        ]
    )

    for res in analysis_result["experiment_results"]:
        pivot_marker = " [PIVOT]" if res.get("pivot", False) else ""
        lines.extend(
            [
                "",
                f"--- Result {res['id']}{pivot_marker} ---",
                f"Source: {res['source']} | Rhetorical: {res['rhetorical_action']}",
                f"Temporal: {res['temporal_context']} (order: {res['temporal_order']}) | Hierarchy: {res['hierarchy']}",
                f"Experiment: {res['experiment']}",
                f"Outcome: {res['outcome']}",
                f"Significance: {res.get('significance', 'N/A')}",
                f"Text: {res['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "OBJECTIVES",
            "=" * 80,
        ]
    )

    for obj in analysis_result["objectives"]:
        lines.extend(
            [
                "",
                f"--- Objective {obj['id']} ({obj['hierarchy']}) ---",
                f"Type: {obj['type']} | Temporal Order: {obj['temporal_order']}",
                f"Scope: {obj['scope']}",
                f"Expected Outcome: {obj['expected_outcome']}",
                f"Text: {obj['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "TASKS (with dependencies)",
            "=" * 80,
        ]
    )

    for task in analysis_result["tasks"]:
        deps = task["depends_on"]
        deps_str = ", ".join(str(d) for d in deps) if deps else "None"
        lines.extend(
            [
                "",
                f"--- Task {task['id']} ({task['hierarchy']}) ---",
                f"Supports Objective: {task['supports_objective']} | Temporal Order: {task['temporal_order']}",
                f"Depends On: [{deps_str}]",
                f"Action: {task['action']}",
                f"Deliverable: {task['deliverable']}",
                f"Text: {task['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "SOURCES/CITATIONS",
            "=" * 80,
        ]
    )

    for src in analysis_result["sources"]:
        lines.extend(
            [
                "",
                f"--- Source {src['id']} ---",
                f"Type: {src['type']}",
                f"Relevance: {src['relevance']}",
                f"Text: {src['text']}",
            ]
        )

    lines.extend(
        [
            "",
            "=" * 80,
            "END OF ANALYSIS",
            "=" * 80,
        ]
    )

    content = "\n".join(lines)

    try:
        output_path.write_text(content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write scientific analysis output",
            source_id=source_id,
            output_path=str(output_path),
            error=str(e),
        )
        raise

    logger.info(
        "Saved scientific analysis output",
        source_id=source_id,
        source_filename=source_filename,
        output_path=str(output_path),
        arguments=metadata["total_arguments"],
        evidence=metadata["total_evidence"],
        objectives=metadata["total_objectives"],
        tasks=metadata["total_tasks"],
    )

    return output_path


def save_comparison_output(
    *,
    baseline_text: str,
    with_analysis_text: str,
    scenario_name: str,
    analysis_stats: dict[str, int | list[dict[str, str]]] | None = None,
    output_dir: str | None = None,
) -> tuple[Path, Path]:
    """
    ~keep
    Save before/after comparison MD files for domain expert review.

    Args:
        baseline_text: Work plan text generated WITHOUT argument_structure
        with_analysis_text: Work plan text generated WITH argument_structure
        scenario_name: Name of the scenario being tested
        analysis_stats: Optional statistics about the scientific analysis (counts, etc.)
        output_dir: Optional custom output directory

    Returns:
        Tuple of (baseline_path, with_analysis_path)
    """
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "comparison"
    else:
        base_dir = Path(output_dir)

    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    safe_name = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in scenario_name)
    safe_name = safe_name.replace(" ", "_").lower()[:40]
    timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")

    # Save baseline (WITHOUT argument_structure)
    baseline_filename = f"{safe_name}_BASELINE_{timestamp_str}.md"
    baseline_path = date_dir / baseline_filename

    baseline_word_count = len(baseline_text.split())
    baseline_header = f"""---
# BASELINE OUTPUT (Without Argument Structure)

**Scenario**: {scenario_name}
**Generated**: {timestamp.isoformat()}
**Mode**: BASELINE (argument_structure=None)
**Word Count**: {baseline_word_count:,}

---

> **Note**: This output was generated WITHOUT the scientific analysis argument structure.
> Compare this with the WITH_ANALYSIS version to evaluate the impact of structured analysis.

---

"""
    baseline_content = baseline_header + baseline_text

    try:
        baseline_path.write_text(baseline_content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write baseline comparison output",
            scenario_name=scenario_name,
            output_path=str(baseline_path),
            error=str(e),
        )
        raise

    # Save WITH argument_structure
    with_analysis_filename = f"{safe_name}_WITH_ANALYSIS_{timestamp_str}.md"
    with_analysis_path = date_dir / with_analysis_filename

    with_analysis_word_count = len(with_analysis_text.split())

    analysis_stats_section = ""
    if analysis_stats:
        analysis_stats_section = f"""
## Scientific Analysis Statistics

| Element | Count |
|---------|-------|
| Arguments | {analysis_stats.get("total_arguments", "N/A")} |
| Evidence | {analysis_stats.get("total_evidence", "N/A")} |
| Hypotheses | {analysis_stats.get("total_hypotheses", "N/A")} |
| Conclusions | {analysis_stats.get("total_conclusions", "N/A")} |
| Objectives | {analysis_stats.get("total_objectives", "N/A")} |
| Tasks | {analysis_stats.get("total_tasks", "N/A")} |
| Pivot Points | {analysis_stats.get("pivot_points_found", len(analysis_stats.get("pivot_points", [])))} |"""  # type: ignore[arg-type]

    baseline_header = baseline_header + """

"""

    with_analysis_header = f"""---
# WITH ANALYSIS OUTPUT (With Argument Structure)

**Scenario**: {scenario_name}
**Generated**: {timestamp.isoformat()}
**Mode**: WITH_ANALYSIS (argument_structure=aggregated data)
**Word Count**: {with_analysis_word_count:,}

---

> **Note**: This output was generated WITH the scientific analysis argument structure.
> The LLM received extracted arguments, evidence, objectives, and tasks from source materials.

{analysis_stats_section}---

"""
    with_analysis_content = with_analysis_header + with_analysis_text

    try:
        with_analysis_path.write_text(with_analysis_content, encoding="utf-8")
    except (PermissionError, OSError) as e:
        logger.error(
            "Failed to write with-analysis comparison output",
            scenario_name=scenario_name,
            output_path=str(with_analysis_path),
            error=str(e),
        )
        raise

    logger.info(
        "Saved comparison outputs",
        scenario_name=scenario_name,
        baseline_path=str(baseline_path),
        baseline_words=baseline_word_count,
        with_analysis_path=str(with_analysis_path),
        with_analysis_words=with_analysis_word_count,
        word_difference=with_analysis_word_count - baseline_word_count,
    )

    return baseline_path, with_analysis_path
