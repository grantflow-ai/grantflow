from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from packages.db.src.tables import GrantApplication, GrantTemplate
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from testing.factories import (
    GrantApplicationFactory,
    OrganizationFactory,
    ProjectFactory,
)

from services.rag.src.grant_application.handler import (
    grant_application_text_generation_pipeline_handler,
)


def create_mock_job_manager() -> MagicMock:
    mock_job = AsyncMock()
    mock_job.id = UUID("00000000-0000-0000-0000-000000000002")

    mock_job_manager = MagicMock()
    mock_job_manager.create_grant_application_job = AsyncMock(return_value=mock_job)
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()

    return mock_job_manager


@pytest.fixture
async def test_application(async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        template = GrantTemplate(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            grant_application_id=UUID("00000000-0000-0000-0000-000000000002"),
            granting_institution_id=None,
            grant_sections=[
                {
                    "id": "abstract",
                    "title": "Abstract",
                    "order": 1,
                    "parent_id": None,
                    "keywords": ["summary", "overview"],
                    "topics": ["project_overview"],
                    "generation_instructions": "Write a clear abstract.",
                    "depends_on": [],
                    "max_words": 250,
                    "search_queries": ["project abstract"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "research_plan",
                    "title": "Research Plan",
                    "order": 2,
                    "parent_id": None,
                    "keywords": ["methodology", "design", "procedures"],
                    "topics": ["methods", "experimental_design"],
                    "generation_instructions": "Describe the detailed methodology for the research project.",
                    "depends_on": [],
                    "max_words": 1500,
                    "search_queries": ["research methodology", "experimental design"],
                    "is_detailed_research_plan": True,
                    "is_clinical_trial": False,
                },
                {
                    "id": "impact",
                    "title": "Impact",
                    "order": 3,
                    "parent_id": None,
                    "keywords": ["significance", "outcomes"],
                    "topics": ["expected_outcomes", "potential_impact"],
                    "generation_instructions": "Explain the potential impact and significance of the research.",
                    "depends_on": ["research_plan"],
                    "max_words": 500,
                    "search_queries": ["research impact", "project significance"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
            ],
        )
        session.add(template)

        application = GrantApplicationFactory.build(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            title="Test Application",
            project_id=project.id,
            research_objectives=[
                {
                    "number": 1,
                    "title": "Develop novel biomarkers for early cancer detection",
                    "research_tasks": [
                        {
                            "number": 1,
                            "title": "Identify candidate biomarkers through proteomics",
                        },
                        {
                            "number": 2,
                            "title": "Validate biomarkers in clinical samples",
                        },
                    ],
                },
                {
                    "number": 2,
                    "title": "Create a machine learning model for biomarker analysis",
                    "research_tasks": [
                        {
                            "number": 1,
                            "title": "Design feature extraction algorithms",
                        },
                        {
                            "number": 2,
                            "title": "Train and validate the model on patient data",
                        },
                    ],
                },
            ],
        )
        session.add(application)
        await session.flush()

        application.grant_template = template

        await session.commit()
        await session.refresh(application)
        return application


async def test_grant_application_text_generation_pipeline_handler_with_mocked_llm(
    test_grant_application: GrantApplication,
    test_grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    application = test_grant_application

    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_strategy": "This is the research strategy text.",
        "preliminary_results": "This is the preliminary results text.",
        "risks_and_mitigations": "This is the risks and mitigations text.",
        "impact": "This is the impact text.",
    }

    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_section_text",
            return_value=mocked_section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value="Complete application text",
        ),
    ):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=application.id,
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )

    assert result is not None

    async with async_session_maker() as session:
        updated_app = await session.get(
            GrantApplication,
            application.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert updated_app is not None
        assert updated_app.text == "Complete application text"
