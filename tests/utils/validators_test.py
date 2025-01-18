import pytest

from src.db.json_objects import GrantSection
from src.exceptions import ValidationError
from src.utils.validators import validate_grant_template, validate_section_length_constraints
from tests.factories import GrantSectionFactory


def test_valid_template() -> None:
    template = """
# {{project_summary.title}}
{{project_summary.content}}

# Research Strategy
## {{significance_and_innovation.title}}
{{significance_and_innovation.content}}

## {{approach.title}}
{{approach.content}}

### {{imaging_improvement.title}}
{{imaging_improvement.content}}

### {{clinical_translation.title}}
{{clinical_translation.content}}

### {{pathology_diagnosis_treatment.title}}
{{pathology_diagnosis_treatment.content}}

# {{resource_sharing_plan.title}}
{{resource_sharing_plan.content}}

# {{data_management_plan.title}}
{{data_management_plan.content}}

# {{human_subjects_section.title}}
{{human_subjects_section.content}}
"""
    sections = [
        GrantSectionFactory.build(
            name="project_summary",
            depends_on=[],
        ),
        GrantSectionFactory.build(
            name="significance_and_innovation",
            depends_on=[],
        ),
        GrantSectionFactory.build(
            name="approach",
            depends_on=[],
        ),
        GrantSectionFactory.build(
            name="imaging_improvement",
            depends_on=["approach"],
        ),
        GrantSectionFactory.build(
            name="clinical_translation",
            depends_on=["approach"],
        ),
        GrantSectionFactory.build(
            name="pathology_diagnosis_treatment",
            depends_on=["approach"],
        ),
        GrantSectionFactory.build(
            name="resource_sharing_plan",
            depends_on=[],
        ),
        GrantSectionFactory.build(
            name="data_management_plan",
            depends_on=[],
        ),
        GrantSectionFactory.build(
            name="human_subjects_section",
            depends_on=[],
        ),
    ]
    validate_grant_template(template, sections)


sample_sections = [
    {"name": "Introduction", "depends_on": []},
    {"name": "Methods", "depends_on": ["Introduction"]},
    {"name": "Results", "depends_on": ["Methods"]},
]


@pytest.mark.parametrize(
    "text, sections, should_raise",
    [
        # Valid template: All sections present and properly formatted
        (
            """\n            # {{Introduction.title}}\n            {{Introduction.content}}\n\n            # {{Methods.title}}\n            {{Methods.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            False,
        ),
        # Missing section: 'Results'
        (
            """\n            # {{Introduction.title}}\n            {{Introduction.content}}\n\n            # {{Methods.title}}\n            {{Methods.content}}\n            """,
            sample_sections,
            True,
        ),
        # Missing content for a section
        (
            """\n            # {{Introduction.title}}\n            \n            # {{Methods.title}}\n            {{Methods.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            True,
        ),
        # Dependency not satisfied: 'Methods' missing but 'Results' present
        (
            """\n            # {{Introduction.title}}\n            {{Introduction.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            True,
        ),
        # Invalid section name
        (
            """\n            # {{Introduction.title}}\n            {{Introduction.content}}\n\n            # {{InvalidSection.title}}\n            {{InvalidSection.content}}\n            """,
            sample_sections,
            True,
        ),
        # Invalid heading format
        (
            """\n            # Introduction\n            {{Introduction.content}}\n\n            # {{Methods.title}}\n            {{Methods.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            True,
        ),
    ],
)
def test_validate_grant_template(text: str, sections: list[GrantSection], should_raise: bool) -> None:
    if should_raise:
        with pytest.raises(ValidationError):
            validate_grant_template(text, sections)
    else:
        validate_grant_template(text, sections)


@pytest.mark.parametrize(
    "text, sections, expected_message",
    [
        # Dependency not satisfied: 'Methods' missing but 'Results' present
        (
            """\n            # {{Introduction.title}}\n            {{Introduction.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            "Section 'Results' depends on 'Methods', which is missing from the template",
        ),
        # Missing content for a section
        (
            """\n            # {{Introduction.title}}\n            \n            # {{Methods.title}}\n            {{Methods.content}}\n\n            # {{Results.title}}\n            {{Results.content}}\n            """,
            sample_sections,
            "Section 'Introduction' is missing required parts",
        ),
    ],
)
def test_validate_grant_template_error_messages(text: str, sections: list[GrantSection], expected_message: str) -> None:
    with pytest.raises(ValidationError, match=expected_message):
        validate_grant_template(text, sections)


@pytest.mark.parametrize(
    "section, should_raise",
    [
        # valid min_words and max_words
        (GrantSectionFactory.build(min_words=10, max_words=100), False),
        # valid min_words
        (GrantSectionFactory.build(min_words=10, max_words=None), False),
        # valid max_words
        (GrantSectionFactory.build(min_words=None, max_words=100), False),
        # min_ words > max_words
        (GrantSectionFactory.build(min_words=1000, max_words=100), True),
        # Invalid max_words
        (GrantSectionFactory.build(min_words=None, max_words=0), True),
        # negative max_words
        (GrantSectionFactory.build(min_words=None, max_words=-1), True),
        # negative min_words
        (GrantSectionFactory.build(min_words=-1, max_words=100), True),
    ],
)
def test_validate_length_constraints(section: GrantSection, should_raise: bool) -> None:
    if should_raise:
        with pytest.raises(ValidationError):
            validate_section_length_constraints(section)
    else:
        validate_section_length_constraints(section)
