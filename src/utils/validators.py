from collections import defaultdict
from re import Pattern
from re import compile as compile_regex
from typing import Final, Literal

from src.db.json_objects import GrantSection
from src.exceptions import ValidationError

MARKDOWN_HEADING_PATTERN: Final[Pattern[str]] = compile_regex(r"^#{1,6}\s+[A-Za-z\s]+$")
SECTION_HEADING_PATTERN: Final[Pattern[str]] = compile_regex(r"^#+ \{\{([a-zA-Z0-9_]+)\.title\}\}$")
SECTION_CONTENT_PATTERN: Final[Pattern[str]] = compile_regex(r"^\{\{([a-zA-Z0-9_]+)\.content\}\}$")


def validate_grant_template(text: str, sections: list[GrantSection]) -> None:
    """Validate a grant template against a list of valid sections.

    Args:
        text: The grant template text.
        sections: The list of valid sections.

    Raises:
        ValidationError: If the template is invalid.

    Returns:
        None
    """
    section_names = {section["name"] for section in sections}
    depends_on_map = {section["name"]: section.get("depends_on", []) for section in sections}

    found_sections: defaultdict[str, set[Literal["title", "content"]]] = defaultdict(set)

    for line in text.splitlines():
        if line := line.strip():
            if heading_match := SECTION_HEADING_PATTERN.match(line):
                section_name = heading_match.group(1)
                if section_name not in section_names:
                    raise ValidationError(f"Invalid section name '{section_name}' in heading")
                found_sections.setdefault(section_name, set()).add("title")
            elif content_match := SECTION_CONTENT_PATTERN.match(line):
                section_name = content_match.group(1)
                if section_name not in section_names:
                    raise ValidationError(f"Invalid section name '{section_name}' in content")
                found_sections.setdefault(section_name, set()).add("content")
            elif not (MARKDOWN_HEADING_PATTERN.match(line)):
                raise ValidationError("Lines must be either headings with '.title' variables or regular headings")

    for section_name in section_names:
        if section_name not in found_sections:
            raise ValidationError(f"Template is missing required section '{section_name}'")
        if found_sections[section_name] != {"title", "content"}:
            raise ValidationError(f"Section '{section_name}' is missing required parts")

        for dependency in depends_on_map.get(section_name, []):
            if dependency not in found_sections:
                raise ValidationError(
                    f"Section '{section_name}' depends on '{dependency}', which is missing from the template"
                )
