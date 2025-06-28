"""Simplified conftest for RAG e2e tests with real application data."""

import json
from typing import Any
from uuid import UUID

import pytest
from packages.db.src.utils import retrieve_application
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER

MELANOMA_APPLICATION_ID = "43b4aed5-8549-461f-9290-5ee9a630ac9a"
TEST_APPLICATIONS = {
    "melanoma_alliance": MELANOMA_APPLICATION_ID,
}


@pytest.fixture
def real_application_ids() -> dict[str, str]:
    """Map of application names to real UUIDs."""
    return TEST_APPLICATIONS


@pytest.fixture
async def melanoma_application_data(async_session_maker: async_sessionmaker[Any]) -> dict[str, Any]:
    """Get the real melanoma alliance application data from database."""
    async with async_session_maker() as session:
        application = await retrieve_application(application_id=MELANOMA_APPLICATION_ID, session=session)

        return {
            "application_id": MELANOMA_APPLICATION_ID,
            "application": application,
            "grant_template": application.grant_template,
            "research_objectives": application.research_deep_dive.research_objectives,
            "grant_sections": application.grant_template.grant_sections,
            "organization_id": application.grant_template.funding_organization_id,
        }


@pytest.fixture
def simple_test_objectives() -> list[dict[str, Any]]:
    """Simple test objectives for baseline testing."""
    return [
        {
            "id": "obj-1",
            "number": 1,
            "title": "Develop immunotherapy approach",
            "description": "Create and validate new CAR-T cell therapy",
            "research_tasks": [
                {
                    "id": "task-1-1",
                    "number": 1,
                    "title": "Design CAR construct",
                    "description": "Engineer CAR targeting melanoma antigens",
                },
                {
                    "id": "task-1-2",
                    "number": 2,
                    "title": "In vitro validation",
                    "description": "Test CAR-T cell efficacy in models",
                },
            ],
        },
        {
            "id": "obj-2",
            "number": 2,
            "title": "Evaluate treatment efficacy",
            "description": "Assess therapeutic potential in models",
            "research_tasks": [
                {
                    "id": "task-2-1",
                    "number": 1,
                    "title": "Mouse model studies",
                    "description": "Test therapy in xenograft models",
                },
                {
                    "id": "task-2-2",
                    "number": 2,
                    "title": "Biomarker analysis",
                    "description": "Identify predictive biomarkers",
                },
            ],
        },
        {
            "id": "obj-3",
            "number": 3,
            "title": "Optimize treatment protocol",
            "description": "Refine dosing and delivery methods",
            "research_tasks": [
                {
                    "id": "task-3-1",
                    "number": 1,
                    "title": "Dose optimization",
                    "description": "Determine optimal cell dose",
                }
            ],
        },
    ]


@pytest.fixture
def baseline_performance_targets() -> dict[str, float]:
    """Performance targets for baseline testing."""
    return {
        "total_time_limit": 900,
        "work_plan_time_limit": 300,
        "section_gen_time_limit": 600,
        "enrichment_time_limit": 180,
        "min_sections": 3,
        "min_characters": 1000,
    }


@pytest.fixture
def mock_job_manager() -> Any:
    """Mock job manager for testing."""
    from services.rag.src.utils.job_manager import JobManager

    async def create_mock_job_manager(session_maker: Any, application_id: UUID) -> JobManager:
        job_manager = JobManager(session_maker)
        await job_manager.create_grant_application_job(grant_application_id=application_id, total_stages=5)
        return job_manager

    return create_mock_job_manager


def load_grant_template_fixture(application_id: str) -> dict[str, Any]:
    """Load grant template from test fixtures."""
    template_path = FIXTURES_FOLDER / application_id / "grant_template.json"
    if template_path.exists():
        return json.loads(template_path.read_text())
    raise FileNotFoundError(f"Grant template not found for {application_id}")


def analyze_pipeline_timing(
    total_time: float, stage_timings: dict[str, float], targets: dict[str, float]
) -> dict[str, Any]:
    """Analyze pipeline performance against targets."""

    analysis = {
        "total_time": total_time,
        "stage_breakdown": stage_timings,
        "performance_vs_targets": {},
        "bottlenecks": [],
        "optimization_opportunities": [],
    }

    if total_time > 0:
        for stage, time_val in stage_timings.items():
            percentage = (time_val / total_time) * 100
            analysis["stage_breakdown"][f"{stage}_percentage"] = round(percentage, 1)

            if percentage > 25:
                analysis["bottlenecks"].append({"stage": stage, "time": time_val, "percentage": percentage})

    analysis["performance_vs_targets"] = {
        "total_time_score": max(0, 100 - (total_time / targets["total_time_limit"]) * 100),
        "within_limits": total_time < targets["total_time_limit"],
        "efficiency_grade": (
            "A"
            if total_time < targets["total_time_limit"] * 0.5
            else "B"
            if total_time < targets["total_time_limit"] * 0.75
            else "C"
            if total_time < targets["total_time_limit"]
            else "F"
        ),
    }

    work_plan_time = stage_timings.get("work_plan_generation", 0)
    if work_plan_time > targets.get("work_plan_time_limit", 300):
        analysis["optimization_opportunities"].append(
            {
                "type": "work_plan_parallelization",
                "current_time": work_plan_time,
                "target_time": targets["work_plan_time_limit"],
                "potential_improvement": "60-80% reduction via parallelization",
            }
        )

    enrichment_time = stage_timings.get("objective_enrichment", 0)
    if enrichment_time > targets.get("enrichment_time_limit", 180):
        analysis["optimization_opportunities"].append(
            {
                "type": "batch_enrichment",
                "current_time": enrichment_time,
                "target_time": targets["enrichment_time_limit"],
                "potential_improvement": "70% reduction via batch processing",
            }
        )

    return analysis
