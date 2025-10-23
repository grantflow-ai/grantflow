"""
Red Team Logger - Captures final grant application outputs for review and testing.

This module provides functionality to save complete grant application text
after all pipeline stages complete, including NLP evaluation.
"""

from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantElement, GrantLongFormSection

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
    Save final grant application output to file for red team review.

    Args:
        application_id: UUID of the grant application
        application_title: Title of the grant application
        application_text: Complete generated application text
        output_format: Output format - 'md' (markdown) or 'txt' (plain text)
        output_dir: Optional custom output directory (default: testing/results/red_team/)

    Returns:
        Path to the saved output file

    Example:
        >>> path = save_application_output(
        ...     application_id="123e4567-e89b-12d3-a456-426614174000",
        ...     application_title="Novel CRISPR Therapeutics",
        ...     application_text="# Abstract\\n\\nThis proposal...",
        ...     output_format="md",
        ... )
        >>> print(path)
        testing/results/red_team/2025-01-15/novel_crispr_therapeutics_20250115_143022.md
    """
    # Determine output directory
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "red_team"
    else:
        base_dir = Path(output_dir)

    # Create timestamp-based subdirectory
    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename from title and timestamp
    safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in application_title)
    safe_title = safe_title.replace(" ", "_").lower()[:50]  # Limit length
    filename = f"{safe_title}_{timestamp.strftime('%Y%m%d_%H%M%S')}.{output_format}"
    output_path = date_dir / filename

    # Add metadata header
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

    # Write to file
    full_content = header + application_text
    output_path.write_text(full_content, encoding="utf-8")

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
    grant_sections: list["GrantElement | GrantLongFormSection"],
    section_texts: dict[str, str],
    output_dir: str | None = None,
) -> Path:
    """
    Save detailed section-by-section breakdown for analysis.

    Args:
        application_id: UUID of the grant application
        application_title: Title of the grant application
        grant_sections: List of grant sections from template
        section_texts: Dictionary mapping section IDs to generated text
        output_dir: Optional custom output directory

    Returns:
        Path to the saved breakdown file

    Example:
        >>> path = save_sections_breakdown(
        ...     application_id="123e4567-e89b-12d3-a456-426614174000",
        ...     application_title="Novel CRISPR Therapeutics",
        ...     grant_sections=[...],
        ...     section_texts={"abstract": "...", "aims": "..."},
        ... )
    """
    # Determine output directory
    if output_dir is None:
        base_dir = Path(__file__).parents[4] / "testing" / "results" / "red_team" / "sections"
    else:
        base_dir = Path(output_dir)

    # Create timestamp-based subdirectory
    timestamp = datetime.now(UTC)
    date_dir = base_dir / timestamp.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename
    safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in application_title)
    safe_title = safe_title.replace(" ", "_").lower()[:50]
    filename = f"{safe_title}_sections_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    output_path = date_dir / filename

    # Build breakdown content
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

    # Add each section
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
    output_path.write_text(content, encoding="utf-8")

    logger.info(
        "Saved red team sections breakdown",
        application_id=application_id,
        output_path=str(output_path),
        sections_count=len(section_texts),
    )

    return output_path
