from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from packages.shared_utils.src.gcs import resolve_parent_id_for_notification


@pytest.mark.asyncio
async def test_resolve_parent_id_granting_institution() -> None:
    """Test that granting institution entity_id is returned as parent_id."""
    session = AsyncMock(spec=AsyncSession)
    source_id = uuid4()
    entity_id = uuid4()

    result = await resolve_parent_id_for_notification(
        session=session,
        source_id=source_id,
        entity_type="granting_institution",
        entity_id=entity_id,
    )

    assert result == str(entity_id)
    session.scalar.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_parent_id_grant_application() -> None:
    """Test that grant application ID is resolved for organization sources."""
    session = AsyncMock(spec=AsyncSession)
    source_id = uuid4()
    entity_id = uuid4()
    grant_app_id = uuid4()

    
    session.scalar.side_effect = [grant_app_id, None]

    result = await resolve_parent_id_for_notification(
        session=session,
        source_id=source_id,
        entity_type="organization",
        entity_id=entity_id,
    )

    assert result == str(grant_app_id)
    assert session.scalar.call_count == 1


@pytest.mark.asyncio
async def test_resolve_parent_id_grant_template() -> None:
    """Test that grant template ID is resolved for organization sources."""
    session = AsyncMock(spec=AsyncSession)
    source_id = uuid4()
    entity_id = uuid4()
    grant_template_id = uuid4()

    
    session.scalar.side_effect = [None, grant_template_id]

    result = await resolve_parent_id_for_notification(
        session=session,
        source_id=source_id,
        entity_type="organization",
        entity_id=entity_id,
    )

    assert result == str(grant_template_id)
    assert session.scalar.call_count == 2


@pytest.mark.asyncio
async def test_resolve_parent_id_fallback_to_entity_id() -> None:
    """Test that entity_id is used as fallback when no associations found."""
    session = AsyncMock(spec=AsyncSession)
    source_id = uuid4()
    entity_id = uuid4()

    
    session.scalar.side_effect = [None, None]

    result = await resolve_parent_id_for_notification(
        session=session,
        source_id=source_id,
        entity_type="organization",
        entity_id=entity_id,
    )

    assert result == str(entity_id)
    assert session.scalar.call_count == 2


@pytest.mark.asyncio
async def test_resolve_parent_id_with_string_uuids() -> None:
    """Test that function works with string UUIDs as input."""
    session = AsyncMock(spec=AsyncSession)
    source_id = str(uuid4())
    entity_id = str(uuid4())
    grant_app_id = uuid4()

    session.scalar.side_effect = [grant_app_id, None]

    result = await resolve_parent_id_for_notification(
        session=session,
        source_id=source_id,
        entity_type="organization",
        entity_id=entity_id,
    )

    assert result == str(grant_app_id)
