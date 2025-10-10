from __future__ import annotations

from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, Self, cast
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from packages.db.src.enums import ApplicationStatusEnum, GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.shared_utils.src.exceptions import BackendError, ValidationError

from services.rag.src.grant_application.pipeline import _determine_current_stage, handle_grant_application_pipeline

if TYPE_CHECKING:
    from collections.abc import Sequence

    from packages.db.src.tables import GrantApplication
    from pytest_mock import MockerFixture


JobRecord = SimpleNamespace


class FakeResult:
    def __init__(self, jobs: Sequence[JobRecord]) -> None:
        self._jobs = jobs

    def scalars(self) -> FakeResult:  # pragma: no cover - simple helper
        return self

    def all(self) -> list[JobRecord]:  # pragma: no cover - simple helper
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
async def test_determine_current_stage_resumes_pending_stage() -> None:
    jobs: tuple[JobRecord, ...] = (
        SimpleNamespace(
            id=UUID(int=10),
            status=RagGenerationStatusEnum.COMPLETED,
            application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
        ),
        SimpleNamespace(
            id=UUID(int=11),
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
        ),
    )

    stage = await _determine_current_stage(UUID(int=123), make_session_maker(jobs))
    assert stage is GrantApplicationStageEnum.WORKPLAN_GENERATION


@pytest.mark.asyncio
async def test_determine_current_stage_returns_first_when_no_jobs() -> None:
    stage = await _determine_current_stage(UUID(int=0), make_session_maker(()))
    assert stage is GrantApplicationStageEnum.BLUEPRINT_PREP


@pytest.mark.asyncio
async def test_pipeline_blueprint_stage_executes_all_substeps(mocker: MockerFixture) -> None:
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
            text=None,
            status=ApplicationStatusEnum.IN_PROGRESS,
        ),
    )

    mocker.patch(
        "services.rag.src.grant_application.pipeline._determine_current_stage",
        return_value=GrantApplicationStageEnum.BLUEPRINT_PREP,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    relationships_dto = {
        "work_plan_section": {
            "id": "research_plan",
            "title": "Research Plan",
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
        "relationships": {"1": [("2", "Dependent")]},
    }
    objectives_dto = {**relationships_dto, "enrichment_responses": [{}]}
    terminology_dto = {**objectives_dto, "wikidata_enrichments": [{}]}

    extract_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_extract_relationships_stage",
        AsyncMock(return_value=relationships_dto),
    )
    enrich_obj_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_objectives_stage",
        AsyncMock(return_value=objectives_dto),
    )
    enrich_term_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_enrich_terminology_stage",
        AsyncMock(return_value=terminology_dto),
    )

    fake_job_manager = FakeJobManager(current_stage=GrantApplicationStageEnum.BLUEPRINT_PREP)
    patch_job_manager(mocker, fake_job_manager)

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="trace-blueprint",
    )

    extract_mock.assert_awaited_once()
    enrich_obj_mock.assert_awaited_once()
    enrich_term_mock.assert_awaited_once()
    fake_job_manager.ensure_not_cancelled.assert_awaited()
    fake_job_manager.update_job_status.assert_awaited_once_with(RagGenerationStatusEnum.PROCESSING)
    fake_job_manager.transition_to_next_stage.assert_awaited_once_with(terminology_dto)


@pytest.mark.asyncio
async def test_pipeline_raises_when_checkpoint_missing(mocker: MockerFixture) -> None:
    grant_template = SimpleNamespace(
        id=UUID(int=1),
        grant_application_id=UUID(int=2),
        cfp_analysis={"sections": []},
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
        return_value=GrantApplicationStageEnum.WORKPLAN_GENERATION,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    fake_job_manager = FakeJobManager(
        current_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
        checkpoint=None,
    )
    fake_job_manager.get_checkpoint_data.side_effect = ValidationError("Missing checkpoint data for stage")
    patch_job_manager(mocker, fake_job_manager)

    generate_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_research_plan_stage",
        AsyncMock(),
    )

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="trace-missing",
    )
    assert fake_job_manager.get_checkpoint_data.await_count >= 1
    generate_mock.assert_not_awaited()
    fake_job_manager.transition_to_next_stage.assert_not_awaited()


@pytest.mark.asyncio
async def test_pipeline_handles_stage_error(mocker: MockerFixture) -> None:
    grant_template = SimpleNamespace(
        id=UUID(int=1),
        grant_application_id=UUID(int=2),
        cfp_analysis={"sections": []},
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
        return_value=GrantApplicationStageEnum.SECTION_SYNTHESIS,
    )
    mocker.patch("services.rag.src.grant_application.pipeline.verify_rag_sources_indexed", AsyncMock())

    checkpoint_data = {
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
        "relationships": {},
        "enrichment_responses": [],
        "wikidata_enrichments": [],
        "research_plan_text": "",
    }
    fake_job_manager = FakeJobManager(
        current_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
        checkpoint=checkpoint_data,
    )
    patch_job_manager(mocker, fake_job_manager)

    error_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        AsyncMock(side_effect=BackendError("boom")),
    )
    handle_error_mock = mocker.patch(
        "services.rag.src.grant_application.pipeline._handle_pipeline_error",
        AsyncMock(),
    )

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=make_session_maker([]),
        trace_id="trace-error",
    )

    error_mock.assert_awaited_once()
    handle_error_mock.assert_awaited_once()
