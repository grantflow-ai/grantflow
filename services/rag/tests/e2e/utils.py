from datetime import date
from typing import Any

from packages.db.src.tables import GrantTemplate
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import GrantTemplateSourceFactory, RagFileFactory, TextVectorFactory


async def create_rag_sources_from_cfp_file(
    cfp_file_name: str,
    grant_template_id: str,
    session_maker: async_sessionmaker[Any],
    grant_application_id: str | None = None,
) -> list[str]:
    """
    Create RAG sources from a CFP file for testing purposes.

    Args:
        cfp_file_name: Name of the CFP file in the test fixtures
        grant_template_id: ID of the grant template to link sources to
        session_maker: Database session maker
        grant_application_id: Optional grant application ID to use

    Returns:
        List of created RAG source IDs
    """
    cfp_content = (FIXTURES_FOLDER / "cfps" / cfp_file_name).read_text()

    source = RagFileFactory.build(
        text_content=cfp_content,
        source_type="rag_file",
        mime_type="text/markdown",
    )

    chunk_size = 1000
    chunks = []
    for i in range(0, len(cfp_content), chunk_size):
        chunk_content = cfp_content[i : i + chunk_size]
        vector = TextVectorFactory.build(rag_source_id=source.id, chunk={"content": chunk_content})
        chunks.append(vector)

    async with session_maker() as session:

        template_values = {
            "id": grant_template_id,
            "grant_sections": [],
            "submission_date": date(2025, 12, 31),
            "funding_organization_id": "e8e8b0df-d6d9-4a27-bb1a-7b8e5a5b8c8e",
        }


        if grant_application_id:
            template_values["grant_application_id"] = grant_application_id

        await session.execute(
            insert(GrantTemplate).values(template_values).on_conflict_do_nothing(index_elements=["id"])
        )

        session.add(source)
        session.add_all(chunks)
        await session.commit()

        template_source = GrantTemplateSourceFactory.build(
            grant_template_id=grant_template_id,
            rag_source_id=source.id,
        )
        session.add(template_source)
        await session.commit()

    return [str(source.id)]
