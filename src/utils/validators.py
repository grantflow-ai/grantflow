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

    Returns:
        None
    """
    mapped_sections = {section["name"]: section for section in sections}
    section_names = set(mapped_sections)

    found_sections: defaultdict[str, set[Literal["title", "content"]]] = defaultdict(set)

    _validate_lines(text, section_names, found_sections)
    _validate_sections(section_names, found_sections, mapped_sections)


def _validate_lines(
    text: str, section_names: set[str], found_sections: defaultdict[str, set[Literal["title", "content"]]]
) -> None:
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


def _validate_sections(
    section_names: set[str],
    found_sections: defaultdict[str, set[Literal["title", "content"]]],
    mapped_sections: dict[str, GrantSection],
) -> None:
    for section_name in section_names:
        if section_name not in found_sections:
            raise ValidationError(f"Template is missing required section '{section_name}'")
        if found_sections[section_name] != {"title", "content"}:
            raise ValidationError(f"Section '{section_name}' is missing required parts")

        section = mapped_sections[section_name]

        for dependency in section["depends_on"]:
            if dependency not in found_sections:
                raise ValidationError(
                    f"Section '{section_name}' depends on '{dependency}', which is missing from the template"
                )


def validate_section_length_constraints(section: GrantSection) -> None:
    """Validate the length constraints of a section.

    Args:
        section: The section to validate.

    Raises:
        ValidationError: If the section has invalid length constraints.

    Returns:
        None
    """
    min_words = section.get("min_words")
    max_words = section.get("max_words")
    if min_words is not None and max_words is not None and min_words > max_words:
        raise ValidationError(
            f"Section '{section['name']}' has a minimum word count greater than the maximum word count"
        )

    if min_words is not None and min_words < 0:
        raise ValidationError(f"Section '{section['name']}' has a negative minimum word count")

    if max_words is not None and max_words <= 0:
        raise ValidationError(f"Section '{section['name']}' has a negative or zero maximum word count")
