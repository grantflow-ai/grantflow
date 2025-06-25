from datetime import date
from typing import Any

from packages.db.src.tables import GrantTemplate
from packages.db.src.utils import retrieve_application
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import GrantTemplateSourceFactory, RagFileFactory, TextVectorFactory


async def create_rag_sources_from_cfp_file(
    cfp_file_name: str,
    grant_template_id: str,
    session_maker: async_sessionmaker[Any],
    grant_application_id: str,
) -> list[str]:
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
            "grant_application_id": grant_application_id,
        }

        application = await retrieve_application(application_id=grant_application_id, session=session)
        if application.grant_template and application.grant_template.funding_organization_id:
            template_values["funding_organization_id"] = application.grant_template.funding_organization_id

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
