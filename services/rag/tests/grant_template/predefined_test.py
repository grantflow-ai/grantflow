from typing import Any

import pytest
from packages.db.src.tables import GrantingInstitution, GrantTemplate, PredefinedGrantTemplate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import GrantingInstitutionFactory, PredefinedGrantTemplateFactory

from services.rag.src.grant_template.predefined import (
    _fetch_latest_by_activity,
    _fetch_latest_for_institution,
    apply_predefined_template,
    get_predefined_template,
)


@pytest.fixture
async def granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitutionFactory.build()
        session.add(institution)
        await session.flush()
        await session.refresh(institution)
        return institution


async def test_get_predefined_template_prefers_activity_code(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> None:
    async with async_session_maker() as session, session.begin():
        match = PredefinedGrantTemplateFactory.build(
            granting_institution_id=granting_institution.id,
            activity_code="R21",
        )
        fallback = PredefinedGrantTemplateFactory.build(
            granting_institution_id=granting_institution.id,
            activity_code=None,
        )
        session.add_all([match, fallback])
        await session.flush()
        assert match.activity_code == "R21"
        match_id = match.id

    async with async_session_maker() as session:
        exists = await session.scalar(
            select(PredefinedGrantTemplate).where(
                PredefinedGrantTemplate.id == match_id,
                PredefinedGrantTemplate.activity_code == "R21",
            )
        )
        stored_institution_id = await session.scalar(
            select(PredefinedGrantTemplate.granting_institution_id).where(PredefinedGrantTemplate.id == match_id)
        )
        stored_deleted_at = await session.scalar(
            select(PredefinedGrantTemplate.deleted_at).where(PredefinedGrantTemplate.id == match_id)
        )
        manual_result = await session.execute(
            select(PredefinedGrantTemplate)
            .where(
                PredefinedGrantTemplate.granting_institution_id == granting_institution.id,
                PredefinedGrantTemplate.activity_code == "R21",
                PredefinedGrantTemplate.deleted_at.is_(None),
            )
            .order_by(PredefinedGrantTemplate.created_at.desc())
        )
        manual = manual_result.scalars().first()
        direct = await _fetch_latest_by_activity(
            session,
            granting_institution_id=granting_institution.id,
            activity_code="R21",
        )
    assert exists is not None
    assert stored_institution_id == granting_institution.id
    assert stored_deleted_at is None
    assert manual is not None
    assert direct is not None

    template = await get_predefined_template(
        session_maker=async_session_maker,
        granting_institution_id=granting_institution.id,
        activity_code="R21",
    )

    assert isinstance(template, PredefinedGrantTemplate)
    assert template.activity_code == "R21"


async def test_get_predefined_template_falls_back_to_institution(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> None:
    async with async_session_maker() as session, session.begin():
        fallback = PredefinedGrantTemplateFactory.build(
            granting_institution_id=granting_institution.id,
            activity_code=None,
        )
        session.add(fallback)
        await session.flush()
        fallback_id = fallback.id

    async with async_session_maker() as session:
        manual_result = await session.execute(
            select(PredefinedGrantTemplate)
            .where(
                PredefinedGrantTemplate.granting_institution_id == granting_institution.id,
                PredefinedGrantTemplate.deleted_at.is_(None),
            )
            .order_by(PredefinedGrantTemplate.created_at.desc())
        )
        manual = manual_result.scalars().first()
        direct = await _fetch_latest_for_institution(
            session,
            granting_institution_id=granting_institution.id,
        )
        exists = await session.scalar(
            select(PredefinedGrantTemplate).where(
                PredefinedGrantTemplate.id == fallback_id,
            )
        )
    assert manual is not None
    assert direct is not None
    assert exists is not None

    template = await get_predefined_template(
        session_maker=async_session_maker,
        granting_institution_id=granting_institution.id,
        activity_code="UNKNOWN",
    )

    assert isinstance(template, PredefinedGrantTemplate)
    assert template.activity_code is None


async def test_apply_predefined_template_updates_grant_template(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
    granting_institution: GrantingInstitution,
) -> None:
    new_section_title = "Updated Specific Aims"

    async with async_session_maker() as session, session.begin():
        predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=granting_institution.id,
            activity_code="R01",
            grant_sections=[
                {
                    "id": "specific-aims",
                    "order": 1,
                    "title": new_section_title,
                    "evidence": "",
                    "parent_id": None,
                    "needs_applicant_writing": False,
                }
            ],
        )
        session.add(predefined)
        await session.flush()
        predefined_id = predefined.id

    async with async_session_maker() as session:
        manual_result = await session.execute(
            select(PredefinedGrantTemplate).where(
                PredefinedGrantTemplate.id == predefined_id,
                PredefinedGrantTemplate.activity_code == "R01",
                PredefinedGrantTemplate.deleted_at.is_(None),
            )
        )
        manual = manual_result.scalars().first()
    assert manual is not None

    template = await get_predefined_template(
        session_maker=async_session_maker,
        granting_institution_id=granting_institution.id,
        activity_code="R01",
    )
    assert template is not None

    await apply_predefined_template(
        session_maker=async_session_maker,
        grant_template=grant_template_with_sections,
        predefined_template=template,
    )

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.id == grant_template_with_sections.id)
        )

    assert updated_template is not None
    assert updated_template.predefined_template_id == template.id
    assert updated_template.granting_institution_id == granting_institution.id
    assert updated_template.grant_sections[0]["title"] == new_section_title
