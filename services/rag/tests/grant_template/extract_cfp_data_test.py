from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.tables import GrantTemplate

from services.rag.src.grant_template.extract_cfp_data import (
    RagSourceData,
    extract_cfp_data_multi_source,
    format_rag_sources_for_prompt,
    get_rag_sources_data,
)


@pytest.fixture
def mock_rag_sources() -> list[RagSourceData]:
    return [
        {
            "source_id": str(uuid4()),
            "source_type": "rag_file",
            "text_content": "Full content of grant guidelines document with funding eligibility criteria for research institutions, application requirements and submission process, evaluation metrics and review timeline.",
            "chunks": [
                "Funding eligibility criteria for research institutions",
                "Application requirements and submission process",
                "Evaluation metrics and review timeline",
            ],
            "nlp_analysis": {
                "money": ["$500,000 funding available"],
                "date_time": ["submission deadline March 15"],
                "writing_related": ["must submit proposal"],
                "other_numbers": ["3 year duration"],
                "recommendations": ["strongly recommended"],
                "orders": ["submit by deadline"],
                "positive_instructions": ["include detailed methodology"],
                "negative_instructions": ["do not exceed page limit"],
                "evaluation_criteria": ["innovation and impact"],
            },
        },
        {
            "source_id": str(uuid4()),
            "source_type": "rag_url",
            "text_content": "Web content from the funding organization website with past funded projects examples and success stories and detailed guidance on application procedures.",
            "chunks": [
                "Web content from the funding organization website",
                "Past funded projects examples and success stories",
            ],
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": ["application examples"],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
        },
    ]


async def test_rag_sources_data_get_rag_sources_data(
    async_session_maker: Any,
    grant_template: GrantTemplate,
) -> None:
    result = await get_rag_sources_data(
        source_ids=[str(uuid4()), str(uuid4())],
        session_maker=async_session_maker,
    )
    assert result == []


async def test_rag_sources_data_get_rag_sources_data_empty_sources(
    async_session_maker: Any,
) -> None:
    result = await get_rag_sources_data(
        source_ids=[],
        session_maker=async_session_maker,
    )
    assert result == []


async def test_rag_sources_data_get_rag_sources_data_nonexistent_sources(
    async_session_maker: Any,
) -> None:
    fake_uuids = [str(uuid4()), str(uuid4())]
    result = await get_rag_sources_data(
        source_ids=fake_uuids,
        session_maker=async_session_maker,
    )
    assert result == []


def test_rag_sources_formatting_format_rag_sources_for_prompt(mock_rag_sources: list[RagSourceData]) -> None:
    formatted = format_rag_sources_for_prompt(mock_rag_sources)

    assert len(formatted) > 0
    assert "Source 1:" in formatted or "Source 0:" in formatted

    assert "grant guidelines document" in formatted
    assert "funding organization website" in formatted

    assert "Funding eligibility criteria" in formatted
    assert "Past funded projects examples" in formatted


def test_rag_sources_formatting_format_rag_sources_for_prompt_empty() -> None:
    formatted = format_rag_sources_for_prompt([])
    assert formatted == "" or formatted.strip() == ""


def test_rag_sources_formatting_format_rag_sources_for_prompt_single_source() -> None:
    single_source: list[RagSourceData] = [
        {
            "source_id": str(uuid4()),
            "source_type": "rag_file",
            "text_content": "Test content from single document",
            "chunks": ["Test content chunk"],
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": ["test content"],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
        }
    ]

    formatted = format_rag_sources_for_prompt(single_source)
    assert "Test content from single document" in formatted
    assert "Test content chunk" in formatted


def test_rag_sources_formatting_format_rag_sources_for_prompt_no_chunks() -> None:
    no_chunks_source: list[RagSourceData] = [
        {
            "source_id": str(uuid4()),
            "source_type": "rag_file",
            "text_content": "Content without chunks",
            "chunks": [],
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
        }
    ]

    formatted = format_rag_sources_for_prompt(no_chunks_source)
    assert "Content without chunks" in formatted


@patch("services.rag.src.grant_template.extract_cfp_data.handle_completions_request")
async def test_cfp_data_extraction_extract_cfp_data_multi_source_success(
    mock_completions: AsyncMock, mock_rag_sources: list[RagSourceData]
) -> None:
    mock_response = {
        "organization_id": "test-org-id",
        "cfp_subject": "Test grant for researching innovative approaches",
        "content": [
            {"title": "Background", "subtitles": ["Introduction", "Problem Statement"]},
            {"title": "Methodology", "subtitles": ["Approach", "Timeline"]},
        ],
        "submission_date": "2025-04-26",
    }
    mock_completions.return_value = mock_response

    task_description = format_rag_sources_for_prompt(mock_rag_sources)
    result = await extract_cfp_data_multi_source(task_description, trace_id="test-trace")

    assert "cfp_subject" in result
    assert "content" in result
    assert "organization_id" in result
    assert "submission_date" in result

    assert len(result["cfp_subject"]) > 0
    assert isinstance(result["content"], list)
    assert len(result["content"]) > 0
    assert result["organization_id"] == "test-org-id"
    assert result["submission_date"] == "2025-04-26"

    mock_completions.assert_called_once()


@patch("services.rag.src.grant_template.extract_cfp_data.handle_completions_request")
async def test_cfp_data_extraction_extract_cfp_data_multi_source_minimal_content(mock_completions: AsyncMock) -> None:
    mock_response: dict[str, Any] = {
        "organization_id": None,
        "cfp_subject": "Basic grant program",
        "content": [],
        "submission_date": None,
    }
    mock_completions.return_value = mock_response

    result = await extract_cfp_data_multi_source("Minimal content", trace_id="test-trace")

    assert result["organization_id"] is None
    assert result["cfp_subject"] == "Basic grant program"
    assert result["content"] == []
    assert result["submission_date"] is None


@patch("services.rag.src.grant_template.extract_cfp_data.handle_completions_request")
async def test_cfp_data_extraction_extract_cfp_data_multi_source_empty_task_description(
    mock_completions: AsyncMock,
) -> None:
    mock_response: dict[str, Any] = {
        "organization_id": None,
        "cfp_subject": "",
        "content": [],
        "submission_date": None,
    }
    mock_completions.return_value = mock_response

    result = await extract_cfp_data_multi_source("", trace_id="test-trace")

    assert result["cfp_subject"] == ""
    assert result["content"] == []


@patch("services.rag.src.grant_template.extract_cfp_data.handle_completions_request")
async def test_cfp_data_extraction_extract_cfp_data_multi_source_complex_content(mock_completions: AsyncMock) -> None:
    mock_response = {
        "organization_id": "complex-org-id",
        "cfp_subject": "Multi-disciplinary research initiative",
        "content": [
            {
                "title": "Project Description",
                "subtitles": ["Research Objectives", "Innovation and Significance", "Preliminary Studies"],
            },
            {
                "title": "Research Plan",
                "subtitles": [
                    "Specific Aims",
                    "Background and Significance",
                    "Research Design and Methods",
                    "Expected Outcomes",
                ],
            },
            {
                "title": "Team and Resources",
                "subtitles": ["Principal Investigator", "Co-Investigators", "Research Environment"],
            },
        ],
        "submission_date": "2025-09-15",
    }
    mock_completions.return_value = mock_response

    result = await extract_cfp_data_multi_source("Complex CFP document", trace_id="test-trace")

    assert len(result["content"]) == 3

    project_desc = result["content"][0]
    assert project_desc["title"] == "Project Description"
    assert len(project_desc["subtitles"]) == 3
    assert "Research Objectives" in project_desc["subtitles"]

    research_plan = result["content"][1]
    assert research_plan["title"] == "Research Plan"
    assert len(research_plan["subtitles"]) == 4
    assert "Specific Aims" in research_plan["subtitles"]

    team_resources = result["content"][2]
    assert team_resources["title"] == "Team and Resources"
    assert len(team_resources["subtitles"]) == 3
    assert "Principal Investigator" in team_resources["subtitles"]


async def test_integration_cfp_data_workflow_full_cfp_data_workflow(
    async_session_maker: Any,
    grant_template: GrantTemplate,
    mock_rag_sources: list[RagSourceData],
) -> None:
    formatted_prompt = format_rag_sources_for_prompt(mock_rag_sources)
    assert len(formatted_prompt) > 0

    with patch("services.rag.src.grant_template.extract_cfp_data.handle_completions_request") as mock_completions:
        mock_completions.return_value = {
            "organization_id": "workflow-test-org",
            "cfp_subject": "Integrated workflow test grant",
            "content": [{"title": "Test Section", "subtitles": ["Test Subsection"]}],
            "submission_date": "2025-12-31",
        }

        extracted_data = await extract_cfp_data_multi_source(formatted_prompt, trace_id="test-trace")

        assert extracted_data["organization_id"] == "workflow-test-org"
        assert extracted_data["cfp_subject"] == "Integrated workflow test grant"
        assert len(extracted_data["content"]) == 1
        assert extracted_data["submission_date"] == "2025-12-31"
