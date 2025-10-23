# Red Team Output Logger

This directory contains grant application outputs captured by the red team logger for review and testing.

## Purpose

The red team logger automatically saves final grant application outputs after the complete pipeline runs (including NLP evaluation). This enables:

- Manual review of generated content quality
- Comparison across different test scenarios
- Historical tracking of application outputs
- Red team evaluation and feedback

## Directory Structure

```
red_team/
├── YYYY-MM-DD/              # Date-organized full applications
│   └── application_name_timestamp.md
└── sections/
    └── YYYY-MM-DD/          # Date-organized section breakdowns
        └── application_name_sections_timestamp.md
```

## File Formats

### Full Application Output

Located in `YYYY-MM-DD/application_name_timestamp.md`

Contains:
- Metadata header (Application ID, title, timestamp, word/character counts)
- Complete grant application text with all sections
- Markdown formatting preserved

Example:
```markdown
---
Application ID: 123e4567-e89b-12d3-a456-426614174000
Title: Novel CRISPR Therapeutics
Generated: 2025-01-23T14:30:22.123456
Word Count: 8,450
Character Count: 52,340
Output Format: md
---

# Abstract
...
```

### Section Breakdown

Located in `sections/YYYY-MM-DD/application_name_sections_timestamp.md`

Contains:
- Application metadata
- Each section with ID, word count, character count
- Full section text
- Separators between sections

Example:
```markdown
# Section Breakdown: Novel CRISPR Therapeutics

**Application ID**: 123e4567-e89b-12d3-a456-426614174000
**Generated**: 2025-01-23T14:30:22.123456
**Total Sections**: 7

---

## Abstract

**Section ID**: `abstract`
**Word Count**: 285
**Character Count**: 1,850

[Section text here...]

---

## Specific Aims
...
```

## How It Works

The red team logger is integrated into the grant application pipeline at [services/rag/src/grant_application/pipeline.py:675-695](services/rag/src/grant_application/pipeline.py#L675-L695).

When the pipeline completes:
1. Final application text is generated from all sections
2. Red team logger automatically saves:
   - Full application markdown file
   - Detailed section-by-section breakdown
3. Files are organized by date for easy navigation
4. Logging is non-fatal - if it fails, pipeline continues normally

## Code Location

- **Logger Module**: [services/rag/src/utils/red_team_logger.py](../../../services/rag/src/utils/red_team_logger.py)
- **Pipeline Integration**: [services/rag/src/grant_application/pipeline.py](../../../services/rag/src/grant_application/pipeline.py)
- **Test Script**: [testing/manual_tests/test_red_team_output.py](../../manual_tests/test_red_team_output.py)

## Usage

### Automatic (via Pipeline)

The logger runs automatically when the grant application pipeline completes successfully. No action needed.

### Manual (for Testing)

```python
from services.rag.src.utils.red_team_logger import save_application_output, save_sections_breakdown

# Save full application
save_application_output(
    application_id="uuid-here",
    application_title="Application Title",
    application_text="Full markdown text...",
    output_format="md"
)

# Save section breakdown
save_sections_breakdown(
    application_id="uuid-here",
    application_title="Application Title",
    grant_sections=[...],  # List of GrantElement/GrantLongFormSection
    section_texts={"section_id": "text", ...}
)
```

### Run Test

```bash
PYTHONPATH=. uv run python testing/manual_tests/test_red_team_output.py
```

## Output Review

After pipeline completion, check the most recent directory:

```bash
# List today's outputs
ls -lh testing/results/red_team/$(date +%Y-%m-%d)/

# View full application
cat testing/results/red_team/$(date +%Y-%m-%d)/*.md

# View section breakdown
cat testing/results/red_team/sections/$(date +%Y-%m-%d)/*.md
```

## Metadata Captured

Each output file includes:
- **Application ID**: UUID for database lookup
- **Title**: Human-readable application title
- **Timestamp**: ISO format generation time
- **Word Count**: Total words in application
- **Character Count**: Total characters
- **Section Details**: Per-section word/character counts

## Notes

- Files are never automatically deleted - manual cleanup required
- Output format is always markdown for readability
- Logger failure does not block pipeline completion
- Suitable for both E2E tests and production runs
