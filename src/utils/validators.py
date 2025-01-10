from re import compile as compile_regex
from re import match

from src.db.enums import GrantSectionEnum
from src.exceptions import ValidationError

MARKDOWN_HEADING_PATTERN = compile_regex(r"^#{1,6}\s+[A-Za-z\s]+$")
MARKDOWN_VARIABLE_PATTERN = compile_regex("^{{([A-Z_]+)}}$")


def validate_markdown_template(text: str) -> None:
    """Validate that the given text is a valid markdown template.

    Args:
        text: The text to validate.

    Raises:
        ValidationError: If the text is not a valid simple regex

    Returns:
        None
    """
    for line_number, line in enumerate(text.splitlines(), 1):
        if line := line.strip():
            if match(MARKDOWN_HEADING_PATTERN, line):
                continue

            if variable_match := match(MARKDOWN_VARIABLE_PATTERN, line):
                variable_name = variable_match.group(1)
                if variable_name not in GrantSectionEnum.__members__:
                    raise ValidationError(f"Invalid template variable '{variable_name}' on line {line_number}. ")
                continue

            raise ValidationError(
                f"Invalid line {line_number}: '{line}'. "
                "Lines must be either headings (e.g., '## Title') or "
                "variables (e.g., '{{VARIABLE_NAME}}')"
            )
