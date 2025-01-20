from typing import Any

import pytest

from src.dto import GrantTemplateDTO
from src.exceptions import ValidationError
from src.rag.grant_template.generate_template_data import validator


def create_valid_template() -> GrantTemplateDTO:
    return {
        "name": "Test Grant",
        "template": """# {{introduction.title}}
{{introduction.content}}

# {{methods.title}}
{{methods.content}}

<research_plan>

# {{results.title}}
{{results.content}}""",
        "sections": [
            {
                "name": "introduction",
                "title": "Introduction",
                "instructions": "Write an introduction",
                "keywords": ["background", "context", "objectives"],
                "topics": ["Background Context", "Methodology"],
                "depends_on": [],
                "min_words": 100,
                "max_words": 500,
            },
            {
                "name": "methods",
                "title": "Methods",
                "instructions": "Describe methods",
                "keywords": ["protocol", "analysis", "design"],
                "topics": ["Methodology", "Rationale"],
                "depends_on": ["introduction"],
                "min_words": 200,
                "max_words": 1000,
            },
            {
                "name": "results",
                "title": "Results",
                "instructions": "Present results",
                "keywords": ["findings", "data", "outcomes"],
                "topics": ["Rationale", "Knowledge Translation"],
                "depends_on": ["methods"],
                "min_words": 300,
                "max_words": 1500,
            },
        ],
    }


def test_valid_template() -> None:
    template = create_valid_template()
    validator(template)  # Should not raise


@pytest.mark.parametrize(
    "template_text, expected_message",
    [
        (
            "# {{introduction.title}}\n{{introduction.content}}\n",
            "Template must contain exactly one <research_plan> tag",
        ),
        (
            "# {{introduction.title}}\n{{introduction.content}}\n<research_plan>\n<research_plan>",
            "Template must contain exactly one <research_plan> tag",
        ),
    ],
)
def test_research_plan_tag(template_text: str, expected_message: str) -> None:
    template = create_valid_template()
    template["template"] = template_text
    with pytest.raises(ValidationError, match=expected_message):
        validator(template)


@pytest.mark.parametrize(
    "template_text, missing_section",
    [
        (
            "# {{introduction.title}}\n{{introduction.content}}\n<research_plan>\n# {{results.title}}\n{{results.content}}",
            "methods",
        ),
        (
            "# {{methods.title}}\n{{methods.content}}\n<research_plan>\n# {{results.title}}\n{{results.content}}",
            "introduction",
        ),
    ],
)
def test_missing_required_sections(template_text: str, missing_section: str) -> None:
    template = create_valid_template()
    template["template"] = template_text
    with pytest.raises(ValidationError):
        validator(template)


@pytest.mark.parametrize(
    "section_name, section_content",
    [
        ("undefined", "\n# {{undefined.title}}\n{{undefined.content}}"),
        ("invalid", "\n# {{invalid.title}}\nsome content"),
    ],
)
def test_invalid_section_references(section_name: str, section_content: str) -> None:
    template = create_valid_template()
    template["template"] += section_content
    with pytest.raises(ValidationError):
        validator(template)


@pytest.mark.parametrize(
    "section_field, invalid_value",
    [
        (
            "keywords",
            ["only", "two"],
        ),
        (
            "topics",
            ["invalid_topic"],
        ),
        ("min_words", -100),
        ("max_words", 0),
    ],
)
def test_section_field_validation(section_field: str, invalid_value: Any) -> None:
    """Test validation of various section fields."""
    template = create_valid_template()
    template["sections"][0][section_field] = invalid_value  # type: ignore[literal-required]
    with pytest.raises(ValidationError):
        validator(template)


@pytest.mark.parametrize(
    "min_words, max_words",
    [
        (600, 500),
        (-1, 100),
        (100, 0),
    ],
)
def test_word_count_constraints(min_words: int, max_words: int) -> None:
    template = create_valid_template()
    template["sections"][0]["min_words"] = min_words
    template["sections"][0]["max_words"] = max_words
    with pytest.raises(ValidationError):
        validator(template)


@pytest.mark.parametrize("required_field", ["name", "template", "sections"])
def test_missing_required_fields(required_field: str) -> None:
    template = create_valid_template()
    del template[required_field]  # type: ignore[misc]
    with pytest.raises(ValidationError):
        validator(template)


@pytest.mark.parametrize(
    "required_section_field", ["name", "title", "instructions", "keywords", "topics", "depends_on"]
)
def test_missing_required_section_fields(required_section_field: str) -> None:
    template = create_valid_template()
    del template["sections"][0][required_section_field]  # type: ignore[misc]
    with pytest.raises(ValidationError):
        validator(template)


def test_broken_dependency_chain() -> None:
    template = create_valid_template()
    # Remove methods section but keep results which depends on it
    template["template"] = """# {{introduction.title}}
{{introduction.content}}

<research_plan>

# {{results.title}}
{{results.content}}"""
    with pytest.raises(ValidationError, match="Section 'results' depends on 'methods'"):
        validator(template)


def test_invalid_line_format() -> None:
    template = create_valid_template()
    template["template"] = template["template"].replace("{{introduction.title}}", "introduction.title")
    with pytest.raises(ValidationError, match="Lines must be either headings with"):
        validator(template)
