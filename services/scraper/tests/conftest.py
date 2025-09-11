import logging
import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from dotenv import load_dotenv
from litestar.testing import AsyncTestClient
from packages.db.src.tables import Grant, GrantingInstitution
from services.scraper.src.main import app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import GrantingInstitutionFactory

load_dotenv()

pytest_plugins = [
    "testing.base_test_plugin",
    "testing.db_test_plugin",
]

logging.basicConfig(level=logging.DEBUG)


def pytest_sessionstart(session: pytest.Session) -> None:
    if os.getenv("E2E_TESTS") == "1":
        os.environ.update(
            {
                "ENVIRONMENT": "test",
                "DISCORD_WEBHOOK_URL": "",
            }
        )


@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncTestClient[Any]]:
    os.environ.setdefault("ENVIRONMENT", "test")

    app.debug = True

    async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
        yield client


@pytest.fixture
async def nih_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    async with async_session_maker() as session:
        existing_nih = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Institutes of Health")
        )

        if existing_nih:
            return existing_nih  # type: ignore[no-any-return]

        nih_institution = GrantingInstitutionFactory.build(
            full_name="National Institutes of Health", abbreviation="NIH"
        )

        session.add(nih_institution)
        await session.commit()
        await session.refresh(nih_institution)
        return nih_institution


@pytest.fixture
async def sample_grants(
    async_session_maker: async_sessionmaker[Any], nih_granting_institution: GrantingInstitution
) -> list[Grant]:
    grants_data = [
        {
            "granting_institution_id": nih_granting_institution.id,
            "title": "Test Grant 1",
            "description": "Description for test grant 1",
            "release_date": "2024-01-01",
            "expired_date": "2025-01-01",
            "activity_code": "R01",
            "organization": "Test Organization 1",
            "parent_organization": "Parent Org 1",
            "participating_orgs": "Participating Orgs 1",
            "document_number": "TEST-001",
            "document_type": "Notice",
            "clinical_trials": "Yes",
            "url": "https://grants.nih.gov/test-001",
            "amount": "$100,000",
            "amount_min": 50000,
            "amount_max": 150000,
            "category": "Research",
            "eligibility": "Universities",
        },
        {
            "granting_institution_id": nih_granting_institution.id,
            "title": "Test Grant 2",
            "description": "Description for test grant 2",
            "release_date": "2024-02-01",
            "expired_date": "2025-02-01",
            "activity_code": "R21",
            "organization": "Test Organization 2",
            "parent_organization": "Parent Org 2",
            "participating_orgs": "Participating Orgs 2",
            "document_number": "TEST-002",
            "document_type": "RFA",
            "clinical_trials": "No",
            "url": "https://grants.nih.gov/test-002",
            "amount": "$250,000",
            "amount_min": 200000,
            "amount_max": 300000,
            "category": "Clinical",
            "eligibility": "Medical Centers",
        },
    ]

    async with async_session_maker() as session:
        grants = []
        for grant_data in grants_data:
            grant = Grant(**grant_data)
            session.add(grant)
            grants.append(grant)
        await session.commit()

        for grant in grants:
            await session.refresh(grant)

        return grants
