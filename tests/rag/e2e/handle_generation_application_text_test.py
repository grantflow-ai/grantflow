import logging
from os import environ
from typing import Any

import pytest
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.json_objects import ResearchObjective, ResearchTask
from src.db.tables import GrantApplication, GrantTemplate, Workspace
from src.rag.grant_template.handler import handle_generate_grant_template
from src.utils.extraction import extract_file_content
from src.utils.serialization import deserialize, serialize
from tests.conftest import FIXTURES_FOLDER, SOURCES_FOLDER


@pytest.fixture
async def application_data(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    fixture_uuid = "43b4aed5-8549-461f-9290-5ee9a630ac9a"

    async with async_session_maker() as session:
        application_id = await session.scalar(
            insert(GrantApplication)
            .values(
                {
                    "id": fixture_uuid,
                    "workspace_id": workspace.id,
                    "title": "Developing AI tailored immunocytokines to target melanoma brain metastases",
                    "research_objectives": [
                        ResearchObjective(
                            number=1,
                            title="Developing BM TME models with holistic, multimodal AI-driven analysis",
                            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
                            research_tasks=[
                                ResearchTask(
                                    number=1,
                                    title="Temporal understanding of immune activity in BM TME",
                                    description="Research immune temporal changes using Zman-seq in the BM TME using our previous research adapting it from glioma to BM.",
                                ),
                                ResearchTask(
                                    number=2,
                                    title="Immune cell-cell interaction in the BM TME",
                                    description="Use PIC-seq to measure immune cell interaction in the BM TME.",
                                ),
                                ResearchTask(
                                    number=3,
                                    title="Immune spatial distribution in the BM TME",
                                    description="Use stereo-seq to study spatial distribution of immune cells in the BM TME.",
                                ),
                            ],
                        ),
                        ResearchObjective(
                            number=2,
                            title="Preclinical screening of cytokines in orthotopic immunocompetent BM models",
                            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
                            research_tasks=[
                                ResearchTask(
                                    number=1,
                                    title="Screening of cytokines in BM TME",
                                    description="Use our in-house cytokine library to screen for cytokines that modulate immune activity in the BM TME.",
                                ),
                                ResearchTask(
                                    number=2,
                                    title="In-vitro validation of cytokines",
                                    description="Use in-vitro models to validate the cytokines identified in task 1.",
                                ),
                                ResearchTask(
                                    number=3,
                                    title="In-vivo validation of cytokines",
                                    description="Single-cell analysis using in-vitro and in vivo functional screening system on myeloid, NK and T cell activity for trans-acting MiTEs.",
                                ),
                            ],
                        ),
                        ResearchObjective(
                            number=3,
                            title="Design of tumor-targeting immunocytokines",
                            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
                            research_tasks=[
                                ResearchTask(
                                    number=1,
                                    title="Design fusion proteins and cleavage site",
                                    description="We will develop the optimal structures for the fusion proteins of the top 3-5 mAb-cytokine combinations identified in Aim 2, using advanced techniques in protein design. The design process will include the selection of the most suitable peptide linkers, blocking moieties, TAM-specific cleavage sites and the computational optimization of protein structure and stability.",
                                ),
                                ResearchTask(
                                    number=2,
                                    title="Produce fusion proteins",
                                    description="We will manufacture the 3-5 mAb-cytokine fusion proteins. The protein synthesis will be done by a contract research organization (CRO) selected based on our experience with leading CROs based on quality and punctual production. The production will include the selection of stable molecules with high protein expression and no aggregation.",
                                ),
                                ResearchTask(
                                    number=3,
                                    title="In-vitro validation of immunocytokines",
                                    description="We will confirm the binding via SPR, ELISA, cell-based binding and reporter assays. We will validate immunocytokines' impact on interactions between myeloid and lymphoid cell activity using in-vitro assays of co-cultured huMDMs, NK or T cells. To assess the efficacy of the fusion proteins in inducing cytotoxic NK and T cell activity, assays of co-cultured huMDMs, NK, or T cells and tumor cells will be treated with the various mAb-cytokine chimeras.",
                                ),
                            ],
                        ),
                    ],
                }
            )
            .returning(GrantApplication.id)
        )
        await session.commit()

    data_fixture_folder = FIXTURES_FOLDER / fixture_uuid
    if not data_fixture_folder.exists():
        data_fixture_folder.mkdir(parents=True)

    cfp_content_file = data_fixture_folder / "cfp_content.md"
    if not cfp_content_file.exists():
        cfp_file = SOURCES_FOLDER / "cfps" / "MRA-2023-2024-RFP-Final.pdf"

        output, _ = await extract_file_content(
            content=cfp_file.read_bytes(),
            mime_type="application/pdf",
        )
        content = output if isinstance(output, str) else output["content"]
        cfp_content_file.write_text(content)

    grant_template_file = data_fixture_folder / "grant_template.json"
    if not grant_template_file.exists():
        await handle_generate_grant_template(cfp_content=cfp_content_file.read_text(), application_id=application_id)

        async with async_session_maker() as session:
            grant_template = await session.scalar(
                select(GrantTemplate).where(GrantTemplate.grant_application_id == application_id)
            )

        grant_template_file.write_bytes(serialize(grant_template))
    else:
        data = deserialize(grant_template_file.read_text(), dict[str, Any])

        async with async_session_maker() as session:
            await session.execute(
                insert(GrantTemplate).values(
                    {k: v for k, v in data.items() if v is not None and k not in {"created_at", "updated_at"}}
                )
            )
            await session.commit()


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template(logger: logging.Logger, application_data: None) -> None:
    logger.info("Running end-to-end test for generating a grant format")
