from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError

from services.rag.src.grant_template.generate_metadata import (
    TemplateSectionsResponse,
    generate_grant_template,
    handle_generate_grant_template_metadata,
    validate_template_sections,
)

if TYPE_CHECKING:
    from packages.shared_utils.src.dto import ExtractedSectionDTO, OrganizationNamespace, SectionMetadata


def test_section_metadata_structure() -> None:
    metadata: SectionMetadata = {
        "id": "project_summary",
        "keywords": ["research", "innovation", "methodology"],
        "topics": ["background", "objectives"],
        "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
        "depends_on": ["research_plan"],
        "max_words": 300,
        "search_queries": ["project summary examples", "research objectives format"],
    }

    assert metadata["id"] == "project_summary"
    assert len(metadata["keywords"]) == 3
    assert len(metadata["topics"]) == 2
    assert len(metadata["generation_instructions"]) > 50
    assert metadata["max_words"] == 300
    assert len(metadata["search_queries"]) == 2


def test_valid_template_sections() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                    "grant proposal structure",
                ],
            },
            {
                "id": "research_plan",
                "keywords": ["methodology", "approach", "design"],
                "topics": ["methods", "timeline"],
                "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
                "depends_on": ["project_summary"],
                "max_words": 2000,
                "search_queries": [
                    "research methodology examples",
                    "project timeline format",
                    "detailed research plan",
                ],
            },
        ]
    }

    validate_template_sections(response, input_sections=input_sections)


def test_error_field_raises_insufficient_context() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [],
        "error": "Insufficient context to generate metadata",
    }

    with pytest.raises(InsufficientContextError, match="Insufficient context"):
        validate_template_sections(response, input_sections=input_sections)


def test_empty_sections_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {"sections": []}

    with pytest.raises(ValidationError, match="No sections generated"):
        validate_template_sections(response, input_sections=input_sections)


def test_section_id_mismatch_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "different_id",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                ],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Section ID mismatch"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_keywords_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": [],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                ],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Keywords are required"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_topics_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": [],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                ],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Topics are required"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_generation_instructions_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                ],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Generation instructions are required"):
        validate_template_sections(response, input_sections=input_sections)


def test_invalid_max_words_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 0,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                ],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Max words must be greater than 0"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_search_queries_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        }
    ]

    response: TemplateSectionsResponse = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [],
            }
        ]
    }

    with pytest.raises(ValidationError, match="Search queries are required"):
        validate_template_sections(response, input_sections=input_sections)


@patch("services.rag.src.grant_template.generate_metadata.generate_grant_template")
async def test_generate_grant_template_success(mock_generate_grant_template: AsyncMock) -> None:
    mock_response = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["research", "innovation", "methodology"],
                "topics": ["background", "objectives"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
                "depends_on": [],
                "max_words": 300,
                "search_queries": [
                    "project summary examples",
                    "research objectives format",
                    "grant proposal structure",
                ],
            },
            {
                "id": "research_plan",
                "keywords": ["methodology", "approach", "design"],
                "topics": ["methods", "timeline"],
                "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
                "depends_on": ["project_summary"],
                "max_words": 2000,
                "search_queries": [
                    "research methodology examples",
                    "project timeline format",
                    "detailed research plan",
                ],
            },
        ]
    }
    mock_generate_grant_template.return_value = mock_response

    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
    ]

    result = await generate_grant_template(
        task_description="Sample CFP content for research grants",
        input_sections=input_sections,
        trace_id="test-trace-123",
    )

    assert len(result["sections"]) == 2

    project_section = result["sections"][0]
    assert project_section["id"] == "project_summary"
    assert project_section["keywords"] == ["research", "innovation", "methodology"]
    assert len(project_section["search_queries"]) == 3

    research_section = result["sections"][1]
    assert research_section["id"] == "research_plan"
    assert research_section["depends_on"] == ["project_summary"]

    mock_generate_grant_template.assert_called_once()
    call_args = mock_generate_grant_template.call_args
    assert "task_description" in call_args.kwargs
    assert "trace_id" in call_args.kwargs
    assert call_args.kwargs["trace_id"] == "test-trace-123"


@patch("services.rag.src.grant_template.generate_metadata.generate_grant_template")
async def test_generate_grant_template_insufficient_context_error(mock_generate_grant_template: AsyncMock) -> None:
    mock_response = {
        "sections": [],
        "error": "Insufficient context to generate metadata for these sections",
    }
    mock_generate_grant_template.return_value = mock_response

    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Complex Section",
            "id": "complex_section",
            "order": 1,
            "is_long_form": True,
        }
    ]

    with pytest.raises(InsufficientContextError, match="Insufficient context"):
        await generate_grant_template(
            task_description="Minimal CFP content",
            input_sections=input_sections,
            trace_id="test-trace-123",
        )


@patch("services.rag.src.grant_template.generate_metadata.handle_completions_request")
async def test_handle_generate_grant_template_metadata_success(mock_completions: AsyncMock) -> None:
    mock_metadata = [
        {
            "id": "project_summary",
            "keywords": ["research", "innovation", "methodology"],
            "topics": ["background", "objectives"],
            "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
            "depends_on": [],
            "max_words": 300,
            "search_queries": [
                "project summary examples",
                "research objectives format",
                "grant proposal structure",
            ],
        },
        {
            "id": "research_plan",
            "keywords": ["methodology", "approach", "design"],
            "topics": ["methods", "timeline"],
            "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
            "depends_on": ["project_summary"],
            "max_words": 2000,
            "search_queries": [
                "research methodology examples",
                "project timeline format",
                "detailed research plan",
            ],
        },
    ]
    mock_completions.return_value = mock_metadata

    long_form_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
    ]

    organization: OrganizationNamespace = {
        "organization_id": uuid4(),
        "full_name": "National Science Foundation",
        "abbreviation": "NSF",
    }

    result = await handle_generate_grant_template_metadata(
        cfp_content="Comprehensive CFP content for advanced research programs",
        cfp_subject="National Research Initiative",
        organization=organization,
        long_form_sections=long_form_sections,
        trace_id="test-trace-456",
    )

    assert len(result) == 2
    assert all(isinstance(section, dict) for section in result)

    project_section = result[0]
    assert project_section["id"] == "project_summary"
    assert "keywords" in project_section
    assert "topics" in project_section

    research_section = result[1]
    assert research_section["id"] == "research_plan"
    assert research_section["depends_on"] == ["project_summary"]

    mock_completions.assert_called_once()
    call_args = mock_completions.call_args
    assert "task_description" in call_args.kwargs
    assert "trace_id" in call_args.kwargs
    assert call_args.kwargs["trace_id"] == "test-trace-456"


@patch("services.rag.src.grant_template.generate_metadata.handle_completions_request")
async def test_handle_generate_grant_template_metadata_no_long_form_sections(mock_completions: AsyncMock) -> None:
    mock_completions.return_value = []

    long_form_sections: list[ExtractedSectionDTO] = []

    result = await handle_generate_grant_template_metadata(
        cfp_content="CFP content without long form sections",
        cfp_subject="Short Form Grant",
        organization=None,
        long_form_sections=long_form_sections,
        trace_id="test-trace-789",
    )

    assert result == []
    mock_completions.assert_called_once()


@patch("services.rag.src.grant_template.generate_metadata.generate_grant_template")
async def test_handle_generate_grant_template_metadata_filters_long_form_sections(mock_generate: AsyncMock) -> None:
    mock_metadata = [
        {
            "id": "research_plan",
            "keywords": ["methodology", "approach", "design"],
            "topics": ["methods", "timeline"],
            "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
            "depends_on": [],
            "max_words": 2000,
            "search_queries": [
                "research methodology examples",
                "project timeline format",
                "detailed research plan",
            ],
        }
    ]
    mock_generate.return_value = mock_metadata

    all_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Short Title",
            "id": "short_title",
            "order": 1,
            "is_long_form": False,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
        {
            "title": "Brief Summary",
            "id": "brief_summary",
            "order": 3,
            "is_long_form": False,
        },
    ]

    result = await handle_generate_grant_template_metadata(
        cfp_content="CFP content with mixed section types",
        cfp_subject="Mixed Sections Grant",
        organization=None,
        long_form_sections=all_sections,
        trace_id="test-trace-mixed",
    )

    assert len(result) == 1
    assert result[0]["id"] == "research_plan"

    mock_generate.assert_called_once()


@patch("services.rag.src.grant_template.generate_metadata.generate_grant_template")
async def test_handle_generate_grant_template_metadata_preserves_order(mock_generate: AsyncMock) -> None:
    mock_metadata = [
        {
            "id": "research_plan",
            "keywords": ["methodology"],
            "topics": ["methods"],
            "generation_instructions": "Research methodology",
            "depends_on": [],
            "max_words": 2000,
            "search_queries": ["research methods"],
        },
        {
            "id": "project_summary",
            "keywords": ["summary"],
            "topics": ["overview"],
            "generation_instructions": "Project overview",
            "depends_on": [],
            "max_words": 300,
            "search_queries": ["project summary"],
        },
    ]
    mock_generate.return_value = mock_metadata

    long_form_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        },
    ]

    result = await handle_generate_grant_template_metadata(
        cfp_content="CFP content for order testing",
        cfp_subject="Order Test Grant",
        organization=None,
        long_form_sections=long_form_sections,
        trace_id="test-trace-order",
    )

    assert len(result) == 2
    assert result[0]["id"] == "research_plan"
    assert result[1]["id"] == "project_summary"

    mock_generate.assert_called_once()


@pytest.mark.e2e_full
@pytest.mark.e2e_full
async def test_integration_generate_metadata_workflow() -> None:
    mock_metadata = [
        {
            "id": "project_summary",
            "keywords": ["biomarkers", "diagnostics", "innovation"],
            "topics": ["cancer research", "early detection"],
            "generation_instructions": "Develop a comprehensive project summary focusing on novel biomarker discovery for early cancer detection",
            "depends_on": [],
            "max_words": 500,
            "search_queries": [
                "cancer biomarker discovery",
                "early detection methods",
                "diagnostic innovation",
            ],
        },
        {
            "id": "research_plan",
            "keywords": ["proteomics", "genomics", "validation"],
            "topics": ["experimental design", "clinical validation"],
            "generation_instructions": "Detail the research methodology including proteomics analysis, genomic profiling, and clinical validation studies",
            "depends_on": ["project_summary"],
            "max_words": 3000,
            "search_queries": [
                "proteomics methodology",
                "genomic analysis techniques",
                "clinical validation protocols",
            ],
        },
        {
            "id": "budget_justification",
            "keywords": ["equipment", "personnel", "resources"],
            "topics": ["cost analysis", "resource allocation"],
            "generation_instructions": "Provide detailed budget justification including equipment costs, personnel requirements, and resource allocation",
            "depends_on": ["research_plan"],
            "max_words": 1000,
            "search_queries": [
                "research budget planning",
                "equipment cost analysis",
                "personnel resource allocation",
            ],
        },
    ]

    cfp_content = """
    National Cancer Institute Research Grant Program

    The NCI seeks innovative research proposals for early cancer detection and diagnosis.
    Proposals should include comprehensive research plans with detailed methodologies,
    clear project summaries, and justified budget requirements.

    Required sections:
    - Project Summary (max 500 words)
    - Research Plan (detailed methodology, max 3000 words)
    - Budget Justification (max 1000 words)

    Evaluation criteria include innovation, feasibility, and potential impact.
    """

    extracted_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
        },
        {
            "title": "Budget Justification",
            "id": "budget_justification",
            "order": 3,
            "is_long_form": True,
        },
    ]

    organization: OrganizationNamespace = {
        "organization_id": uuid4(),
        "full_name": "National Cancer Institute",
        "abbreviation": "NCI",
    }

    result = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content,
        cfp_subject="Novel Biomarkers for Early Cancer Detection",
        organization=organization,
        long_form_sections=extracted_sections,
        trace_id="integration-test-001",
    )

    assert len(result) == 3
    assert all(isinstance(section, dict) for section in result)

    project_section = result[0]
    assert project_section["id"] == "project_summary"
    assert "biomarkers" in project_section["keywords"]
    assert "cancer research" in project_section["topics"]
    assert project_section["max_words"] == 500

    research_section = result[1]
    assert research_section["id"] == "research_plan"
    assert research_section["depends_on"] == ["project_summary"]
    assert research_section["max_words"] == 3000

    budget_section = result[2]
    assert budget_section["id"] == "budget_justification"
    assert budget_section["depends_on"] == ["research_plan"]
    assert budget_section["max_words"] == 1000


@pytest.mark.e2e_full
@pytest.mark.e2e_full
async def test_integration_generate_metadata_with_dependencies() -> None:
    mock_metadata = [
        {
            "id": "abstract",
            "keywords": ["overview", "summary"],
            "topics": ["project goals"],
            "generation_instructions": "Brief project overview",
            "depends_on": [],
            "max_words": 250,
            "search_queries": ["abstract examples"],
        },
        {
            "id": "background",
            "keywords": ["literature", "context"],
            "topics": ["research background"],
            "generation_instructions": "Research background and context",
            "depends_on": ["abstract"],
            "max_words": 1000,
            "search_queries": ["research background"],
        },
        {
            "id": "methodology",
            "keywords": ["methods", "approach"],
            "topics": ["experimental design"],
            "generation_instructions": "Detailed research methodology",
            "depends_on": ["background"],
            "max_words": 2000,
            "search_queries": ["research methods"],
        },
    ]

    extracted_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Abstract",
            "id": "abstract",
            "order": 1,
            "is_long_form": True,
        },
        {
            "title": "Background",
            "id": "background",
            "order": 2,
            "is_long_form": True,
        },
        {
            "title": "Methodology",
            "id": "methodology",
            "order": 3,
            "is_long_form": True,
        },
    ]

    result = await handle_generate_grant_template_metadata(
        cfp_content="CFP with dependency requirements",
        cfp_subject="Dependent Sections Grant",
        organization=None,
        long_form_sections=extracted_sections,
        trace_id="dependency-test-001",
    )

    assert len(result) == 3

    abstract_section = result[0]
    assert abstract_section["id"] == "abstract"
    assert abstract_section["depends_on"] == []

    background_section = result[1]
    assert background_section["id"] == "background"
    assert background_section["depends_on"] == ["abstract"]

    methodology_section = result[2]
    assert methodology_section["id"] == "methodology"
    assert methodology_section["depends_on"] == ["background"]


@pytest.mark.e2e_full
@pytest.mark.e2e_full
async def test_integration_generate_metadata_empty_sections() -> None:
    extracted_sections: list[ExtractedSectionDTO] = []

    result = await handle_generate_grant_template_metadata(
        cfp_content="CFP with no long form sections",
        cfp_subject="No Sections Grant",
        organization=None,
        long_form_sections=extracted_sections,
        trace_id="empty-test-001",
    )

    assert result == []
