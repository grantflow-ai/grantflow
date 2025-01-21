from unittest.mock import AsyncMock, patch

import pytest

from src.db.json_objects import ResearchObjective, ResearchTask
from src.rag.grant_application.research_plan_text import (
    handle_preliminary_data_text_generation,
    handle_research_objective_components_generation,
    handle_research_objective_description_generation,
    handle_research_plan_text_generation,
    handle_research_task_text_generation,
    handle_risks_and_mitigations_text_generation,
    set_relation_data,
)


@pytest.fixture
def mock_retrieve_documents() -> AsyncMock:
    return AsyncMock(return_value="Mock RAG results")


@pytest.fixture
def mock_completions_request() -> AsyncMock:
    return AsyncMock(return_value={"relations": [["1", "First objective relation"], ["1.1", "First task relation"]]})


@pytest.fixture
def mock_text_generation() -> AsyncMock:
    return AsyncMock(return_value="Generated text content")


@pytest.fixture
def research_task() -> ResearchTask:
    return ResearchTask(
        number=1,
        title="Test Task",
        description="Test task description",
        relationships=["Builds on previous task"],
    )


@pytest.fixture
def research_objective() -> ResearchObjective:
    return ResearchObjective(
        number=1,
        title="Test Objective",
        description="Test objective description",
        research_tasks=[
            ResearchTask(
                number=1,
                title="Task 1",
                description="Task 1 description",
                relationships=[],
            ),
            ResearchTask(
                number=2,
                title="Task 2",
                description="Task 2 description",
                relationships=[],
            ),
        ],
        relationships=[],
    )


@pytest.fixture
def user_inputs() -> dict[str, str]:
    return {
        "preliminary_data": "Test preliminary data",
        "risks_and_mitigations": "Test risks and mitigations",
    }


@pytest.mark.asyncio
async def test_set_relation_data(mock_completions_request: AsyncMock, research_objective: ResearchObjective) -> None:
    with patch("src.rag.grant_application.research_plan_text.handle_completions_request", mock_completions_request):
        result = await set_relation_data([research_objective])

        assert len(result) == 1
        assert result[0]["relationships"] == ["First objective relation"]
        assert result[0]["research_tasks"][0]["relationships"] == ["First task relation"]

        mock_completions_request.assert_called_once()


@pytest.mark.asyncio
async def test_handle_research_task_text_generation(
    mock_retrieve_documents: AsyncMock, mock_text_generation: AsyncMock, research_task: ResearchTask
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_research_task_text_generation(
            application_id="test-id", research_task=research_task, task_number="1.1"
        )

        assert "Task 1.1: Test Task" in result
        assert "Generated text content" in result
        mock_retrieve_documents.assert_called_once()
        mock_text_generation.assert_called_once()


@pytest.mark.asyncio
async def test_handle_research_objective_description_generation(
    mock_retrieve_documents: AsyncMock, mock_text_generation: AsyncMock, research_objective: ResearchObjective
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_research_objective_description_generation(
            application_id="test-id", research_objective=research_objective
        )

        assert result == "Generated text content"
        mock_retrieve_documents.assert_called_once()
        mock_text_generation.assert_called_once()


@pytest.mark.asyncio
async def test_handle_preliminary_data_text_generation(
    mock_retrieve_documents: AsyncMock,
    mock_text_generation: AsyncMock,
    research_objective: ResearchObjective,
    user_inputs: dict[str, str],
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_preliminary_data_text_generation(
            application_details=user_inputs,
            application_id="test-id",
            research_objective=research_objective,
            research_objective_description="Test description",
        )

        assert result == "Generated text content"
        mock_retrieve_documents.assert_called_once()
        mock_text_generation.assert_called_once()


@pytest.mark.asyncio
async def test_handle_risks_and_mitigations_text_generation(
    mock_retrieve_documents: AsyncMock,
    mock_text_generation: AsyncMock,
    research_objective: ResearchObjective,
    user_inputs: dict[str, str],
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_risks_and_mitigations_text_generation(
            application_details=user_inputs,
            application_id="test-id",
            research_objective=research_objective,
            research_objective_description="Test description",
        )

        assert result == "Generated text content"
        mock_retrieve_documents.assert_called_once()
        mock_text_generation.assert_called_once()


@pytest.mark.asyncio
async def test_handle_research_objective_components_generation(
    mock_retrieve_documents: AsyncMock,
    mock_text_generation: AsyncMock,
    research_objective: ResearchObjective,
    user_inputs: dict[str, str],
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_research_objective_components_generation(
            application_details=user_inputs,
            application_id="test-id",
            research_objective=research_objective,
        )

        assert "Objective 1: Test Objective" in result
        assert "Generated text content" in result
        assert mock_retrieve_documents.call_count == 4  # Called for each component
        assert mock_text_generation.call_count == 4  # Called for each component


@pytest.mark.asyncio
async def test_handle_research_plan_text_generation(
    mock_retrieve_documents: AsyncMock,
    mock_completions_request: AsyncMock,
    mock_text_generation: AsyncMock,
    research_objective: ResearchObjective,
    user_inputs: dict[str, str],
) -> None:
    with (
        patch("src.rag.grant_application.research_plan_text.retrieve_documents", mock_retrieve_documents),
        patch("src.rag.grant_application.research_plan_text.handle_completions_request", mock_completions_request),
        patch("src.rag.grant_application.research_plan_text.handle_segmented_text_generation", mock_text_generation),
    ):
        result = await handle_research_plan_text_generation(
            application_details=user_inputs,
            application_id="test-id",
            research_objectives=[research_objective],
        )

        assert "## Research Plan" in result
        assert "### Research Objectives" in result
        assert mock_completions_request.call_count == 1
        assert mock_retrieve_documents.call_count == 4  # Called for each component
        assert mock_text_generation.call_count == 4  # Called for each component
