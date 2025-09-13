"""Shared fixtures for grant application integration tests."""

from typing import Any
from uuid import UUID

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.db.src.tables import GrantApplication, GrantTemplate
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import OrganizationFactory, ProjectFactory


@pytest.fixture
async def test_application_with_template(async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    """Create a test application with an embedded grant template for integration tests."""
    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        # Create application first
        application = GrantApplication(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            title="Test Grant Application",
            project_id=project.id,
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test Objective 1",
                    research_tasks=[
                        ResearchTask(number=1, title="Task 1.1"),
                        ResearchTask(number=2, title="Task 1.2"),
                    ],
                ),
                ResearchObjective(
                    number=2,
                    title="Test Objective 2",
                    research_tasks=[
                        ResearchTask(number=1, title="Task 2.1"),
                        ResearchTask(number=2, title="Task 2.2"),
                    ],
                ),
            ],
        )
        session.add(application)
        await session.flush()  # Persist application so it has an ID

        # Now create template with the application's ID
        template = GrantTemplate(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            grant_application_id=application.id,  # Use the actual application ID
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
                    "keywords": ["outcomes", "benefits", "significance"],
                    "topics": ["project_impact", "societal_benefits"],
                    "generation_instructions": "Describe the potential impact and significance of this research.",
                    "depends_on": [],
                    "max_words": 500,
                    "search_queries": ["research impact", "project significance"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "preliminary_results",
                    "title": "Preliminary Results",
                    "order": 4,
                    "parent_id": None,
                    "keywords": ["preliminary", "findings", "data"],
                    "topics": ["preliminary_data", "initial_results"],
                    "generation_instructions": "Present any preliminary data or results.",
                    "depends_on": [],
                    "max_words": 500,
                    "search_queries": ["preliminary results", "initial findings"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "risks_and_mitigations",
                    "title": "Risks and Mitigations",
                    "order": 5,
                    "parent_id": None,
                    "keywords": ["risks", "challenges", "mitigation"],
                    "topics": ["project_risks", "risk_management"],
                    "generation_instructions": "Identify potential risks and describe mitigation strategies.",
                    "depends_on": [],
                    "max_words": 400,
                    "search_queries": ["project risks", "risk mitigation"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
            ],
        )
        session.add(template)

        # Link template to application
        application.grant_template = template

        await session.commit()
        await session.refresh(application)

        return application
