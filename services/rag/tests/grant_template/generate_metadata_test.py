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
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
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
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Section mismatch detected"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_keywords_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Insufficient keywords provided"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_topics_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Insufficient topics provided"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_generation_instructions_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Generation instructions too short"):
        validate_template_sections(response, input_sections=input_sections)


def test_invalid_max_words_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Insufficient search queries provided"):
        validate_template_sections(response, input_sections=input_sections)


def test_missing_search_queries_raises_validation_error() -> None:
    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
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

    with pytest.raises(ValidationError, match="Insufficient search queries provided"):
        validate_template_sections(response, input_sections=input_sections)


@patch("services.rag.src.utils.completion.make_google_completions_request")
async def test_generate_grant_template_success(mock_google_completions: AsyncMock) -> None:
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
    mock_google_completions.return_value = mock_response

    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
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

    mock_google_completions.assert_called_once()
    call_args = mock_google_completions.call_args
    assert call_args.kwargs["prompt_identifier"] == "grant_template_extraction"


@patch("services.rag.src.utils.completion.make_google_completions_request")
async def test_generate_grant_template_insufficient_context_error(mock_google_completions: AsyncMock) -> None:
    mock_response = {
        "sections": [],
        "error": "Insufficient context to generate metadata for these sections",
    }
    mock_google_completions.return_value = mock_response

    input_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Complex Section",
            "id": "complex_section",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Complex Section",
        }
    ]

    with pytest.raises(InsufficientContextError, match="Insufficient context"):
        await generate_grant_template(
            task_description="Minimal CFP content",
            input_sections=input_sections,
            trace_id="test-trace-123",
        )


@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.utils.retrieval.handle_create_search_queries")
@patch("services.rag.src.utils.completion.make_google_completions_request")
async def test_handle_generate_grant_template_metadata_success(
    mock_google_completions: AsyncMock,
    mock_create_search_queries: AsyncMock,
    mock_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
) -> None:
    mock_metadata = {
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
    mock_google_completions.return_value = mock_metadata

    mock_create_search_queries.return_value = [
        "sample search query 1",
        "sample search query 2",
        "sample search query 3",
    ]

    mock_evaluation.return_value = mock_metadata

    long_form_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
        },
    ]

    organization: OrganizationNamespace = {
        "organization_id": uuid4(),
        "full_name": "National Science Foundation",
        "abbreviation": "NSF",
    }

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="Comprehensive CFP content for advanced research programs",
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

    mock_evaluation.assert_called_once()


@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
async def test_handle_generate_grant_template_metadata_no_long_form_sections(
    mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_evaluation.return_value = {"sections": []}

    long_form_sections: list[ExtractedSectionDTO] = []

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="CFP content without long form sections",
        organization=None,
        long_form_sections=long_form_sections,
        trace_id="test-trace-789",
    )

    assert result == []
    mock_evaluation.assert_called_once()


@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.utils.retrieval.handle_create_search_queries")
async def test_handle_generate_grant_template_metadata_filters_long_form_sections(
    mock_create_search_queries: AsyncMock, mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_metadata = {
        "sections": [
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
    }
    mock_evaluation.return_value = mock_metadata

    mock_create_search_queries.return_value = [
        "sample search query 1",
        "sample search query 2",
        "sample search query 3",
    ]

    all_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Short Title",
            "id": "short_title",
            "order": 1,
            "long_form": False,
            "evidence": "CFP evidence for Short Title",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Brief Summary",
            "id": "brief_summary",
            "order": 3,
            "long_form": False,
            "evidence": "CFP evidence for Brief Summary",
        },
    ]

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="CFP content with mixed section types",
        organization=None,
        long_form_sections=all_sections,
        trace_id="test-trace-mixed",
    )

    assert len(result) == 1
    assert result[0]["id"] == "research_plan"

    mock_evaluation.assert_called_once()


@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.utils.retrieval.handle_create_search_queries")
async def test_handle_generate_grant_template_metadata_preserves_order(
    mock_create_search_queries: AsyncMock, mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_metadata = {
        "sections": [
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
    }
    mock_evaluation.return_value = mock_metadata

    mock_create_search_queries.return_value = [
        "sample search query 1",
        "sample search query 2",
        "sample search query 3",
    ]

    long_form_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
        },
    ]

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="CFP content for order testing",
        organization=None,
        long_form_sections=long_form_sections,
        trace_id="test-trace-order",
    )

    assert len(result) == 2
    assert result[0]["id"] == "research_plan"
    assert result[1]["id"] == "project_summary"

    mock_evaluation.assert_called_once()


@pytest.mark.e2e_full
@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
async def test_integration_generate_metadata_workflow(
    mock_retrieve_docs: AsyncMock, mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_metadata = {
        "sections": [
            {
                "id": "project_summary",
                "keywords": ["cancer", "detection", "biomarkers", "research", "innovation"],
                "topics": ["background", "objectives", "methodology"],
                "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                "depends_on": [],
                "max_words": 500,
                "search_queries": ["cancer detection research", "biomarker discovery"],
            },
            {
                "id": "research_plan",
                "keywords": ["methodology", "research", "plan", "detection"],
                "topics": ["approach", "timeline", "methods"],
                "generation_instructions": "Detailed research methodology and approach",
                "depends_on": ["project_summary"],
                "max_words": 3000,
                "search_queries": ["research methodology", "cancer research plan"],
            },
            {
                "id": "budget_justification",
                "keywords": ["budget", "justification", "costs", "resources"],
                "topics": ["personnel", "equipment", "materials"],
                "generation_instructions": "Justify budget requirements for the project",
                "depends_on": ["research_plan"],
                "max_words": 1000,
                "search_queries": ["budget justification", "research costs"],
            },
        ]
    }
    mock_evaluation.return_value = mock_metadata
    mock_retrieve_docs.return_value = []
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
            "long_form": True,
            "evidence": "CFP evidence for Project Summary",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Budget Justification",
            "id": "budget_justification",
            "order": 3,
            "long_form": True,
            "evidence": "CFP evidence for Budget Justification",
        },
    ]

    organization: OrganizationNamespace = {
        "organization_id": uuid4(),
        "full_name": "National Cancer Institute",
        "abbreviation": "NCI",
    }

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content=cfp_content,
        organization=organization,
        long_form_sections=extracted_sections,
        trace_id="integration-test-001",
    )

    assert len(result) == 3
    assert all(isinstance(section, dict) for section in result)

    project_section = result[0]
    assert project_section["id"] == "project_summary"
    assert len(project_section["keywords"]) >= 3
    assert len(project_section["topics"]) >= 3
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
@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
async def test_integration_generate_metadata_with_dependencies(
    mock_retrieve_docs: AsyncMock, mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_metadata = {
        "sections": [
            {
                "id": "abstract",
                "keywords": ["abstract", "summary", "overview"],
                "topics": ["project_overview"],
                "generation_instructions": "Write a clear abstract summarizing the project",
                "depends_on": [],
                "max_words": 250,
                "search_queries": ["project abstract", "research summary"],
            },
            {
                "id": "background",
                "keywords": ["background", "context", "literature"],
                "topics": ["background_context"],
                "generation_instructions": "Provide background and context for the research",
                "depends_on": ["abstract"],
                "max_words": 800,
                "search_queries": ["research background", "literature review"],
            },
            {
                "id": "methodology",
                "keywords": ["methodology", "methods", "approach"],
                "topics": ["research_methods"],
                "generation_instructions": "Describe the methodology and approach",
                "depends_on": ["background"],
                "max_words": 1200,
                "search_queries": ["research methodology", "experimental design"],
            },
        ]
    }
    mock_evaluation.return_value = mock_metadata
    mock_retrieve_docs.return_value = []
    extracted_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Abstract",
            "id": "abstract",
            "order": 1,
            "long_form": True,
            "evidence": "CFP evidence for Abstract",
        },
        {
            "title": "Background",
            "id": "background",
            "order": 2,
            "long_form": True,
            "evidence": "CFP evidence for Background",
        },
        {
            "title": "Methodology",
            "id": "methodology",
            "order": 3,
            "long_form": True,
            "evidence": "CFP evidence for Methodology",
        },
    ]

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="CFP with dependency requirements",
        organization=None,
        long_form_sections=extracted_sections,
        trace_id="dependency-test-001",
    )

    assert len(result) == 3

    abstract_section = result[0]
    assert abstract_section["id"] == "abstract"
    assert isinstance(abstract_section["depends_on"], list)

    background_section = result[1]
    assert background_section["id"] == "background"
    assert isinstance(background_section["depends_on"], list)

    methodology_section = result[2]
    assert methodology_section["id"] == "methodology"
    assert isinstance(methodology_section["depends_on"], list)


@pytest.mark.e2e_full
@patch("services.rag.src.grant_template.generate_metadata.with_evaluation")
@patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
async def test_integration_generate_metadata_empty_sections(
    mock_retrieve_docs: AsyncMock, mock_evaluation: AsyncMock, mock_job_manager: AsyncMock
) -> None:
    mock_evaluation.return_value = {"sections": []}
    mock_retrieve_docs.return_value = []
    extracted_sections: list[ExtractedSectionDTO] = []

    result = await handle_generate_grant_template_metadata(
        job_manager=mock_job_manager,
        cfp_content="CFP with no long form sections",
        organization=None,
        long_form_sections=extracted_sections,
        trace_id="empty-test-001",
    )

    assert result == []
