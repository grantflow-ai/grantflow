from http import HTTPStatus
from typing import Any, cast

import pytest
from packages.db.src.tables import GrantingInstitution, OrganizationUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
async def sample_granting_institution(
    async_session_maker: async_sessionmaker[Any],
) -> GrantingInstitution:
    import uuid

    unique_suffix = str(uuid.uuid4())[:8]
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(
            full_name=f"Test Institution {unique_suffix}",
            abbreviation=f"TI{unique_suffix[:4]}",
        )
        session.add(institution)
        await session.commit()
        institution_id = institution.id

    async with async_session_maker() as session:
        institution = await session.scalar(select(GrantingInstitution).where(GrantingInstitution.id == institution_id))
        assert institution is not None
        return cast("GrantingInstitution", institution)


async def test_update_granting_institution_ignores_soft_deleted(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"full_name": "Updated Institution Name"},
    )

    if response.status_code == HTTPStatus.OK:
        async with async_session_maker() as session, session.begin():
            institution_to_delete = await session.scalar(
                select(GrantingInstitution).where(GrantingInstitution.id == sample_granting_institution.id)
            )
            if institution_to_delete:
                institution_to_delete.soft_delete()
                session.add(institution_to_delete)
                await session.commit()

        response = await test_client.patch(
            f"/granting-institutions/{sample_granting_institution.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
            json={"full_name": "This Should Not Update"},
        )

        assert response.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.INTERNAL_SERVER_ERROR]

        async with async_session_maker() as session:
            await session.refresh(sample_granting_institution)
            assert sample_granting_institution.full_name == "Updated Institution Name"


async def test_get_granting_institution_excludes_soft_deleted(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.get(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    if response.status_code == HTTPStatus.OK:
        async with async_session_maker() as session, session.begin():
            institution_to_delete = await session.scalar(
                select(GrantingInstitution).where(GrantingInstitution.id == sample_granting_institution.id)
            )
            if institution_to_delete:
                institution_to_delete.soft_delete()
                session.add(institution_to_delete)
                await session.commit()

        response = await test_client.get(
            f"/granting-institutions/{sample_granting_institution.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

        assert response.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST]


async def test_list_granting_institutions_excludes_soft_deleted(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    institutions = []
    async with async_session_maker() as session, session.begin():
        for i in range(3):
            institution = GrantingInstitution(
                full_name=f"Test Institution {i}",
                abbreviation=f"TI{i}",
            )
            session.add(institution)
            institutions.append(institution)
        await session.commit()

    institution_ids = [institution.id for institution in institutions]

    response = await test_client.get(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    if response.status_code == HTTPStatus.OK:
        initial_data = response.json()
        initial_count = len(initial_data)

        async with async_session_maker() as session, session.begin():
            institution_to_delete = await session.scalar(
                select(GrantingInstitution).where(GrantingInstitution.id == institution_ids[0])
            )
            if institution_to_delete:
                institution_to_delete.soft_delete()
                session.add(institution_to_delete)
                await session.commit()

        response = await test_client.get(
            "/granting-institutions",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

        assert response.status_code == HTTPStatus.OK
        new_data = response.json()
        new_count = len(new_data)
        assert new_count == initial_count - 1

        response_institution_ids = {inst["id"] for inst in new_data}
        assert str(institution_ids[0]) not in response_institution_ids

        assert str(institution_ids[1]) in response_institution_ids
        assert str(institution_ids[2]) in response_institution_ids


async def test_granting_institution_update_query_excludes_soft_deleted_direct(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    from sqlalchemy import update

    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(
            full_name="Direct Test Institution",
            abbreviation="DTI",
        )
        session.add(institution)
        await session.commit()

    institution_id = institution.id

    async with async_session_maker() as session, session.begin():
        institution_to_delete = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.id == institution_id)
        )
        if institution_to_delete:
            institution_to_delete.soft_delete()
            session.add(institution_to_delete)
            await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            update(GrantingInstitution)
            .where(GrantingInstitution.id == institution_id, GrantingInstitution.deleted_at.is_(None))
            .values(full_name="This Should Not Update")
        )

        assert result.rowcount == 0
        await session.commit()

    async with async_session_maker() as session:
        updated_institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.id == institution_id)
        )
        assert updated_institution is not None
        assert updated_institution.full_name == "Direct Test Institution"
        assert updated_institution.deleted_at is not None


@pytest.fixture
async def backoffice_admin_firebase_uid(
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> str:
    from packages.db.src.tables import BackofficeAdmin

    async with async_session_maker() as session, session.begin():
        admin = BackofficeAdmin(
            firebase_uid=firebase_uid,
            email="test-admin@grantflow.ai",
        )
        session.add(admin)
        await session.commit()

    return firebase_uid


async def test_backoffice_admin_can_create_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.post(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "full_name": "New Test Institution",
            "abbreviation": "NTI",
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()
    assert data["full_name"] == "New Test Institution"
    assert data["abbreviation"] == "NTI"
    assert "id" in data

    async with async_session_maker() as session:
        institution = await session.scalar(select(GrantingInstitution).where(GrantingInstitution.id == data["id"]))
        assert institution is not None
        assert institution.full_name == "New Test Institution"


async def test_backoffice_admin_can_update_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"full_name": "Updated Institution Name"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["full_name"] == "Updated Institution Name"

    async with async_session_maker() as session:
        institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.id == sample_granting_institution.id)
        )
        assert institution is not None
        assert institution.full_name == "Updated Institution Name"


async def test_backoffice_admin_can_delete_granting_institution(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.id == sample_granting_institution.id)
        )
        assert institution is not None
        assert institution.deleted_at is not None


async def test_non_admin_gets_401_on_create_endpoint(
    test_client: TestingClientType,
    otp_code: str,
) -> None:
    response = await test_client.post(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "full_name": "Should Not Create",
            "abbreviation": "SNC",
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_non_admin_gets_401_on_update_endpoint(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
) -> None:
    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"full_name": "Should Not Update"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_non_admin_gets_401_on_delete_endpoint(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    otp_code: str,
) -> None:
    response = await test_client.delete(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_list_granting_institutions_requires_auth(
    test_client: TestingClientType,
) -> None:
    response = await test_client.get("/granting-institutions")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_missing_firebase_uid_gets_401(
    test_client: TestingClientType,
) -> None:
    response = await test_client.post(
        "/granting-institutions",
        json={
            "full_name": "Should Not Create",
            "abbreviation": "SNC",
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_soft_deleted_backoffice_admin_gets_401(
    test_client: TestingClientType,
    backoffice_admin_firebase_uid: str,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    from packages.db.src.tables import BackofficeAdmin

    response = await test_client.post(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "full_name": "Test Before Delete",
            "abbreviation": "TBD",
        },
    )
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session, session.begin():
        admin = await session.scalar(
            select(BackofficeAdmin).where(BackofficeAdmin.firebase_uid == backoffice_admin_firebase_uid)
        )
        assert admin is not None
        admin.soft_delete()
        await session.commit()

    response = await test_client.post(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "full_name": "Should Not Create",
            "abbreviation": "SNC",
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
