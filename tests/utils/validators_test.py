import pytest

from src.exceptions import ValidationError
from src.utils.validators import validate_markdown_template


@pytest.mark.parametrize(
    ("template", "should_raise"),
    [
        ("## Valid Heading\n\n{{EXECUTIVE_SUMMARY}}", False),
        ("# Top Level\n## Second Level\n\n{{RESEARCH_SIGNIFICANCE}}", False),
        ("## Invalid Variable\n\n{{INVALID_VARIABLE}}", True),
        ("Invalid Line Content", True),
        ("## Valid Heading\nInvalid Content\n{{EXECUTIVE_SUMMARY}}", True),
        ("##Invalid Heading Format", True),
        ("", False),
        ("\n\n\n", False),
    ],
)
def test_validate_markdown_template(template: str, should_raise: bool) -> None:
    if should_raise:
        with pytest.raises(ValidationError):
            validate_markdown_template(template)
    else:
        validate_markdown_template(template)
