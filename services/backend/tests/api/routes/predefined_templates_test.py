from http import HTTPStatus
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantLongFormSection
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantingInstitutionFactory,
    GrantSectionFactory,
    PredefinedGrantTemplateFactory,
)

from services.backend.tests.api.routes.granting_institutions_test import (
    backoffice_admin_firebase_uid as backoffice_admin_firebase_uid_fixture,
)
from services.backend.tests.api.routes.granting_institutions_test import (
    sample_granting_institution as sample_granting_institution_fixture,
)
from services.backend.tests.conftest import TestingClientType

backoffice_admin_firebase_uid = backoffice_admin_firebase_uid_fixture
sample_granting_institution = sample_granting_institution_fixture


@pytest.fixture
def sample_sections() -> list[GrantLongFormSection]:
    return [
        GrantSectionFactory.build(title="Specific Aims", order=1),
        GrantSectionFactory.build(title="Research Strategy", order=2),
    ]


async def test_backoffice_admin_can_create_predefined_template(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
    sample_sections: list[GrantLongFormSection],
) -> None:
    assert backoffice_admin_firebase_uid
    response = await test_client.post(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "NIH R21 Template",
            "description": "Clinical trial readiness",
            "grant_type": GrantType.RESEARCH.value,
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
        other_institution = GrantingInstitutionFactory.build(full_name="Other", abbreviation="OTH")
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
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates?activity_code=R21",
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
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
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
        "grant_sections": [GrantSectionFactory.build(title="Updated Section", order=1)],
    }

    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
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
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
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
    sample_sections: list[GrantLongFormSection],
) -> None:
    response = await test_client.post(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "Unauthorized",
            "grant_type": GrantType.RESEARCH.value,
            "grant_sections": sample_sections,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_template_with_nonexistent_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    otp_code: str,
    sample_sections: list[GrantLongFormSection],
) -> None:
    assert backoffice_admin_firebase_uid
    fake_institution_id = uuid4()
    response = await test_client.post(
        f"/granting-institutions/{fake_institution_id}/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "Test Template",
            "grant_type": GrantType.RESEARCH.value,
            "grant_sections": sample_sections,
        },
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_create_template_with_empty_grant_sections(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    response = await test_client.post(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "name": "Empty Sections Template",
            "grant_type": GrantType.RESEARCH.value,
            "grant_sections": [],
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_get_template_from_different_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        other_institution = GrantingInstitutionFactory.build(full_name="Other", abbreviation="OTH")
        session.add(other_institution)
        await session.flush()

        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=other_institution.id,
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    response = await test_client.get(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_update_template_from_different_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        other_institution = GrantingInstitutionFactory.build(full_name="Other", abbreviation="OTH")
        session.add(other_institution)
        await session.flush()

        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=other_institution.id,
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"description": "Updated"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_delete_template_from_different_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    assert backoffice_admin_firebase_uid
    async with async_session_maker() as session, session.begin():
        other_institution = GrantingInstitutionFactory.build(full_name="Other", abbreviation="OTH")
        session.add(other_institution)
        await session.flush()

        template = PredefinedGrantTemplateFactory.build(
            granting_institution_id=other_institution.id,
        )
        session.add(template)
        await session.flush()
        template_id = template.id

    response = await test_client.delete(
        f"/granting-institutions/{sample_granting_institution.id}/predefined-templates/{template_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
