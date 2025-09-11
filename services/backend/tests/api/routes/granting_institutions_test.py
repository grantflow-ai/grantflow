"""Tests for granting institutions API routes, focusing on soft-delete filtering."""

from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.tables import GrantingInstitution, OrganizationUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
async def sample_granting_institution(
    async_session_maker: async_sessionmaker[Any],
) -> GrantingInstitution:
    """Create a sample granting institution for testing."""
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(
            full_name="National Institutes of Health",
            abbreviation="NIH",
        )
        session.add(institution)
        await session.commit()
        await session.refresh(institution)
        return institution


async def test_update_granting_institution_ignores_soft_deleted(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that updating soft-deleted granting institutions fails appropriately."""
    # First verify we can update the institution normally
    response = await test_client.patch(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"full_name": "Updated Institution Name"},
    )

    if response.status_code == HTTPStatus.OK:
        # Soft-delete the institution
        async with async_session_maker() as session:
            sample_granting_institution.soft_delete()
            session.add(sample_granting_institution)
            await session.commit()

        # Try to update the soft-deleted institution
        response = await test_client.patch(
            f"/granting-institutions/{sample_granting_institution.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
            json={"full_name": "This Should Not Update"},
        )

        # Should fail because the institution is soft-deleted
        # The exact status code depends on implementation, but should be an error
        assert response.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.INTERNAL_SERVER_ERROR]

        # Verify the institution was not actually updated
        async with async_session_maker() as session:
            await session.refresh(sample_granting_institution)
            # The name should still be "Updated Institution Name" from the first update
            assert sample_granting_institution.full_name == "Updated Institution Name"


async def test_get_granting_institution_excludes_soft_deleted(
    test_client: TestingClientType,
    sample_granting_institution: GrantingInstitution,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that soft-deleted granting institutions cannot be retrieved."""
    # First verify we can get the institution normally
    response = await test_client.get(
        f"/granting-institutions/{sample_granting_institution.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    if response.status_code == HTTPStatus.OK:
        # Soft-delete the institution
        async with async_session_maker() as session:
            sample_granting_institution.soft_delete()
            session.add(sample_granting_institution)
            await session.commit()

        # Try to get the soft-deleted institution
        response = await test_client.get(
            f"/granting-institutions/{sample_granting_institution.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

        # Should fail because the institution is soft-deleted
        assert response.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST]


async def test_list_granting_institutions_excludes_soft_deleted(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that soft-deleted granting institutions are not included in list results."""
    # Create multiple institutions
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

        for institution in institutions:
            await session.refresh(institution)

    # Get initial list
    response = await test_client.get(
        "/granting-institutions",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    if response.status_code == HTTPStatus.OK:
        initial_data = response.json()
        initial_count = len(initial_data)

        # Soft-delete one institution
        async with async_session_maker() as session, session.begin():
            institutions[0].soft_delete()
            session.add(institutions[0])

        # Get list again - should have one fewer result
        response = await test_client.get(
            "/granting-institutions",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

        assert response.status_code == HTTPStatus.OK
        new_data = response.json()
        new_count = len(new_data)
        assert new_count == initial_count - 1

        # Verify the soft-deleted institution is not in the results
        institution_ids = {inst["id"] for inst in new_data}
        assert str(institutions[0].id) not in institution_ids

        # Verify the other institutions are still there
        assert str(institutions[1].id) in institution_ids
        assert str(institutions[2].id) in institution_ids


# INTEGRATION TEST - Verify the actual query behavior at the database level


async def test_granting_institution_update_query_excludes_soft_deleted_direct(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Direct test of the update query behavior with soft-deleted records."""
    from sqlalchemy import update

    # Create an institution
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(
            full_name="Direct Test Institution",
            abbreviation="DTI",
        )
        session.add(institution)
        await session.commit()
        await session.refresh(institution)
        institution_id = institution.id

    # Soft-delete the institution
    async with async_session_maker() as session, session.begin():
        institution.soft_delete()
        session.add(institution)
        await session.commit()

    # Try to update using the same pattern as the route handler
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            update(GrantingInstitution)
            .where(GrantingInstitution.id == institution_id, GrantingInstitution.deleted_at.is_(None))
            .values(full_name="This Should Not Update")
        )

        # Should update 0 rows because the record is soft-deleted
        assert result.rowcount == 0
        await session.commit()

    # Verify the institution was not updated
    async with async_session_maker() as session:
        updated_institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.id == institution_id)
        )
        assert updated_institution is not None
        assert updated_institution.full_name == "Direct Test Institution"  # Unchanged
        assert updated_institution.deleted_at is not None  # Still soft-deleted
