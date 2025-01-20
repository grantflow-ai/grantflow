import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.json_objects import ApplicationDetails, ResearchObjective
from src.patterns import XML_TAG_PATTERN
from src.rag.grant_application.research_plan_text import (
    handle_preliminary_data_text_generation,
    handle_research_objective_description_generation,
    handle_research_plan_text_generation,
    handle_research_task_text_generation,
    handle_risks_and_mitigations_text_generation,
    set_relation_data,
)
from src.utils.db import retrieve_application
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER


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

    for value, expected_len in [
        ("## Research Plan", 1),
        ("### Research Objectives", 1),
        ("#### Objective", 3),
        ("##### Preliminary Results", 3),
        ("##### Research Tasks", 3),
        ("##### Risks and Alternatives", 3),
        ("###### Task", 9),
    ]:
        assert len([obj for obj in sections if obj.startswith(value)]) == expected_len, (
            f"expected {value} to be in the document {expected_len} times"
        )

    assert not XML_TAG_PATTERN.findall(research_plan_text)

    headers = [line for line in research_plan_text.split("\n") if line.startswith("#")]
    assert all(1 <= line.count("#") <= 6 for line in headers)

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"research_plan_text_{datetime.now(UTC).timestamp()}.md"
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
    result_file = result_folder / f"research_task_text_{datetime.now(UTC).timestamp()}.md"
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
    result_file = result_folder / f"risks_mitigations_text_{datetime.now(UTC).timestamp()}.md"
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
    result_file = result_folder / f"relations_data_{datetime.now(UTC).timestamp()}.md"
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
    result_file = result_folder / f"preliminary_data_text_{datetime.now(UTC).timestamp()}.md"
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
    result_file = result_folder / f"research_objective_text_{datetime.now(UTC).timestamp()}.md"
    result_file.write_text(objective_text)

    logger.info("Completed research objective generation test in %.2f seconds with %d words", elapsed_time, word_count)
