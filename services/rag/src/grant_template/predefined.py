from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

from packages.db.src.enums import GrantType
from packages.db.src.tables import GrantTemplate, PredefinedGrantTemplate
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.engine import ScalarResult
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = get_logger(__name__)


async def _fetch_latest_by_activity(
    session: AsyncSession,
    *,
    granting_institution_id: UUID,
    activity_code: str,
) -> PredefinedGrantTemplate | None:
    stmt = (
        select(PredefinedGrantTemplate)
        .where(
            PredefinedGrantTemplate.granting_institution_id == granting_institution_id,
            PredefinedGrantTemplate.activity_code == activity_code,
            PredefinedGrantTemplate.deleted_at.is_(None),
        )
        .order_by(PredefinedGrantTemplate.created_at.desc())
    )

    result: ScalarResult[PredefinedGrantTemplate] = await session.scalars(stmt)
    return result.first()


async def _fetch_latest_for_institution(
    session: AsyncSession,
    *,
    granting_institution_id: UUID,
) -> PredefinedGrantTemplate | None:
    stmt = (
        select(PredefinedGrantTemplate)
        .where(
            PredefinedGrantTemplate.granting_institution_id == granting_institution_id,
            PredefinedGrantTemplate.deleted_at.is_(None),
        )
        .order_by(PredefinedGrantTemplate.created_at.desc())
    )

    result: ScalarResult[PredefinedGrantTemplate] = await session.scalars(stmt)
    return result.first()


async def get_predefined_template(
    *,
    session_maker: async_sessionmaker[Any],
    granting_institution_id: UUID,
    activity_code: str | None = None,
) -> PredefinedGrantTemplate | None:
    async with session_maker() as session:
        if activity_code:
            template = await _fetch_latest_by_activity(
                session,
                granting_institution_id=granting_institution_id,
                activity_code=activity_code,
            )
            if template:
                return template

        return await _fetch_latest_for_institution(
            session,
            granting_institution_id=granting_institution_id,
        )


async def get_predefined_template_by_id(
    *,
    session_maker: async_sessionmaker[Any],
    predefined_template_id: UUID,
) -> PredefinedGrantTemplate | None:
    async with session_maker() as session:
        template = await session.get(PredefinedGrantTemplate, predefined_template_id)
        return cast("PredefinedGrantTemplate | None", template)


async def apply_predefined_template(
    *,
    grant_template: GrantTemplate,
    predefined_template: PredefinedGrantTemplate,
    session_maker: async_sessionmaker[Any] | None = None,
    session: AsyncSession | None = None,
) -> None:
    if session is None and session_maker is None:
        raise ValueError("Either session or session_maker is required")

    if session is not None:
        await _apply_template_with_session(
            session=session,
            grant_template=grant_template,
            predefined_template=predefined_template,
        )
        return

    if session_maker is None:
        raise ValueError("session_maker is required when session is not provided")

    async with session_maker() as managed_session, managed_session.begin():
        await _apply_template_with_session(
            session=managed_session,
            grant_template=grant_template,
            predefined_template=predefined_template,
        )


async def _apply_template_with_session(
    *,
    session: AsyncSession,
    grant_template: GrantTemplate,
    predefined_template: PredefinedGrantTemplate,
) -> None:
    await session.execute(
        update(GrantTemplate)
        .where(GrantTemplate.id == grant_template.id)
        .values(
            grant_sections=predefined_template.grant_sections,
            grant_type=GrantType(predefined_template.grant_type),
            predefined_template_id=predefined_template.id,
            granting_institution_id=predefined_template.granting_institution_id,
            cfp_analysis=None,
        )
    )

    grant_template.grant_sections = predefined_template.grant_sections
    grant_template.predefined_template_id = predefined_template.id
    grant_template.grant_type = GrantType(predefined_template.grant_type)

    logger.info(
        "Applied predefined template",
        template_id=str(grant_template.id),
        predefined_template_id=str(predefined_template.id),
        activity_code=predefined_template.activity_code,
    )
