from typing import Any
from unittest.mock import patch

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, RagGenerationJob
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.grant_application.pipeline import (
    handle_grant_application_pipeline,
)

TraceId = str


@pytest.fixture
def trace_id() -> TraceId:
    return "test-trace-id"


async def test_pipeline_missing_cfp_analysis(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app
        assert app.grant_template
        app.grant_template.cfp_analysis = None
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        await handle_grant_application_pipeline(
            grant_application=app,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "ValidationError" in job.error_message


async def test_pipeline_missing_research_objectives(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, test_application_with_template.id)
        assert app
        app.research_objectives = []
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        await handle_grant_application_pipeline(
            grant_application=app,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "ValidationError" in job.error_message


async def test_pipeline_validation_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        with patch(
            "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
            side_effect=ValidationError("Indexing timeout"),
        ):
            await handle_grant_application_pipeline(
                grant_application=app,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "ValidationError" in job.error_message


async def test_pipeline_backend_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER

    async with async_session_maker() as session:
        checkpoint_data = {
            "section_texts": [],
            "work_plan_section": {
                "id": "research_plan",
                "title": "Research Plan",
                "order": 2,
                "parent_id": None,
                "evidence": "CFP evidence for Research Plan",
                "keywords": ["methodology"],
                "topics": ["methods"],
                "generation_instructions": "Describe methodology",
                "depends_on": [],
                "length_constraint": {"type": "words", "value": 1500, "source": None},
                "search_queries": ["methodology"],
                "is_detailed_research_plan": True,
                "is_clinical_trial": False,
            },
            "relationships": {},
            "enrichment_responses": [],
            "wikidata_enrichments": [],
            "research_plan_text": "Generated research plan text",
        }

        for stage in GRANT_APPLICATION_STAGES_ORDER[:-1]:
            job = RagGenerationJob(
                grant_application_id=test_application_with_template.id,
                application_stage=stage,
                status=RagGenerationStatusEnum.COMPLETED,
                retry_count=0,
                checkpoint_data=checkpoint_data if stage == GrantApplicationStageEnum.WORKPLAN_GENERATION else None,
            )
            session.add(job)
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        relationships_dto = {
            "work_plan_section": checkpoint_data["work_plan_section"],
            "relationships": checkpoint_data["relationships"],
        }
        enrich_objectives_dto = {
            **relationships_dto,
            "enrichment_responses": checkpoint_data["enrichment_responses"],
        }
        enrich_terminology_dto = {
            **enrich_objectives_dto,
            "wikidata_enrichments": checkpoint_data["wikidata_enrichments"],
        }
        research_plan_dto = {
            **enrich_terminology_dto,
            "research_plan_text": checkpoint_data["research_plan_text"],
        }

        with (
            patch(
                "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
                side_effect=BackendError("LLM error"),
            ),
            patch(
                "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage",
                return_value=relationships_dto,
            ),
            patch(
                "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage",
                return_value=enrich_objectives_dto,
            ),
            patch(
                "services.rag.src.grant_application.pipeline.handle_enrich_terminology_stage",
                return_value=enrich_terminology_dto,
            ),
            patch(
                "services.rag.src.grant_application.pipeline.handle_generate_research_plan_stage",
                return_value=research_plan_dto,
            ),
            patch(
                "services.rag.src.utils.checks.verify_rag_sources_indexed",
                return_value=None,
            ),
            patch(
                "packages.shared_utils.src.pubsub.publish_email_notification",
                return_value=None,
            ),
            patch(
                "packages.shared_utils.src.pubsub.publish_notification",
                return_value=None,
            ),
        ):
            await handle_grant_application_pipeline(
                grant_application=app,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id,
                RagGenerationJob.application_stage == GrantApplicationStageEnum.SECTION_SYNTHESIS,
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "BackendError" in job.error_message
