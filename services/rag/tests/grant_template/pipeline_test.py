import os
from typing import Any

import pytest
from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import GrantTemplate, RagGenerationJob
from packages.shared_utils.src.exceptions import BackendError
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import PredefinedGrantTemplateFactory

from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

pytest_plugins = ["testing.db_test_plugin"]

pytestmark = pytest.mark.skipif(not os.getenv("PUBSUB_EMULATOR_HOST"), reason="PUBSUB_EMULATOR_HOST not set")


async def test_handle_grant_template_pipeline_cfp_analysis(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    cfp_analysis_dto = {"cfp_analysis": {"sections": ["sec"]}}
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
    generation_mock.assert_not_called()


async def test_pipeline_runs_cfp_analysis_even_with_predefined(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    from sqlalchemy import update

    if not grant_template.granting_institution_id:
        pytest.skip("grant_template fixture missing granting institution")

    predefined = PredefinedGrantTemplateFactory.build(
        granting_institution_id=grant_template.granting_institution_id,
    )

    async with async_session_maker() as session:
        session.add(predefined)
        await session.flush()
        await session.execute(
            update(GrantTemplate)
            .where(GrantTemplate.id == grant_template.id)
            .values(predefined_template_id=predefined.id)
        )
        await session.commit()

    cfp_analysis_dto = {"cfp_analysis": {"sections": ["sec"], "subject": "Foo", "deadlines": [], "organization": None}}
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


async def test_handle_grant_template_pipeline_propagates_backend_error(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
    from packages.db.src.tables import RagGenerationJob
    from sqlalchemy import update

    async with async_session_maker() as session:
        await session.execute(
            update(GrantTemplate).where(GrantTemplate.id == grant_template.id).values(cfp_analysis={"sections": []})
        )

        cfp_job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={"cfp_analysis": {"sections": []}},
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

    generation_mock.assert_called()


async def test_template_generation_short_circuits_with_selected_predefined(
    mocker: MockerFixture,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    from sqlalchemy import update

    if not grant_template.granting_institution_id:
        pytest.skip("grant_template fixture missing granting institution")

    async with async_session_maker() as session:
        predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=grant_template.granting_institution_id,
            grant_sections=[
                {
                    "id": "auto-section",
                    "title": "Auto Section",
                    "order": 1,
                    "evidence": "",
                    "parent_id": None,
                    "needs_applicant_writing": False,
                }
            ],
        )
        session.add(predefined)
        await session.flush()

        await session.execute(
            update(GrantTemplate)
            .where(GrantTemplate.id == grant_template.id)
            .values(predefined_template_id=predefined.id)
        )

        cfp_job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={
                "cfp_analysis": {
                    "subject": "NIH Clinical Trial Readiness",
                    "sections": [{"id": "s1"}],
                    "deadlines": ["2030-01-01"],
                    "global_constraints": [],
                    "organization": {
                        "id": str(grant_template.granting_institution_id),
                        "full_name": "National Institutes of Health",
                        "abbreviation": "NIH",
                    },
                    "activity_code": "r21",
                }
            },
        )
        session.add(cfp_job)
        await session.commit()

    generation_mock = mocker.patch(
        "services.rag.src.grant_template.pipeline.handle_template_generation_stage",
    )

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is not None
    generation_mock.assert_not_called()

    async with async_session_maker() as session:
        refreshed = await session.get(GrantTemplate, grant_template.id)

    assert refreshed is not None
    assert refreshed.predefined_template_id == predefined.id
    assert refreshed.cfp_analysis is not None
    assert refreshed.cfp_analysis["subject"] == "NIH Clinical Trial Readiness"
    assert refreshed.grant_sections == predefined.grant_sections


async def test_handle_grant_template_pipeline_clones_predefined_based_on_activity_code(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    if not grant_template.granting_institution_id:
        pytest.skip("grant_template fixture missing granting institution")

    async with async_session_maker() as session:
        predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=grant_template.granting_institution_id,
            activity_code="R21",
            grant_sections=[
                {
                    "id": "specific-aims",
                    "title": "Specific Aims (Predefined)",
                    "order": 1,
                    "evidence": "",
                    "parent_id": None,
                    "needs_applicant_writing": True,
                }
            ],
        )
        session.add(predefined)
        cfp_job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={
                "cfp_analysis": {
                    "subject": "NIH Clinical Trial Readiness",
                    "sections": [],
                    "deadlines": [],
                    "global_constraints": [],
                    "organization": {
                        "id": str(grant_template.granting_institution_id),
                        "full_name": "National Institutes of Health",
                        "abbreviation": "NIH",
                    },
                    "activity_code": "r21",
                }
            },
        )
        session.add(cfp_job)
        await session.commit()
        predefined_id = predefined.id

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is not None

    async with async_session_maker() as session:
        refreshed = await session.get(GrantTemplate, grant_template.id)

    assert refreshed is not None
    assert refreshed.predefined_template_id == predefined_id
    assert refreshed.grant_sections[0]["title"] == "Specific Aims (Predefined)"
    assert refreshed.cfp_analysis is not None
    assert refreshed.cfp_analysis["subject"] == "NIH Clinical Trial Readiness"


async def test_handle_grant_template_pipeline_clones_predefined_when_activity_code_missing(
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    if not grant_template.granting_institution_id:
        pytest.skip("grant_template fixture missing granting institution")

    async with async_session_maker() as session:
        predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=grant_template.granting_institution_id,
            activity_code=None,
        )
        session.add(predefined)
        cfp_job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={
                "cfp_analysis": {
                    "subject": "NIH Clinical Trial Readiness",
                    "sections": [],
                    "deadlines": [],
                    "global_constraints": [],
                    "organization": {
                        "id": str(grant_template.granting_institution_id),
                        "full_name": "National Institutes of Health",
                        "abbreviation": "NIH",
                    },
                    "activity_code": None,
                }
            },
        )
        session.add(cfp_job)
        await session.commit()
        predefined_id = predefined.id

    result = await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    assert result is not None

    async with async_session_maker() as session:
        refreshed = await session.get(GrantTemplate, grant_template.id)

    assert refreshed is not None
    assert refreshed.predefined_template_id == predefined_id
    assert refreshed.cfp_analysis is not None
    assert refreshed.cfp_analysis["subject"] == "NIH Clinical Trial Readiness"
