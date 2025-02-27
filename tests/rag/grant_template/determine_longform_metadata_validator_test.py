import pytest

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.grant_template.determine_application_sections import ExtractedSectionDTO
from src.rag.grant_template.determine_longform_metadata import (
    SectionMetadata,
    validate_template_sections,
)


def create_extracted_section(
    *,
    section_id: str,
    title: str = "Test Section",
    order: int = 1,
    parent_id: str | None = None,
    is_detailed_workplan: bool | None = None,
    is_long_form: bool = True,
    is_title_only: bool | None = None,
    is_clinical_trial: bool | None = None,
) -> ExtractedSectionDTO:
    """Create a test section for use in tests."""
    return {
        "id": section_id,
        "title": title,
        "order": order,
        "parent_id": parent_id,
        "is_detailed_workplan": is_detailed_workplan,
        "is_long_form": is_long_form,
        "is_title_only": is_title_only,
        "is_clinical_trial": is_clinical_trial,
    }


def create_section_metadata(
    *,
    section_id: str,
    keywords: list[str] | None = None,
    topics: list[str] | None = None,
    generation_instructions: str = "This is a detailed instruction on how to generate content for this section.",
    depends_on: list[str] | None = None,
    max_words: int = 500,
    search_queries: list[str] | None = None,
) -> SectionMetadata:
    """Create a test section metadata for use in tests."""
    return {
        "id": section_id,
        "keywords": keywords or ["keyword1", "keyword2", "keyword3"],
        "topics": topics or ["topic1", "topic2"],
        "generation_instructions": generation_instructions,
        "depends_on": depends_on or [],
        "max_words": max_words,
        "search_queries": search_queries or ["query1", "query2", "query3"],
    }


def test_validate_empty_sections() -> None:
    """Test validation of empty sections."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with empty sections
    with pytest.raises(ValidationError) as validation_exc:
        validate_template_sections({"sections": []}, input_sections=input_sections)
    assert "No sections generated" in str(validation_exc.value)

    # Test with error message
    with pytest.raises(InsufficientContextError) as insufficient_context_exc:
        validate_template_sections({"sections": [], "error": "test error"}, input_sections=input_sections)
    assert "test error" in str(insufficient_context_exc.value)


def test_validate_section_mismatch() -> None:
    """Test validation of section ID mismatch."""
    input_sections = [
        create_extracted_section(section_id="section_one", is_detailed_workplan=True),
        create_extracted_section(section_id="section_two"),
    ]

    # Test with added sections
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one"),
                    create_section_metadata(section_id="section_two"),
                    create_section_metadata(section_id="section_three"),  # Extra section
                ]
            },
            input_sections=input_sections,
        )
    assert "Section mismatch detected" in str(exc.value)
    assert "added_sections" in str(exc.value)

    # Test with missing sections
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {"sections": [create_section_metadata(section_id="section_one")]},  # Missing section_two
            input_sections=input_sections,
        )
    assert "Section mismatch detected" in str(exc.value)
    assert "removed_sections" in str(exc.value)


def test_validate_keywords() -> None:
    """Test validation of keywords."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with insufficient keywords
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", keywords=["keyword1", "keyword2"]),  # Less than 3
                ]
            },
            input_sections=input_sections,
        )
    assert "Insufficient keywords provided" in str(exc.value)

    # Test with valid keywords
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(
                    section_id="section_one", keywords=["keyword1", "keyword2", "keyword3"]
                ),  # Exactly 3
            ]
        },
        input_sections=input_sections,
    )


def test_validate_topics() -> None:
    """Test validation of topics."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with insufficient topics
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", topics=["topic1"]),  # Less than 2
                ]
            },
            input_sections=input_sections,
        )
    assert "Insufficient topics provided" in str(exc.value)

    # Test with valid topics
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(section_id="section_one", topics=["topic1", "topic2"]),  # Exactly 2
            ]
        },
        input_sections=input_sections,
    )


def test_validate_generation_instructions() -> None:
    """Test validation of generation instructions."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with short instructions
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(
                        section_id="section_one", generation_instructions="Short"
                    ),  # Less than 50 chars
                ]
            },
            input_sections=input_sections,
        )
    assert "Generation instructions too short" in str(exc.value)

    # Test with valid instructions
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(
                    section_id="section_one",
                    generation_instructions="This is a sufficiently long instruction that exceeds 50 characters in length.",
                ),
            ]
        },
        input_sections=input_sections,
    )


def test_validate_search_queries() -> None:
    """Test validation of search queries."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with insufficient queries
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(
                        section_id="section_one", search_queries=["query1", "query2"]
                    ),  # Less than 3
                ]
            },
            input_sections=input_sections,
        )
    assert "Insufficient search queries provided" in str(exc.value)

    # Test with valid queries
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(
                    section_id="section_one", search_queries=["query1", "query2", "query3"]
                ),  # Exactly 3
            ]
        },
        input_sections=input_sections,
    )


def test_validate_dependencies() -> None:
    """Test validation of dependencies."""
    input_sections = [
        create_extracted_section(section_id="section_one"),
        create_extracted_section(section_id="section_two", is_detailed_workplan=True),
    ]

    # Test with invalid dependency
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", depends_on=["nonexistent_section"]),
                    create_section_metadata(section_id="section_two"),
                ]
            },
            input_sections=input_sections,
        )
    assert "Invalid section dependency" in str(exc.value)

    # Test with circular dependency (self-reference)
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", depends_on=["section_one"]),  # Self-reference
                    create_section_metadata(section_id="section_two"),
                ]
            },
            input_sections=input_sections,
        )
    assert "Section cannot depend on itself" in str(exc.value)

    # Test with valid dependency
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(section_id="section_one", depends_on=["section_two"]),
                create_section_metadata(section_id="section_two"),
            ]
        },
        input_sections=input_sections,
    )


def test_validate_word_count() -> None:
    """Test validation of word count."""
    input_sections = [create_extracted_section(section_id="section_one", is_detailed_workplan=True)]

    # Test with zero word count
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", max_words=0),  # Zero words
                ]
            },
            input_sections=input_sections,
        )
    assert "Invalid word count" in str(exc.value)

    # Test with negative word count
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", max_words=-100),  # Negative words
                ]
            },
            input_sections=input_sections,
        )
    assert "Invalid word count" in str(exc.value)

    # Test with valid word count
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(section_id="section_one", max_words=500),  # Positive word count
            ]
        },
        input_sections=input_sections,
    )


def test_validate_workplan_word_count() -> None:
    """Test validation of workplan word count."""
    input_sections = [
        create_extracted_section(section_id="workplan_section", is_detailed_workplan=True),
        create_extracted_section(section_id="other_section"),
    ]

    # Test with insufficient workplan word count
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="workplan_section", max_words=50),  # Less than 100 words
                    create_section_metadata(section_id="other_section", max_words=500),
                ]
            },
            input_sections=input_sections,
        )
    assert "Workplan section requires more substantial word count" in str(exc.value)

    # Test with sufficient workplan word count
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(section_id="workplan_section", max_words=500),  # More than 100 words
                create_section_metadata(section_id="other_section", max_words=300),
            ]
        },
        input_sections=input_sections,
    )


def test_validate_total_word_count() -> None:
    """Test validation of total word count."""
    input_sections = [
        create_extracted_section(section_id="section_one", is_detailed_workplan=False),
        create_extracted_section(section_id="section_two", is_detailed_workplan=False),
    ]

    # Test with low total word count
    with pytest.raises(ValidationError) as exc:
        validate_template_sections(
            {
                "sections": [
                    create_section_metadata(section_id="section_one", max_words=20),
                    create_section_metadata(section_id="section_two", max_words=20),  # Total: 40 (less than 50)
                ]
            },
            input_sections=input_sections,
        )
    assert "Total word count allocation is unreasonably low" in str(exc.value)

    # Test with reasonable total word count
    validate_template_sections(
        {
            "sections": [
                create_section_metadata(section_id="section_one", max_words=500),
                create_section_metadata(section_id="section_two", max_words=300),  # Total: 800
            ]
        },
        input_sections=input_sections,
    )
