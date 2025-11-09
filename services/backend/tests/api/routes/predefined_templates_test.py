from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.enums import GrantType
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import PredefinedGrantTemplateFactory

from services.backend.tests.api.routes.granting_institutions_test import (
    backoffice_admin_firebase_uid as backoffice_admin_firebase_uid_fixture,
)
from services.backend.tests.api.routes.granting_institutions_test import (
    sample_granting_institution as sample_granting_institution_fixture,
)
from services.backend.tests.conftest import TestingClientType

backoffice_admin_firebase_uid = backoffice_admin_firebase_uid_fixture
sample_granting_institution = sample_granting_institution_fixture


def build_section(title: str, *, parent_id: str | None = None) -> dict[str, Any]:
    return {
        "id": f"section-{title.lower().replace(' ', '-')}",
        "order": 0,
        "title": title,
        "parent_id": parent_id,
        "evidence": "",
        "generation_instructions": f"Write the {title} section",
        "depends_on": [],
        "is_clinical_trial": None,
        "is_detailed_research_plan": False,
        "keywords": [],
        "length_constraint": {"type": "words", "value": 500, "source": None},
        "search_queries": [],
        "topics": [],
    }


@pytest.fixture
def sample_sections() -> list[dict[str, Any]]:
    return [build_section("Specific Aims"), build_section("Research Strategy")]


async def test_backoffice_admin_can_create_predefined_template(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
    sample_sections: list[dict[str, Any]],
) -> None:
    assert backoffice_admin_firebase_uid
    response = await test_client.post(
        "/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "NIH R21 Template",
            "description": "Clinical trial readiness",
            "grant_type": GrantType.RESEARCH.value,
            "granting_institution_id": str(sample_granting_institution.id),
            "activity_code": "R21",
            "grant_sections": sample_sections,
        },
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    data = response.json()
    assert data["name"] == "NIH R21 Template"
    assert data["activity_code"] == "R21"
    assert len(data["grant_sections"]) == 2


async def test_list_predefined_templates_filters(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        other_institution = GrantingInstitution(full_name="Other", abbreviation="OTH")
        session.add(other_institution)
        await session.flush()

        session.add_all(
            [
                PredefinedGrantTemplateFactory.build(
                    granting_institution_id=sample_granting_institution.id,
                    activity_code="R21",
                ),
                PredefinedGrantTemplateFactory.build(
                    granting_institution_id=other_institution.id,
                    activity_code="R01",
                ),
            ]
        )

    response = await test_client.get(
        f"/predefined-templates?granting_institution_id={sample_granting_institution.id}&activity_code=R21",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["activity_code"] == "R21"
    assert data[0]["granting_institution"]["id"] == str(sample_granting_institution.id)


async def test_get_predefined_template(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=sample_granting_institution.id,
            activity_code="R01",
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    response = await test_client.get(
        f"/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["id"] == str(template_id)
    assert data["grant_sections"]


async def test_update_predefined_template(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=sample_granting_institution.id,
            activity_code="R01",
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    patch_data = {
        "description": "Updated description",
        "activity_code": "R99",
        "grant_sections": [build_section("Updated Section")],
    }

    response = await test_client.patch(
        f"/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json=patch_data,
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["activity_code"] == "R99"
    assert len(data["grant_sections"]) == 1


async def test_delete_predefined_template(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=sample_granting_institution.id,
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    response = await test_client.delete(
        f"/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        deleted = await session.scalar(select(PredefinedGrantTemplate).where(PredefinedGrantTemplate.id == template_id))
        assert deleted is not None
        assert deleted.deleted_at is not None


async def test_non_admin_cannot_create_predefined_template(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
    sample_sections: list[dict[str, Any]],
) -> None:
    response = await test_client.post(
        "/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "Unauthorized",
            "grant_type": GrantType.RESEARCH.value,
            "granting_institution_id": str(sample_granting_institution.id),
            "grant_sections": sample_sections,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
