import os
from typing import Any

import pytest
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.exceptions import BackendError
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

pytest_plugins = ["testing.db_test_plugin"]

pytestmark = pytest.mark.skipif(not os.getenv("PUBSUB_EMULATOR_HOST"), reason="PUBSUB_EMULATOR_HOST not set")


async def test_handle_grant_template_pipeline_cfp_analysis(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    cfp_analysis_dto = {"sections": ["sec"]}
    cfp_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_cfp_analysis_stage",
        return_value=cfp_analysis_dto,
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    cfp_mock.assert_called_once()


async def test_handle_grant_template_pipeline_template_generation_requires_checkpoint(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    # Set cfp_analysis to trigger template generation stage
    from sqlalchemy import update

    async with async_session_maker() as session:
        await session.execute(
            update(GrantTemplate).where(GrantTemplate.id == grant_template.id).values(cfp_analysis={"sections": []})
        )
        await session.commit()

    generation_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_template_generation_stage",
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is None
    # Should not call generation because there's no checkpoint data from cfp_analysis stage
    generation_mock.assert_not_called()


async def test_handle_grant_template_pipeline_propagates_backend_error(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    # Create a completed CFP_ANALYSIS job so pipeline will try TEMPLATE_GENERATION
    from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
    from packages.db.src.tables import RagGenerationJob
    from sqlalchemy import update

    async with async_session_maker() as session:
        # Update template with cfp_analysis
        await session.execute(
            update(GrantTemplate).where(GrantTemplate.id == grant_template.id).values(cfp_analysis={"sections": []})
        )

        # Create completed CFP_ANALYSIS job
        cfp_job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={"sections": []},
        )
        session.add(cfp_job)
        await session.commit()

    generation_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_template_generation_stage",
        side_effect=BackendError("failed"),
    )

    await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    # Verify handler was called and error was handled
    generation_mock.assert_called()
