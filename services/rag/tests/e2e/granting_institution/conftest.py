from typing import Any

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantingInstitution, GrantingInstitutionSource, RagSource, TextVector
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import RagFileFactory


@pytest.fixture
async def nih_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    async with async_session_maker() as session:
        institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "National Institutes of Health")
        )
        if not institution:
            pytest.skip("NIH institution not found in database")
        return institution


@pytest.fixture
async def erc_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    async with async_session_maker() as session:
        institution = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == "European Research Council")
        )
        if not institution:
            pytest.skip("ERC institution not found in database")
        return institution


@pytest.fixture
async def nih_indexed_guideline(
    async_session_maker: async_sessionmaker[Any],
    nih_granting_institution: GrantingInstitution,
) -> RagSource:
    guideline_file = (
        FIXTURES_FOLDER / "organization_files" / "nih" / "files" / "NIH- Instructions for Research (R).json"
    )

    guideline_data = deserialize(guideline_file.read_bytes(), dict)
    rag_file_data = guideline_data["rag_file"]

    async with async_session_maker() as session, session.begin():
        rag_source = RagFileFactory.build(
            text_content=rag_file_data["text_content"],
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=rag_file_data["filename"],
            mime_type=rag_file_data["mime_type"],
        )
        session.add(rag_source)
        await session.flush()

        granting_institution_source = GrantingInstitutionSource(
            rag_source_id=rag_source.id,
            granting_institution_id=nih_granting_institution.id,
        )
        session.add(granting_institution_source)
        await session.flush()

        text_vectors = []
        for vector_data in rag_file_data["text_vectors"]:
            text_vector = TextVector(
                rag_source_id=rag_source.id,
                chunk=vector_data["chunk"],
                embedding=vector_data["embedding"],
            )
            text_vectors.append(text_vector)

        session.add_all(text_vectors)
        await session.flush()
        await session.refresh(rag_source)

        return rag_source


@pytest.fixture
async def erc_indexed_guideline(
    async_session_maker: async_sessionmaker[Any],
    erc_granting_institution: GrantingInstitution,
) -> RagSource:
    guideline_file = (
        FIXTURES_FOLDER / "organization_files" / "erc" / "files" / "ERC- Information for Applicants PoC.json"
    )

    guideline_data = deserialize(guideline_file.read_bytes(), dict)
    rag_file_data = guideline_data["rag_file"]

    async with async_session_maker() as session, session.begin():
        rag_source = RagFileFactory.build(
            text_content=rag_file_data["text_content"],
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=rag_file_data["filename"],
            mime_type=rag_file_data["mime_type"],
        )
        session.add(rag_source)
        await session.flush()

        granting_institution_source = GrantingInstitutionSource(
            rag_source_id=rag_source.id,
            granting_institution_id=erc_granting_institution.id,
        )
        session.add(granting_institution_source)
        await session.flush()

        text_vectors = []
        for vector_data in rag_file_data["text_vectors"]:
            text_vector = TextVector(
                rag_source_id=rag_source.id,
                chunk=vector_data["chunk"],
                embedding=vector_data["embedding"],
            )
            text_vectors.append(text_vector)

        session.add_all(text_vectors)
        await session.flush()
        await session.refresh(rag_source)

        return rag_source
