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
from src.db.json_objects import ApplicationDetails, ResearchObjective
from src.db.tables import GrantApplication, GrantApplicationFile, GrantTemplate, RagFile, TextVector, Workspace
from src.dto import FileDTO
from src.indexer.files import parse_and_index_file
from src.patterns import XML_TAG_PATTERN
from src.rag.grant_application.research_plan_text import (
    handle_preliminary_data_text_generation,
    handle_research_objective_description_generation,
    handle_research_plan_text_generation,
    handle_research_task_text_generation,
    handle_risks_and_mitigations_text_generation,
    set_relation_data,
)
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

    await parse_and_index_file(file_dto=file_dto, file_id=str(file_id))

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
    research_objectives: list[ResearchObjective],
    application_details: ApplicationDetails,
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
                    "research_objectives": research_objectives,
                    "details": application_details,
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
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
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

    start_time = datetime.now(UTC)
    research_plan_text = await handle_research_plan_text_generation(
        application_id=full_application_id,
        research_objectives=grant_application.research_objectives or [],
        application_details=grant_application.details or {},
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 240

    assert research_plan_text.startswith("## Research Plan")
    assert "### Research Objectives" in research_plan_text

    sections = research_plan_text.split("\n\n")
    assert len(sections) > 1

    objectives = [obj for obj in sections if obj.startswith("#### Objective")]
    assert len(objectives) >= 1

    for objective in objectives:
        assert "##### Preliminary Results" in objective
        assert "##### Research Tasks" in objective
        assert "##### Risks and Alternatives" in objective
        assert "###### Task" in objective

    assert not XML_TAG_PATTERN.findall(research_plan_text)

    headers = [line for line in research_plan_text.split("\n") if line.startswith("#")]
    assert all(1 <= line.count("#") <= 6 for line in headers)

    expected_headers = ["## Research Plan", "### Research Objectives", "#### Objective"]
    for header in expected_headers:
        assert any(h.startswith(header) for h in headers)

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"research_plan_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(research_plan_text)

    logger.info("Completed research plan generation test in %.2f seconds", elapsed_time)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_research_task(
    logger: logging.Logger,
    full_application_id: str,
    research_objectives: list[ResearchObjective],
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Testing research task text generation")
    start_time = datetime.now(UTC)

    research_task = research_objectives[0]["research_tasks"][0]
    task_text = await handle_research_task_text_generation(
        application_id=full_application_id, research_task=research_task, task_number="1.1"
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    assert task_text.startswith("###### Task 1.1:")
    assert research_task["title"] in task_text

    task_content = task_text.split("\n", 1)[1].strip()
    word_count = len(task_content.split())
    assert 250 <= word_count <= 450

    assert not XML_TAG_PATTERN.findall(task_text)
    assert not any(line.startswith("#") for line in task_content.split("\n"))
    assert not any(line.startswith("-") for line in task_content.split("\n"))

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"research_task_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(task_text)

    logger.info("Completed research task generation test in %.2f seconds with %d words", elapsed_time, word_count)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_risks_and_mitigations(
    logger: logging.Logger,
    full_application_id: str,
    research_objectives: list[ResearchObjective],
    application_details: ApplicationDetails,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Testing risks and mitigations text generation")
    start_time = datetime.now(UTC)

    research_objective = research_objectives[1]
    objective_description = research_objective["description"]

    risks_text = await handle_risks_and_mitigations_text_generation(
        application_id=full_application_id,
        research_objective=research_objective,
        application_details=application_details,
        research_objective_description=objective_description,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    word_count = len(risks_text.split())
    assert 100 <= word_count <= 350

    assert not XML_TAG_PATTERN.findall(risks_text)
    assert not risks_text.startswith("#")
    assert not any(line.startswith("-") for line in risks_text.split("\n"))

    required_terms = ["risk", "challenge", "mitigation", "alternative", "strategy"]
    assert any(term in risks_text.lower() for term in required_terms)

    paragraph_count = len([p for p in risks_text.split("\n\n") if p.strip()])
    assert 2 <= paragraph_count <= 3

    assert objective_description.lower() not in risks_text.lower()

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"risks_mitigations_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(risks_text)

    logger.info("Completed risks and mitigations test in %.2f seconds with %d words", elapsed_time, word_count)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_set_relation_data(
    logger: logging.Logger,
    research_objectives: list[ResearchObjective],
) -> None:
    logger.info("Testing research objective and task relationship generation")
    start_time = datetime.now(UTC)

    enriched_objectives = await set_relation_data(research_objectives)

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    for objective in enriched_objectives:
        assert "relationships" in objective
        assert isinstance(objective["relationships"], list)
        assert all(isinstance(rel, str) for rel in objective["relationships"])
        assert all(not XML_TAG_PATTERN.findall(rel) for rel in objective["relationships"])

        for task in objective["research_tasks"]:
            assert "relationships" in task
            assert isinstance(task["relationships"], list)
            assert all(isinstance(rel, str) for rel in task["relationships"])
            assert all(not XML_TAG_PATTERN.findall(rel) for rel in task["relationships"])

    task2_2 = enriched_objectives[1]["research_tasks"][1]
    if task2_2["relationships"]:
        assert any("2.1" in rel for rel in task2_2["relationships"])

    task3_1 = enriched_objectives[2]["research_tasks"][0]
    if task3_1["relationships"]:
        assert any("2" in rel for rel in task3_1["relationships"])

    result_folder = RESULTS_FOLDER / "relations"
    result_folder.mkdir(exist_ok=True)
    result_file = result_folder / f"relations_data_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(serialize(enriched_objectives).decode())

    total_relationships = sum(
        len(obj["relationships"]) + sum(len(task["relationships"]) for task in obj["research_tasks"])
        for obj in enriched_objectives
    )

    logger.info(
        "Completed relation generation test in %.2f seconds with %d objectives and %d total relationships",
        elapsed_time,
        len(enriched_objectives),
        total_relationships,
    )


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_preliminary_data(
    logger: logging.Logger,
    full_application_id: str,
    research_objectives: list[ResearchObjective],
    application_details: ApplicationDetails,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Testing preliminary data text generation")
    start_time = datetime.now(UTC)

    research_objective = research_objectives[0]
    objective_description = "We will use advanced single cell technologies to study immune activity in the BM TME."

    prelim_text = await handle_preliminary_data_text_generation(
        application_id=full_application_id,
        research_objective=research_objective,
        application_details=application_details,
        research_objective_description=objective_description,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    word_count = len(prelim_text.split())
    assert 150 <= word_count <= 900

    assert not XML_TAG_PATTERN.findall(prelim_text)
    assert not prelim_text.startswith("#")
    assert not any(line.startswith("-") for line in prelim_text.split("\n"))

    required_terms = ["experiment", "method", "analysis", "data", "findings"]
    assert any(term in prelim_text.lower() for term in required_terms)

    assert objective_description.lower() not in prelim_text.lower()

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"preliminary_data_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(prelim_text)

    logger.info("Completed preliminary data generation test in %.2f seconds with %d words", elapsed_time, word_count)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_research_objective(
    logger: logging.Logger,
    full_application_id: str,
    research_objectives: list[ResearchObjective],
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Testing research objective description generation")
    start_time = datetime.now(UTC)

    objective_text = await handle_research_objective_description_generation(
        application_id=full_application_id, research_objective=research_objectives[0]
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    word_count = len(objective_text.split())
    assert 200 <= word_count <= 450

    assert not XML_TAG_PATTERN.findall(objective_text)
    assert not objective_text.startswith("#")
    assert not any(line.startswith("-") for line in objective_text.split("\n"))

    research_terms = ["hypothesis", "methodology", "results", "goals"]
    assert any(term in objective_text.lower() for term in research_terms)

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"research_objective_text_{datetime.now(UTC).timestamp()}.json"
    result_file.write_text(objective_text)

    logger.info("Completed research objective generation test in %.2f seconds with %d words", elapsed_time, word_count)
