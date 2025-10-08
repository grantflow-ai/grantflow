from __future__ import annotations

from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, Callable, Sequence, cast
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.shared_utils.src.exceptions import BackendError, ValidationError

from services.rag.src.grant_template.pipeline import _determine_current_stage, handle_grant_template_pipeline

if TYPE_CHECKING:
    from packages.db.src.tables import GrantTemplate
    from pytest_mock import MockerFixture


JobRecord = SimpleNamespace


class FakeResult:
    def __init__(self, jobs: Sequence[JobRecord]) -> None:
        self._jobs = jobs

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list[JobRecord]:
        return list(self._jobs)


class FakeSession:
    def __init__(self, jobs: Sequence[JobRecord]) -> None:
        self._jobs = jobs

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None

    async def execute(self, *_: Any, **__: Any) -> FakeResult:
        return FakeResult(self._jobs)


def make_session_maker(jobs: Sequence[JobRecord]) -> Callable[[], FakeSession]:
    def factory() -> FakeSession:
        return FakeSession(jobs)

    return factory


def patch_job_manager(mocker: "MockerFixture", fake_manager: FakeJobManager) -> None:
    job_manager_cls = mocker.patch(
        "services.rag.src.grant_template.pipeline.JobManager",
        return_value=fake_manager,
    )
    setattr(job_manager_cls, "__class_getitem__", MagicMock(return_value=job_manager_cls))


class FakeJobManager:
    def __init__(self, current_stage: GrantTemplateStageEnum, checkpoint: Any = None) -> None:
        self.current_stage = current_stage
        self.get_or_create_job_for_stage = AsyncMock(
            return_value=SimpleNamespace(id=UUID(int=3), status=RagGenerationStatusEnum.PENDING)
        )
        self.ensure_not_cancelled = AsyncMock()
        self.update_job_status = AsyncMock()
        self.transition_to_next_stage = AsyncMock()
        self.get_checkpoint_data = AsyncMock(return_value=checkpoint)
        self.add_notification = AsyncMock()
        self.clear_checkpoint_data = AsyncMock()


@pytest.mark.asyncio
async def test_determine_current_stage_template_pending() -> None:
    jobs: tuple[JobRecord, ...] = (
        SimpleNamespace(
            id=UUID(int=200),
            status=RagGenerationStatusEnum.COMPLETED,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
        ),
        SimpleNamespace(
            id=UUID(int=201),
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.TEMPLATE_GENERATION,
        ),
    )
    stage = await _determine_current_stage(UUID(int=99), make_session_maker(jobs))
    assert stage is GrantTemplateStageEnum.TEMPLATE_GENERATION


@pytest.mark.asyncio
async def test_handle_grant_template_pipeline_cfp_analysis(mocker: MockerFixture) -> None:
    grant_template = cast(
        "GrantTemplate",
        SimpleNamespace(
            id=UUID(int=1),
            grant_application_id=UUID(int=2),
            cfp_analysis=None,
            grant_sections=[],
        ),
    )
    mocker.patch(
        "services.rag.src.grant_template.pipeline._determine_current_stage",
        return_value=GrantTemplateStageEnum.CFP_ANALYSIS,
    )

    cfp_analysis_dto = {"cfp_analysis": {"sections": ["sec"]}}
    cfp_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
        AsyncMock(return_value=cfp_analysis_dto),
    )

    fake_job_manager = FakeJobManager(GrantTemplateStageEnum.CFP_ANALYSIS)
    patch_job_manager(mocker, fake_job_manager)

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=make_session_maker([]),
        trace_id="trace-cfp",
    )

    assert result is None
    cfp_mock.assert_awaited_once()
    fake_job_manager.transition_to_next_stage.assert_awaited_once_with(cfp_analysis_dto)
    fake_job_manager.update_job_status.assert_awaited_once_with(RagGenerationStatusEnum.PROCESSING)


@pytest.mark.asyncio
async def test_handle_grant_template_pipeline_template_generation_requires_checkpoint(mocker: MockerFixture) -> None:
    grant_template = cast(
        "GrantTemplate",
        SimpleNamespace(
            id=UUID(int=1),
            grant_application_id=UUID(int=2),
            cfp_analysis={"sections": []},
            grant_sections=[],
        ),
    )
    mocker.patch(
        "services.rag.src.grant_template.pipeline._determine_current_stage",
        return_value=GrantTemplateStageEnum.TEMPLATE_GENERATION,
    )

    fake_job_manager = FakeJobManager(GrantTemplateStageEnum.TEMPLATE_GENERATION, checkpoint=None)
    fake_job_manager.get_checkpoint_data.side_effect = ValidationError("Missing checkpoint data for stage")
    patch_job_manager(mocker, fake_job_manager)

    generation_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_template_generation_stage",
        AsyncMock(),
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=make_session_maker([]),
        trace_id="trace-no-checkpoint",
    )

    assert result is None
    fake_job_manager.get_checkpoint_data.assert_awaited_once()
    generation_mock.assert_not_awaited()
    fake_job_manager.transition_to_next_stage.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_grant_template_pipeline_propagates_backend_error(mocker: MockerFixture) -> None:
    grant_template = cast(
        "GrantTemplate",
        SimpleNamespace(
            id=UUID(int=1),
            grant_application_id=UUID(int=2),
            cfp_analysis={"sections": []},
            grant_sections=[],
        ),
    )
    mocker.patch(
        "services.rag.src.grant_template.pipeline._determine_current_stage",
        return_value=GrantTemplateStageEnum.TEMPLATE_GENERATION,
    )

    fake_job_manager = FakeJobManager(
        GrantTemplateStageEnum.TEMPLATE_GENERATION,
        checkpoint={"cfp_analysis": {"sections": []}},
    )
    patch_job_manager(mocker, fake_job_manager)

    generation_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_template_generation_stage",
        AsyncMock(side_effect=BackendError("failed")),
    )

    await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=make_session_maker([]),
        trace_id="trace-error",
    )

    generation_mock.assert_awaited_once()
    fake_job_manager.clear_checkpoint_data.assert_awaited_once()
    fake_job_manager.update_job_status.assert_awaited()
    fake_job_manager.clear_checkpoint_data.assert_awaited_once()
