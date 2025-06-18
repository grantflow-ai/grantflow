from typing import Any

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import GrantTemplateSourceFactory, RagFileFactory, TextVectorFactory


async def create_rag_sources_from_cfp_file(
    cfp_file_name: str,
    grant_template_id: str,
    session_maker: async_sessionmaker[Any],
) -> list[str]:
    """
    Create RAG sources from a CFP file for testing purposes.

    Args:
        cfp_file_name: Name of the CFP file in the test fixtures
        grant_template_id: ID of the grant template to link sources to
        session_maker: Database session maker

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
