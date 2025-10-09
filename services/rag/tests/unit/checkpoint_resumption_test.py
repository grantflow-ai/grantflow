"""Tests for sub-stage checkpoint resumption in pipelines."""

from __future__ import annotations

from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, Self, cast
from unittest.mock import AsyncMock, call
from uuid import UUID

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum

from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline

if TYPE_CHECKING:
    from collections.abc import Sequence

    from packages.db.src.tables import GrantApplication
    from pytest_mock import MockerFixture


JobRecord = SimpleNamespace


class FakeResult:
    def __init__(self, jobs: Sequence[JobRecord]) -> None:
        self._jobs = jobs

    def scalars(self) -> FakeResult:
        return self

    def all(self) -> list[JobRecord]:
        return list(self._jobs)


class FakeSession:
    def __init__(self, jobs: Sequence[JobRecord]) -> None:
        self._jobs = jobs

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None

    async def execute(self, *_: Any, **__: Any) -> FakeResult:
        return FakeResult(self._jobs)


def make_session_maker(jobs: Sequence[JobRecord]) -> Any:
    def _session() -> FakeSession:
        return FakeSession(jobs)

    return _session


def patch_job_manager(mocker: MockerFixture, fake_manager: FakeJobManager) -> None:
    class _JobManagerFactory:
        @staticmethod
        def __class_getitem__(_item: Any) -> type[_JobManagerFactory]:
            return _JobManagerFactory

        def __new__(cls, *args: Any, **kwargs: Any) -> FakeJobManager:
            return fake_manager

    mocker.patch("services.rag.src.grant_application.pipeline.JobManager", _JobManagerFactory)


class FakeJobManager:
    def __init__(self, *, current_stage: GrantApplicationStageEnum, checkpoint: Any = None) -> None:
        self.current_stage = current_stage
        self.get_or_create_job_for_stage = AsyncMock(
            return_value=SimpleNamespace(id=UUID(int=1), status=RagGenerationStatusEnum.PENDING)
        )
        self.update_job_status = AsyncMock()
        self.ensure_not_cancelled = AsyncMock()
        self.save_substage_checkpoint = AsyncMock()
        self.transition_to_next_stage = AsyncMock()
        self.add_notification = AsyncMock()
        self.get_checkpoint_data = AsyncMock(return_value=checkpoint)
        self.clear_checkpoint_data = AsyncMock()


@pytest.mark.asyncio
async def test_blueprint_prep_resumes_from_extract_relationships(mocker: MockerFixture) -> None:
    """Test that BLUEPRINT_PREP resumes correctly after extract_relationships completes."""
    grant_template = SimpleNamespace(
        id=UUID(int=1),
        grant_application_id=UUID(int=2),
        cfp_analysis={"sections": [{"id": "sec"}]},
        grant_sections=[],
    )
    grant_application = cast(
        "GrantApplication",
        SimpleNamespace(
            id=UUID(int=2),
            title="Test Application",
            grant_template=grant_template,
            research_objectives=[],
            form_inputs={},
        ),
    )

    mocker.patch(
        "services.rag.src.grant_application.pipeline._determine_current_stage",
        return_value=GrantApplicationStageEnum.BLUEPRINT_PREP,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    # Mock checkpoint data with completed extract_relationships
    checkpoint_data = {
        "completed_substages": ["extract_relationships"],
        "work_plan_section": {
            "id": "plan",
            "title": "Plan",
            "order": 1,
            "parent_id": None,
            "depends_on": [],
            "keywords": [],
            "topics": [],
            "generation_instructions": "",
            "max_words": 1500,
            "search_queries": [],
            "is_detailed_research_plan": True,
            "is_clinical_trial": False,
            "evidence": "",
        },
        "relationships": {"1": [("2", "depends on")]},
    }

    fake_job_manager = FakeJobManager(
        current_stage=GrantApplicationStageEnum.BLUEPRINT_PREP, checkpoint=checkpoint_data
    )
    patch_job_manager(mocker, fake_job_manager)

    # Mock stage handlers
    extract_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage",
        AsyncMock(),
    )

    objectives_dto = {**checkpoint_data, "enrichment_responses": [{"research_objective": {}, "research_tasks": []}]}
    enrich_objectives_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage",
        AsyncMock(return_value=objectives_dto),
    )

    terminology_dto = {**objectives_dto, "wikidata_enrichments": []}
    enrich_terminology_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_terminology_stage",
        AsyncMock(return_value=terminology_dto),
    )

    # Execute pipeline
    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="test-trace",
    )

    # Verify extract_relationships was NOT called (should be skipped)
    extract_mock.assert_not_called()

    # Verify enrich_objectives and enrich_terminology WERE called
    enrich_objectives_mock.assert_awaited_once()
    enrich_terminology_mock.assert_awaited_once()

    # Verify checkpoints were saved for the executed sub-stages
    assert fake_job_manager.save_substage_checkpoint.await_count == 2
    fake_job_manager.save_substage_checkpoint.assert_has_awaits(
        [
            call("enrich_objectives", mocker.ANY),
            call("enrich_terminology", mocker.ANY),
        ]
    )


@pytest.mark.asyncio
async def test_blueprint_prep_resumes_from_enrich_objectives(mocker: MockerFixture) -> None:
    """Test that BLUEPRINT_PREP resumes correctly after enrich_objectives completes."""
    grant_template = SimpleNamespace(
        id=UUID(int=1),
        grant_application_id=UUID(int=2),
        cfp_analysis={"sections": [{"id": "sec"}]},
        grant_sections=[],
    )
    grant_application = cast(
        "GrantApplication",
        SimpleNamespace(
            id=UUID(int=2),
            title="Test Application",
            grant_template=grant_template,
            research_objectives=[],
            form_inputs={},
        ),
    )

    mocker.patch(
        "services.rag.src.grant_application.pipeline._determine_current_stage",
        return_value=GrantApplicationStageEnum.BLUEPRINT_PREP,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    # Mock checkpoint data with both extract_relationships and enrich_objectives completed
    enrichment_data = {
        "enriched": "test",
        "queries": ["query1"],
        "terms": ["term1"],
        "context": "context",
        "instructions": "instructions",
        "description": "description",
        "questions": ["question1"],
    }
    checkpoint_data = {
        "completed_substages": ["extract_relationships", "enrich_objectives"],
        "work_plan_section": {
            "id": "plan",
            "title": "Plan",
            "order": 1,
            "parent_id": None,
            "depends_on": [],
            "keywords": [],
            "topics": [],
            "generation_instructions": "",
            "max_words": 1500,
            "search_queries": [],
            "is_detailed_research_plan": True,
            "is_clinical_trial": False,
            "evidence": "",
        },
        "relationships": {"1": [("2", "depends on")]},
        "enrichment_responses": [{"research_objective": enrichment_data, "research_tasks": [enrichment_data]}],
    }

    fake_job_manager = FakeJobManager(
        current_stage=GrantApplicationStageEnum.BLUEPRINT_PREP, checkpoint=checkpoint_data
    )
    patch_job_manager(mocker, fake_job_manager)

    extract_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage",
        AsyncMock(),
    )

    enrich_objectives_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage",
        AsyncMock(),
    )

    terminology_dto = {**checkpoint_data, "wikidata_enrichments": []}
    enrich_terminology_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_terminology_stage",
        AsyncMock(return_value=terminology_dto),
    )

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="test-trace",
    )

    # Verify first two sub-stages were skipped
    extract_mock.assert_not_called()
    enrich_objectives_mock.assert_not_called()

    # Verify only enrich_terminology was called
    enrich_terminology_mock.assert_awaited_once()

    # Verify only one checkpoint was saved (for terminology)
    assert fake_job_manager.save_substage_checkpoint.await_count == 1
    fake_job_manager.save_substage_checkpoint.assert_awaited_once_with("enrich_terminology", mocker.ANY)


@pytest.mark.asyncio
async def test_blueprint_prep_executes_all_substages_when_no_checkpoint(mocker: MockerFixture) -> None:
    """Test that BLUEPRINT_PREP executes all sub-stages when there's no checkpoint data."""
    grant_template = SimpleNamespace(
        id=UUID(int=1),
        grant_application_id=UUID(int=2),
        cfp_analysis={"sections": [{"id": "sec"}]},
        grant_sections=[],
    )
    grant_application = cast(
        "GrantApplication",
        SimpleNamespace(
            id=UUID(int=2),
            title="Test Application",
            grant_template=grant_template,
            research_objectives=[],
            form_inputs={},
        ),
    )

    mocker.patch(
        "services.rag.src.grant_application.pipeline._determine_current_stage",
        return_value=GrantApplicationStageEnum.BLUEPRINT_PREP,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    # No checkpoint data
    fake_job_manager = FakeJobManager(current_stage=GrantApplicationStageEnum.BLUEPRINT_PREP, checkpoint=None)
    patch_job_manager(mocker, fake_job_manager)

    relationships_dto = {
        "work_plan_section": {
            "id": "plan",
            "title": "Plan",
            "order": 1,
            "parent_id": None,
            "depends_on": [],
            "keywords": [],
            "topics": [],
            "generation_instructions": "",
            "max_words": 1500,
            "search_queries": [],
            "is_detailed_research_plan": True,
            "is_clinical_trial": False,
            "evidence": "",
        },
        "relationships": {"1": [("2", "depends on")]},
    }
    extract_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage",
        AsyncMock(return_value=relationships_dto),
    )

    objectives_dto = {**relationships_dto, "enrichment_responses": [{"research_objective": {}, "research_tasks": []}]}
    enrich_objectives_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage",
        AsyncMock(return_value=objectives_dto),
    )

    terminology_dto = {**objectives_dto, "wikidata_enrichments": []}
    enrich_terminology_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_terminology_stage",
        AsyncMock(return_value=terminology_dto),
    )

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="test-trace",
    )

    # Verify all three sub-stages were called
    extract_mock.assert_awaited_once()
    enrich_objectives_mock.assert_awaited_once()
    enrich_terminology_mock.assert_awaited_once()

    # Verify all three checkpoints were saved
    assert fake_job_manager.save_substage_checkpoint.await_count == 3
    fake_job_manager.save_substage_checkpoint.assert_has_awaits(
        [
            call("extract_relationships", mocker.ANY),
            call("enrich_objectives", mocker.ANY),
            call("enrich_terminology", mocker.ANY),
        ]
    )
