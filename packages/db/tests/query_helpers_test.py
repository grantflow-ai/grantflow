"""Tests for query helper functions that ensure consistent soft-delete filtering."""

from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from packages.db.src.query_helpers import (
    add_active_filter,
    select_active,
    select_active_by_id,
    update_active,
    update_active_by_id,
)
from packages.db.src.tables import Grant, GrantingInstitution


@pytest.fixture
async def sample_grants_with_deleted(
    async_session_maker: async_sessionmaker[Any],
) -> tuple[list[Grant], list[Grant]]:
    """Create sample grants, some of which are soft-deleted."""
    async with async_session_maker() as session:
        # Create granting institution first
        institution = GrantingInstitution(
            full_name="Test Institution",
            abbreviation="TI",
        )
        session.add(institution)
        await session.flush()

        # Create active grants
        active_grants = []
        for i in range(3):
            grant = Grant(
                granting_institution_id=institution.id,
                title=f"Active Grant {i}",
                description=f"Description for active grant {i}",
                release_date="2024-01-01",
                expired_date="2024-12-31",
                activity_code=f"R0{i}",
                organization="NIH",
                parent_organization="Department of Health",
                participating_orgs="Universities",
                document_number=f"PA-24-00{i}",
                document_type="Program Announcement",
                clinical_trials="Not Applicable",
                url=f"https://grants.nih.gov/grants/guide/pa-files/PA-24-00{i}",
                amount=f"${50000 + i * 10000} - ${100000 + i * 20000}",
                amount_min=50000 + i * 10000,
                amount_max=100000 + i * 20000,
                category="Research",
                eligibility="Universities",
            )
            session.add(grant)
            active_grants.append(grant)

        # Create soft-deleted grants
        deleted_grants = []
        for i in range(2):
            grant = Grant(
                granting_institution_id=institution.id,
                title=f"Deleted Grant {i}",
                description=f"Description for deleted grant {i}",
                release_date="2024-01-01",
                expired_date="2024-12-31",
                activity_code=f"RD{i}",
                organization="NIH",
                parent_organization="Department of Health",
                participating_orgs="Universities",
                document_number=f"PA-24-DEL{i}",
                document_type="Program Announcement",
                clinical_trials="Not Applicable",
                url=f"https://grants.nih.gov/grants/guide/pa-files/PA-24-DEL{i}",
                amount=f"${30000 + i * 5000} - ${60000 + i * 10000}",
                amount_min=30000 + i * 5000,
                amount_max=60000 + i * 10000,
                category="Research",
                eligibility="Universities",
            )
            grant.soft_delete()  # Soft-delete this grant
            session.add(grant)
            deleted_grants.append(grant)

        await session.commit()

        for grant in active_grants + deleted_grants:
            await session.refresh(grant)

        return active_grants, deleted_grants


async def test_select_active_excludes_deleted(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that select_active only returns non-deleted records."""
    active_grants, deleted_grants = sample_grants_with_deleted

    async with async_session_maker() as session:
        # Using select_active should only return active grants
        result = await session.execute(select_active(Grant))
        grants = list(result.scalars())

        assert len(grants) == 3  # Only active grants

        active_ids = {grant.id for grant in active_grants}
        deleted_ids = {grant.id for grant in deleted_grants}
        result_ids = {grant.id for grant in grants}

        # Should contain all active grants
        assert result_ids == active_ids
        # Should not contain any deleted grants
        assert result_ids.isdisjoint(deleted_ids)


async def test_select_active_vs_regular_select(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that select_active returns fewer records than regular select."""
    _active_grants, _deleted_grants = sample_grants_with_deleted

    async with async_session_maker() as session:
        # Regular select should return all grants (including deleted)
        regular_result = await session.execute(select(Grant))
        all_grants = list(regular_result.scalars())

        # select_active should return only active grants
        active_result = await session.execute(select_active(Grant))
        active_only_grants = list(active_result.scalars())

        assert len(all_grants) == 5  # 3 active + 2 deleted
        assert len(active_only_grants) == 3  # Only active
        assert len(active_only_grants) < len(all_grants)


async def test_select_active_by_id_finds_active_record(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that select_active_by_id finds active records by ID."""
    active_grants, _deleted_grants = sample_grants_with_deleted
    target_grant = active_grants[0]

    async with async_session_maker() as session:
        result = await session.execute(select_active_by_id(Grant, target_grant.id))
        found_grant = result.scalar_one_or_none()

        assert found_grant is not None
        assert found_grant.id == target_grant.id
        assert found_grant.title == target_grant.title


async def test_select_active_by_id_excludes_deleted_record(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that select_active_by_id cannot find deleted records by ID."""
    _active_grants, deleted_grants = sample_grants_with_deleted
    deleted_grant = deleted_grants[0]

    async with async_session_maker() as session:
        result = await session.execute(select_active_by_id(Grant, deleted_grant.id))
        found_grant = result.scalar_one_or_none()

        assert found_grant is None


async def test_update_active_only_affects_active_records(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that update_active only updates non-deleted records."""
    active_grants, deleted_grants = sample_grants_with_deleted
    new_organization = "Updated NIH"

    async with async_session_maker() as session:
        # Update all grants with new organization using update_active
        await session.execute(
            update_active(Grant).where(Grant.category == "Research").values(organization=new_organization)
        )
        await session.commit()

        # Check that only active grants were updated
        for grant_id in [g.id for g in active_grants]:
            await session.refresh(await session.get(Grant, grant_id))
            grant = await session.get(Grant, grant_id)
            assert grant.organization == new_organization

        # Check that deleted grants were NOT updated
        for grant_id in [g.id for g in deleted_grants]:
            await session.refresh(await session.get(Grant, grant_id))
            grant = await session.get(Grant, grant_id)
            assert grant.organization == "NIH"  # Original value


async def test_update_active_by_id_updates_active_record(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that update_active_by_id updates active records by ID."""
    active_grants, _deleted_grants = sample_grants_with_deleted
    target_grant = active_grants[0]
    new_title = "Updated Active Grant Title"

    async with async_session_maker() as session:
        await session.execute(update_active_by_id(Grant, target_grant.id).values(title=new_title))
        await session.commit()

        # Get the updated grant from the database
        updated_grant = await session.scalar(select_active_by_id(Grant, target_grant.id))
        assert updated_grant is not None
        assert updated_grant.title == new_title


async def test_update_active_by_id_ignores_deleted_record(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that update_active_by_id does not update deleted records."""
    _active_grants, deleted_grants = sample_grants_with_deleted
    deleted_grant = deleted_grants[0]
    original_title = deleted_grant.title
    new_title = "This Should Not Update"

    async with async_session_maker() as session:
        result = await session.execute(update_active_by_id(Grant, deleted_grant.id).values(title=new_title))
        rows_updated = result.rowcount
        await session.commit()

        # Should not update any rows
        assert rows_updated == 0

        # Get the grant from the database to verify it was not updated
        unchanged_grant = await session.scalar(select(Grant).where(Grant.id == deleted_grant.id))
        assert unchanged_grant is not None
        assert unchanged_grant.title == original_title  # Unchanged


async def test_add_active_filter_multiple_models(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that add_active_filter correctly filters multiple joined models."""
    active_grants, _deleted_grants = sample_grants_with_deleted

    async with async_session_maker() as session:
        # Create a query joining grants with their institutions
        base_query = select(Grant).join(GrantingInstitution)

        # Add active filters for both models
        filtered_query = add_active_filter(base_query, Grant, GrantingInstitution)

        result = await session.execute(filtered_query)
        grants = list(result.scalars())

        # Should only return active grants
        assert len(grants) == 3
        result_ids = {grant.id for grant in grants}
        active_ids = {grant.id for grant in active_grants}
        assert result_ids == active_ids


async def test_query_helpers_with_string_ids(
    async_session_maker: async_sessionmaker[Any], sample_grants_with_deleted: tuple[list[Grant], list[Grant]]
) -> None:
    """Test that query helpers work with string IDs as well as UUID objects."""
    active_grants, _deleted_grants = sample_grants_with_deleted
    target_grant = active_grants[0]

    async with async_session_maker() as session:
        # Test with string ID
        result = await session.execute(select_active_by_id(Grant, str(target_grant.id)))
        found_grant = result.scalar_one_or_none()

        assert found_grant is not None
        assert found_grant.id == target_grant.id

    # Test update with string ID in a new session
    async with async_session_maker() as session:
        new_title = "Updated via String ID"
        result = await session.execute(update_active_by_id(Grant, str(target_grant.id)).values(title=new_title))
        await session.commit()

        # Verify the update worked
        assert result.rowcount == 1

    # Verify in another session
    async with async_session_maker() as session:
        updated_grant = await session.scalar(select_active_by_id(Grant, target_grant.id))
        assert updated_grant is not None
        assert updated_grant.title == new_title


async def test_query_helpers_with_nonexistent_id(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that query helpers handle non-existent IDs gracefully."""
    nonexistent_id = uuid4()

    async with async_session_maker() as session:
        # select_active_by_id should return None for non-existent ID
        result = await session.execute(select_active_by_id(Grant, nonexistent_id))
        found_grant = result.scalar_one_or_none()
        assert found_grant is None

        # update_active_by_id should update 0 rows for non-existent ID
        result = await session.execute(
            update_active_by_id(Grant, nonexistent_id).values(title="This Won't Update Anything")
        )
        assert result.rowcount == 0
