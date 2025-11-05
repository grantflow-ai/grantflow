from typing import Any

import pytest
from packages.db.src.tables import GrantingInstitution, GrantingInstitutionSource, RagFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.mark.e2e
async def test_granting_institution_source_records_exist(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        count = await session.scalar(select(func.count()).select_from(GrantingInstitutionSource))

        assert count > 0, "GrantingInstitutionSource records should exist"


@pytest.mark.e2e
async def test_nih_has_guideline_sources(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        nih = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Institutes of Health")
        )

        if not nih:
            pytest.skip("NIH institution not found in database")

        count = await session.scalar(
            select(func.count())
            .select_from(GrantingInstitutionSource)
            .where(GrantingInstitutionSource.granting_institution_id == nih.id)
        )

        assert count >= 7, f"NIH should have at least 7 guideline sources, found {count}"


@pytest.mark.e2e
async def test_nsf_has_guideline_sources(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        nsf = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Science Foundation")
        )

        if not nsf:
            pytest.skip("NSF institution not found in database")

        count = await session.scalar(
            select(func.count())
            .select_from(GrantingInstitutionSource)
            .where(GrantingInstitutionSource.granting_institution_id == nsf.id)
        )

        assert count >= 1, f"NSF should have at least 1 guideline source, found {count}"


@pytest.mark.e2e
async def test_erc_has_guideline_sources(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        erc = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "European Research Council")
        )

        if not erc:
            pytest.skip("ERC institution not found in database")

        count = await session.scalar(
            select(func.count())
            .select_from(GrantingInstitutionSource)
            .where(GrantingInstitutionSource.granting_institution_id == erc.id)
        )

        assert count >= 1, f"ERC should have at least 1 guideline source, found {count}"


@pytest.mark.e2e
async def test_nasa_has_guideline_sources(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        nasa = await session.scalar(
            select(GrantingInstitution).where(
                GrantingInstitution.full_name == "National Aeronautics and Space Administration"
            )
        )

        if not nasa:
            pytest.skip("NASA institution not found in database")

        count = await session.scalar(
            select(func.count())
            .select_from(GrantingInstitutionSource)
            .where(GrantingInstitutionSource.granting_institution_id == nasa.id)
        )

        assert count >= 1, f"NASA should have at least 1 guideline source, found {count}"


@pytest.mark.e2e
async def test_guideline_rag_files_have_correct_metadata(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        nih = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Institutes of Health")
        )

        if not nih:
            pytest.skip("NIH institution not found in database")

        result = await session.execute(
            select(RagFile)
            .join(GrantingInstitutionSource, RagFile.id == GrantingInstitutionSource.rag_source_id)
            .where(GrantingInstitutionSource.granting_institution_id == nih.id)
        )
        files = list(result.scalars())

        assert len(files) > 0, "NIH should have guideline files"

        for file in files:
            assert file.mime_type == "application/pdf", f"File {file.filename} should be PDF"
            assert file.size > 0, f"File {file.filename} should have non-zero size"
            assert "NIH" in file.filename, f"File {file.filename} should contain 'NIH' in name"
