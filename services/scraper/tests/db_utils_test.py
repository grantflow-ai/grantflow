from typing import Any
from uuid import UUID

import pytest
from packages.db.src.tables import Grant, GrantingInstitution
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.url_utils import normalize_url
from services.scraper.src.db_utils import (
    batch_save_grants,
    bulk_insert_grants,
    get_existing_grant_identifiers,
    get_nih_institution_id,
    save_grant_page_content,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


async def test_get_nih_institution_id_success(
    async_session_maker: async_sessionmaker[Any], nih_granting_institution: GrantingInstitution
) -> None:
    result = await get_nih_institution_id()

    assert result == nih_granting_institution.id
    assert isinstance(result, UUID)


async def test_get_nih_institution_id_not_found(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Institutes of Health")
        )
        institutions = result.scalars().all()
        for inst in institutions:
            await session.delete(inst)
        await session.commit()

    with pytest.raises(DatabaseError, match="NIH granting institution not found"):
        await get_nih_institution_id()


async def test_get_existing_grant_identifiers(
    async_session_maker: async_sessionmaker[Any], sample_grants: list[Grant]
) -> None:
    result = await get_existing_grant_identifiers()

    expected_identifiers = {grant.document_number for grant in sample_grants}
    assert result == expected_identifiers
    assert isinstance(result, set)


async def test_batch_save_grants_success(
    async_session_maker: async_sessionmaker[Any], nih_granting_institution: GrantingInstitution
) -> None:
    sample_grant = {
        "title": "Test Grant New",
        "description": "Test grant description",
        "release_date": "2024-01-01",
        "expired_date": "2025-01-01",
        "activity_code": "R01",
        "organization": "Test Org",
        "parent_organization": "Parent Org",
        "participating_orgs": "Participating Orgs",
        "document_number": "TEST-NEW-001",
        "document_type": "Notice",
        "clinical_trials": "Yes",
        "url": "https://grants.nih.gov/test-new",
        "amount": "$100,000",
        "amount_min": 50000,
        "amount_max": 150000,
        "category": "Research",
        "eligibility": "Universities",
    }

    grants = [sample_grant]
    result = await batch_save_grants(grants)

    assert result == 1

    async with async_session_maker() as session:
        saved_grant = await session.scalar(select(Grant).where(Grant.document_number == "TEST-NEW-001"))
        assert saved_grant is not None
        assert saved_grant.title == "Test Grant New"
        assert saved_grant.granting_institution_id == nih_granting_institution.id


async def test_batch_save_grants_empty_list() -> None:
    result = await batch_save_grants([])
    assert result == 0


async def test_batch_save_grants_duplicate_handling(
    async_session_maker: async_sessionmaker[Any], sample_grants: list[Grant]
) -> None:
    duplicate_grant = {
        "title": "Duplicate Grant Title",
        "description": "Duplicate description",
        "release_date": "2024-01-01",
        "expired_date": "2025-01-01",
        "activity_code": "R01",
        "organization": "Test Org",
        "parent_organization": "Parent Org",
        "participating_orgs": "Participating Orgs",
        "document_number": sample_grants[0].document_number,
        "document_type": "Notice",
        "clinical_trials": "Yes",
        "url": "https://grants.nih.gov/duplicate",
    }

    result = await batch_save_grants([duplicate_grant])

    assert result == 0


async def test_bulk_insert_grants(
    async_session_maker: async_sessionmaker[Any], nih_granting_institution: GrantingInstitution
) -> None:
    grants_data = [
        {
            "title": "Bulk Test Grant 1",
            "description": "Description 1",
            "release_date": "2024-01-01",
            "expired_date": "2025-01-01",
            "activity_code": "R01",
            "organization": "Test Org 1",
            "parent_organization": "Parent Org 1",
            "participating_orgs": "Participating Orgs 1",
            "document_number": "BULK-001",
            "document_type": "Notice",
            "clinical_trials": "Yes",
            "url": "https://grants.nih.gov/bulk-001",
        },
        {
            "title": "Bulk Test Grant 2",
            "description": "Description 2",
            "release_date": "2024-02-01",
            "expired_date": "2025-02-01",
            "activity_code": "R21",
            "organization": "Test Org 2",
            "parent_organization": "Parent Org 2",
            "participating_orgs": "Participating Orgs 2",
            "document_number": "BULK-002",
            "document_type": "RFA",
            "clinical_trials": "No",
            "url": "https://grants.nih.gov/bulk-002",
        },
    ]

    result = await bulk_insert_grants(grants_data, nih_granting_institution.id)

    assert result == 2

    async with async_session_maker() as session:
        saved_grants = await session.execute(select(Grant).where(Grant.document_number.in_(["BULK-001", "BULK-002"])))
        grants_list = saved_grants.scalars().all()
        assert len(grants_list) == 2
        assert all(grant.granting_institution_id == nih_granting_institution.id for grant in grants_list)


async def test_save_grant_page_content(async_session_maker: async_sessionmaker[Any]) -> None:
    url = "https://grants.gov/search-results-detail/123456"
    document_number = "PAR-24-001"
    content = "# Test Grant Page\n\nThis is the content of a test grant page."

    # First create a grant with this document_number so the update doesn't fail
    from packages.db.src.tables import Grant

    async with async_session_maker() as session, session.begin():
        nih_id = await get_nih_institution_id()
        grant = Grant(
            granting_institution_id=nih_id,
            document_number=document_number,
            title="Test Grant",
            description="",
            release_date="2024-01-01",
            expired_date="2025-12-31",
            activity_code="R01",
            organization="Test Org",
            parent_organization="Test Parent",
            participating_orgs="Test Participants",
            document_type="Notice",
            clinical_trials="No",
            url=url,
        )
        session.add(grant)

    await save_grant_page_content(url=url, document_number=document_number, content=content)

    async with async_session_maker() as session:
        from packages.db.src.tables import Grant, RagUrl

        expected_url = normalize_url(url)
        rag_url = await session.scalar(select(RagUrl).where(RagUrl.url == expected_url))
        assert rag_url is not None
        assert rag_url.title == f"Grant: {document_number}"
        assert "This is the content" in rag_url.description
        # RagUrl inherits from RagSource, so text_content is on the same object
        assert rag_url.text_content == content

        # Check grant description was updated
        grant = await session.scalar(select(Grant).where(Grant.document_number == document_number))
        assert grant is not None
        assert "This is the content" in grant.description


async def test_save_grant_page_content_update_existing(async_session_maker: async_sessionmaker[Any]) -> None:
    url = "https://grants.gov/search-results-detail/654321"
    document_number = "RFA-25-002"
    initial_content = "# Initial Content\n\nThis is the initial content."
    updated_content = "# Updated Content\n\nThis is the updated content with more information."

    # Create a grant with this document_number
    from packages.db.src.tables import Grant

    async with async_session_maker() as session, session.begin():
        nih_id = await get_nih_institution_id()
        grant = Grant(
            granting_institution_id=nih_id,
            document_number=document_number,
            title="Test Grant Update",
            description="",
            release_date="2024-01-01",
            expired_date="2025-12-31",
            activity_code="R21",
            organization="Test Org",
            parent_organization="Test Parent",
            participating_orgs="Test Participants",
            document_type="RFA",
            clinical_trials="Yes",
            url=url,
        )
        session.add(grant)

    await save_grant_page_content(url=url, document_number=document_number, content=initial_content)

    await save_grant_page_content(url=url, document_number=document_number, content=updated_content)

    async with async_session_maker() as session:
        from packages.db.src.tables import RagUrl

        expected_url = normalize_url(url)
        rag_urls = await session.execute(select(RagUrl).where(RagUrl.url == expected_url))
        rag_url_list = rag_urls.scalars().all()
        assert len(rag_url_list) == 1
        rag_url = rag_url_list[0]
        assert "updated content" in rag_url.description
        # RagUrl inherits from RagSource, so text_content is on the same object
        assert rag_url.text_content == updated_content
