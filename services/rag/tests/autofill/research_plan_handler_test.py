import types
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.shared_utils.src.pubsub import AutofillRequest

from services.rag.src.autofill.research_plan_handler import generate_research_plan_content


@pytest.fixture
def mock_logger() -> MagicMock:
    return MagicMock()


@pytest.fixture
def mock_session_maker() -> MagicMock:
    session_maker = MagicMock()
    session = AsyncMock()

    class AsyncContextManager:
        async def __aenter__(self) -> Any:
            return session

        async def __aexit__(
            self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: types.TracebackType | None
        ) -> None:
            return None

    session_maker.return_value = AsyncContextManager()
    return session_maker


@pytest.fixture
def sample_request() -> AutofillRequest:
    from uuid import UUID

    return {
        "application_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
        "autofill_type": "research_plan",
    }


@pytest.fixture
def sample_application() -> dict[str, Any]:
    return {"title": "AI-Powered Medical Diagnosis", "research_objectives": []}


@pytest.fixture
def sample_documents() -> list[str]:
    return [
        "Machine learning approaches to medical diagnosis show promising results in early detection of diseases.",
        "Deep learning in healthcare applications can improve diagnostic accuracy and reduce physician workload.",
    ]


async def test_function_import() -> None:
    import inspect

    from services.rag.src.autofill.research_plan_handler import generate_research_plan_content

    sig = inspect.signature(generate_research_plan_content)
    params = list(sig.parameters.keys())

    assert "application" in params
    assert inspect.iscoroutinefunction(generate_research_plan_content)


async def test_generate_research_plan_content_with_mocks(
    mock_logger: MagicMock, mock_session_maker: MagicMock, sample_application: dict[str, Any]
) -> None:
    from packages.db.src.tables import GrantApplication

    app = GrantApplication(id="test-id", title="Test Application")

    with (
        patch(
            "services.rag.src.autofill.research_plan_handler.handle_create_search_queries", new_callable=AsyncMock
        ) as mock_search,
        patch(
            "services.rag.src.autofill.research_plan_handler.retrieve_documents", new_callable=AsyncMock
        ) as mock_retrieve,
        patch(
            "services.rag.src.autofill.research_plan_handler.handle_completions_request", new_callable=AsyncMock
        ) as mock_completion,
    ):
        mock_search.return_value = ["search query 1", "search query 2"]
        mock_retrieve.return_value = ["Document content 1", "Document content 2"]
        mock_completion.return_value = {
            "research_objectives": [
                {
                    "number": 1,
                    "title": "Test Objective",
                    "description": "A" * 60,
                    "research_tasks": [
                        {"number": 1, "title": "Task 1 Title", "description": "B" * 60},
                        {"number": 2, "title": "Task 2 Title", "description": "B" * 60},
                    ],
                },
                {
                    "number": 2,
                    "title": "Test Objective 2",
                    "description": "A" * 60,
                    "research_tasks": [
                        {"number": 1, "title": "Task 1 Title", "description": "B" * 60},
                        {"number": 2, "title": "Task 2 Title", "description": "B" * 60},
                    ],
                },
            ]
        }

        result = await generate_research_plan_content(application=app)

        assert isinstance(result, list)
        assert len(result) == 2
        assert result[0]["title"] == "Test Objective"


def test_validate_research_plan_response(mock_logger: MagicMock) -> None:
    from packages.shared_utils.src.exceptions import ValidationError

    from services.rag.src.autofill.research_plan_handler import _validate_research_plan_response

    valid_response = {
        "research_objectives": [
            {
                "number": 1,
                "title": "Test Objective Title",
                "description": "This is a detailed description of the test objective that meets the minimum length requirement",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "First Test Task",
                        "description": "This is a detailed description of the first test task with sufficient content",
                    },
                    {
                        "number": 2,
                        "title": "Second Test Task",
                        "description": "This is a detailed description of the second test task with sufficient content",
                    },
                ],
            },
            {
                "number": 2,
                "title": "Second Objective Title",
                "description": "This is a detailed description of the second test objective that meets the minimum length requirement",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Another Test Task",
                        "description": "This is a detailed description of another test task with sufficient content",
                    },
                    {
                        "number": 2,
                        "title": "Final Test Task",
                        "description": "This is a detailed description of the final test task with sufficient content",
                    },
                ],
            },
        ]
    }

    _validate_research_plan_response(valid_response)

    invalid_response = {"research_objectives": [{"number": 1}]}

    with pytest.raises(ValidationError):
        _validate_research_plan_response(invalid_response)


def test_validation_errors_research_plan(mock_logger: MagicMock) -> None:
    from packages.shared_utils.src.exceptions import ValidationError

    from services.rag.src.autofill.research_plan_handler import _validate_research_plan_response

    with pytest.raises(ValidationError, match="Missing 'research_objectives'"):
        _validate_research_plan_response({"something_else": []})

    with pytest.raises(ValidationError, match="Expected 2-3 research objectives, got 0"):
        _validate_research_plan_response({"research_objectives": []})

    with pytest.raises(ValidationError, match="Expected 2-3 research objectives, got 4"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {
                        "number": 1,
                        "title": "Obj 1",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Task 1", "description": "B" * 60}] * 2,
                    },
                    {
                        "number": 2,
                        "title": "Obj 2",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Task 1", "description": "B" * 60}] * 2,
                    },
                    {
                        "number": 3,
                        "title": "Obj 3",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Task 1", "description": "B" * 60}] * 2,
                    },
                    {
                        "number": 4,
                        "title": "Obj 4",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Task 1", "description": "B" * 60}] * 2,
                    },
                ]
            }
        )

    with pytest.raises(ValidationError, match="title too short"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {
                        "number": 1,
                        "title": "Short",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                    {
                        "number": 2,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                ]
            }
        )

    with pytest.raises(ValidationError, match="description too short"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {
                        "number": 1,
                        "title": "Valid Title",
                        "description": "Too short",
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                    {
                        "number": 2,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                ]
            }
        )

    with pytest.raises(ValidationError, match="Duplicate objective number"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {
                        "number": 1,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [
                            {"number": 1, "title": "Valid Task Title", "description": "B" * 60},
                            {"number": 2, "title": "Valid Task Title", "description": "B" * 60},
                        ],
                    },
                    {
                        "number": 1,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [
                            {"number": 1, "title": "Valid Task Title", "description": "B" * 60},
                            {"number": 2, "title": "Valid Task Title", "description": "B" * 60},
                        ],
                    },
                ]
            }
        )

    with pytest.raises(ValidationError, match="must have 2-5 tasks"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {"number": 1, "title": "Valid Title", "description": "A" * 60, "research_tasks": []},
                    {
                        "number": 2,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                ]
            }
        )

    with pytest.raises(ValidationError, match=r"task.*description too short"):
        _validate_research_plan_response(
            {
                "research_objectives": [
                    {
                        "number": 1,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [
                            {"number": 1, "title": "Valid Task Title", "description": "Too short"},
                            {"number": 2, "title": "Valid Task Title", "description": "B" * 60},
                        ],
                    },
                    {
                        "number": 2,
                        "title": "Valid Title",
                        "description": "A" * 60,
                        "research_tasks": [{"number": 1, "title": "Valid Task Title", "description": "B" * 60}] * 2,
                    },
                ]
            }
        )
