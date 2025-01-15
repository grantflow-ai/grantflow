import logging
from asyncio import gather
from datetime import UTC, datetime
from os import environ
from pathlib import Path
from typing import Any

import pytest
from anyio import Path as AsyncPath
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.db.enums import FileIndexingStatusEnum
from src.db.json_objects import ApplicationDetails, ResearchObjective, ResearchTask
from src.db.tables import GrantApplication, GrantApplicationFile, GrantTemplate, RagFile, TextVector, Workspace
from src.dto import FileDTO
from src.indexer.files import parse_and_index_file
from src.rag.grant_application.research_plan_text import handle_research_plan_text_generation
from src.rag.grant_template.handler import handle_generate_grant_template
from src.utils.db import retrieve_application
from src.utils.extraction import extract_file_content
from src.utils.serialization import deserialize, serialize
from tests.conftest import FIXTURES_FOLDER, RESULTS_FOLDER, SOURCES_FOLDER, TEST_DATA_SOURCES


async def parse_source_file(
    application_id: str,
    source_file: Path,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    file_content = await AsyncPath(source_file).read_bytes()
    file_dto = FileDTO(
        content=file_content,
        filename=source_file.name,
        mime_type="application/pdf"
        if source_file.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    async with async_session_maker() as session:
        file_id = await session.scalar(
            insert(RagFile)
            .values(
                {
                    "filename": file_dto.filename,
                    "mime_type": file_dto.mime_type,
                    "size": file_dto.size,
                    "indexing_status": FileIndexingStatusEnum.INDEXING,
                }
            )
            .returning(RagFile.id)
        )
        await session.execute(
            insert(GrantApplicationFile).values([{"grant_application_id": application_id, "rag_file_id": file_id}])
        )
        await session.commit()

    await parse_and_index_file(file_dto=file_dto, file_id=file_id)

    async with async_session_maker() as session:
        application_file_data = await session.scalar(
            select(GrantApplicationFile)
            .options(selectinload(GrantApplicationFile.rag_file).selectinload(RagFile.text_vectors))
            .where(GrantApplicationFile.grant_application_id == application_id)
            .where(GrantApplicationFile.rag_file_id == file_id)
        )

    filename = source_file.name.replace("pdf", "json").replace("docx", "json")
    await AsyncPath(FIXTURES_FOLDER / application_id / "files" / filename).write_bytes(serialize(application_file_data))


@pytest.fixture
async def full_application_id(
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
) -> str:
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
                    "details": ApplicationDetails(
                        background_context="Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Immunotherapy has revolutionized treatment for melanoma patients, extending median survival from 6 months to nearly 6 years for patients in advanced disease stages. However, many patients still face early relapse or do not respond to treatments. Particularly in BMs, the milieu of the brain creates a highly immunosuppressive tumor microenvironment (TME). Single-cell technologies together with machine learning have emerged as powerful tools to decipher complex interactions between cells in the TME, enabling development of data driven designs of immunotherapies. Using our advanced technologies to study cells in the tumor microenvironment at a single-cell resolution, we identified a subtype of immune cell which is a central part of the TME coined regulatory (TREM2+) macrophages. These cells play a crucial role in suppressing the body's ability to fight cancer, especially in subsets of immunotherapy-resistant tumors such as melanoma. We have already developed an antibody that blocks the suppressive action of these cells.",
                        hypothesis="Our hypothesis is that using our advanced single cell technologies, including cell temporal tracking (ZMAN-seq, differentiation flows), cell-cell interactions (PIC-seq), and improved strategies for AI analysis of spatial transcriptomics with Stereo-seq, we can to get an in-depth understanding of the BM TME and identify cytokines capable of remodulating the TME towards anti-tumor activity. This understanding will enable us to design novel immunocytokines combining the most promising cytokines with our antiTREM2 antibody to modulate both the myeloid and T and NK cell compartments. Our hypothesis is that our single cell and AI analysis will also enable us to identify biomarkers to design masking strategies to increase the specificity of the immunocytokine to the BM TME.",
                        rationale="Our rationale is that the advances in single cell technologies enable an in depth understanding of the immune environment of BMs and identifying novel approaches for activating the immune system to eliminate the BMs. Our rationale is also that simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells) can induce unprecedented anti-tumor immune response.",
                        novelty_and_innovation="Our research is innovative in the utilization of state-of-the-art single cell technologies including ZMAN-seq, PIC-seq and STEREO-seq, in combination with generative AI tools. It is also highly innovative in its goal to develop first-in-its-class therapeutic modality simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells). Our innovative approach also includes the use of masking techniques to increase the molecule's specificity to the BM TME.",
                        team_excellence="Our team of world leaders in immunology, brain tumors and computer science research is ideally suited to deliver this disruptive proposal. Our lab is a pioneer and leader in the development and utilization of advanced single cell technologies for the study of immunology. We have a track record of innovation and groundbreaking discovery. We have already identified TREM2 as a pathway of immunosuppresive macrophages in the TME and developed a successful antibody blocking this pathway. We have also made significant advances in studying and developing anti-TREM2 immunocytokines.",
                        preliminary_data="As part of our previous research, we demonstrated the synergistic potential of an anti-TREM2 antibody combined with cytokines through the induction of strong pro-inflammatory macrophage activity in vitro. We have also tested the feasibility of producing TREM2 immunocytokines and developed preliminary model molecules, including an IL-2-anti-TREM2 fusion protein. We have also designed a masking strategy for the cytokine arm using blocking moieties responsive only to TAM-specific proteases and tested them in vivo.",
                        research_feasibility="We plan to systematically analyse the BM TME using our advanced single cell and AI technologies, rely on melanoma BM tumor models and our expertise in antibody design.Our background and capabilities, as well as preliminary ensure our goals are ambitious yet feasible and could be completed as part of this project.",
                        impact="Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Development of effective novel therapies for melanoma BMs could significantly increase life expectancy and not less important - life quality of metastatic melanoma patients.",
                        scientific_infrastructure="Our lab is equipped with the state-of-the-art single cell and molecular biology technologies and is supported by the vast scientific infrastructure of the Weizmann Institute of Science.",
                    ),
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

    application_files_dir = data_fixture_folder / "files"
    if not application_files_dir.exists():
        application_files_dir.mkdir(parents=True)

    if not list(application_files_dir.glob("*")):
        await gather(
            *[
                parse_source_file(
                    application_id=str(application_id), source_file=source_file, async_session_maker=async_session_maker
                )
                for source_file in TEST_DATA_SOURCES
            ]
        )

    for application_file in application_files_dir.glob("*.json"):
        data = deserialize(application_file.read_bytes(), dict[str, Any])
        async with async_session_maker() as session:
            rag_file_data = data.pop("rag_file")
            rag_file_id = data.pop("rag_file_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")
            await session.execute(
                insert(RagFile).values(
                    {
                        "id": rag_file_id,
                        **{
                            k: v
                            for k, v in rag_file_data.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        },
                    }
                )
            )
            await session.execute(
                insert(GrantApplicationFile).values(
                    {
                        "grant_application_id": application_id,
                        "rag_file_id": rag_file_id,
                    }
                )
            )
            await session.execute(
                insert(TextVector).values(
                    [
                        {
                            k: v
                            for k, v in text_vector.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        }
                        for text_vector in text_vectors
                    ]
                )
            )
            await session.commit()

    return str(application_id)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_generate_research_plan(
    logger: logging.Logger,
    full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for generating a grant format")
    grant_application = await retrieve_application(
        application_id=full_application_id, session_maker=async_session_maker
    )
    research_plan_text = await handle_research_plan_text_generation(
        application_id=full_application_id,
        research_objectives=grant_application.research_objectives or [],
        application_details=grant_application.details or {},
    )

    result_folder = RESULTS_FOLDER / full_application_id
    if not result_folder.exists():
        result_folder.mkdir(parents=True)

    result_file = result_folder / f"research_plan_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(research_plan_text)
