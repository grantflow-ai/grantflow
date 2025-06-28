"""Test script to verify melanoma alliance fixture has a grant template."""

import asyncio
from uuid import UUID

from packages.db.src.tables import GrantApplication
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from testing.db_test_plugin import get_test_session_maker
from testing.factories import ProjectFactory
from testing.test_utils import create_grant_application_data


async def test_melanoma_fixture() -> None:
    """Test that the melanoma alliance fixture has a grant template."""
    session_maker = await get_test_session_maker()

    async with session_maker() as session:
        project = ProjectFactory.build()
        session.add(project)
        await session.flush()
        await session.commit()
        await session.refresh(project)

    research_objs = [
        {
            "number": 1,
            "title": "Developing BM TME models with holistic, multimodal AI-driven analysis",
            "description": "The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Temporal understanding of immune activity in BM TME",
                    "description": "Research immune temporal changes using Zman-seq in the BM TME using our previous research adapting it from glioma to BM.",
                },
                {
                    "number": 2,
                    "title": "Immune cell-cell interaction in the BM TME",
                    "description": "Use PIC-seq to measure immune cell interaction in the BM TME.",
                },
                {
                    "number": 3,
                    "title": "Immune spatial distribution in the BM TME",
                    "description": "Use stereo-seq to study spatial distribution of immune cells in the BM TME.",
                },
            ],
        }
    ]

    form_inputs = {
        "background_context": "Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients.",
        "hypothesis": "Our hypothesis is that using our advanced single cell technologies...",
        "rationale": "Our rationale is that the advances in single cell technologies...",
        "novelty_and_innovation": "Our research is innovative in the utilization of state-of-the-art single cell technologies...",
        "team_excellence": "Our team of world leaders in immunology, brain tumors and computer science research...",
        "preliminary_data": "As part of our previous research, we demonstrated the synergistic potential...",
        "research_feasibility": "We plan to systematically analyse the BM TME...",
        "impact": "Brain metastases (BMs) occur in almost 50% of patients...",
        "scientific_infrastructure": "Our lab is equipped with the state-of-the-art single cell...",
    }

    application_id = await create_grant_application_data(
        project=project,
        research_objectives=research_objs,
        form_inputs=form_inputs,
        async_session_maker=session_maker,
        fixture_id="43b4aed5-8549-461f-9290-5ee9a630ac9a",
        cfp_markdown_file_name="melanoma_alliance.md",
        source_file_names=["MRA-2023-2024-RFP-Final.pdf"],
    )

    async with session_maker() as session:
        result = await session.execute(
            select(GrantApplication)
            .where(GrantApplication.id == UUID(application_id))
            .options(selectinload(GrantApplication.grant_template))
        )
        app = result.scalar_one()

        if app.grant_template:
            work_plan_sections = [
                s for s in (app.grant_template.grant_sections or []) if s.get("is_detailed_research_plan")
            ]

            if work_plan_sections:
                pass

        has_template = app.grant_template is not None
        has_objectives = app.research_objectives is not None
        has_work_plan = (
            any(s.get("is_detailed_research_plan") for s in (app.grant_template.grant_sections or []))
            if app.grant_template
            else False
        )

        return has_template and has_objectives and has_work_plan


if __name__ == "__main__":
    result = asyncio.run(test_melanoma_fixture())
    if result:
        pass
    else:
        pass
