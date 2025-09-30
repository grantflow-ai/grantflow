from typing import Any

from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantApplication, GrantApplicationSource, RagFile, RagSource
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.indexer.src.processing import process_source


async def test_metadata_with_entities_persisted_to_database(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    test_content = b"""
    Dr. Jane Smith from Stanford University published a groundbreaking study on glioblastoma treatment
    in 2023. The research, conducted at the Weizmann Institute of Science, focused on immunotherapy
    approaches for treating aggressive brain tumors. The study was funded by the National Institutes of
    Health and involved collaboration with researchers from Johns Hopkins University.
    """

    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": None,
                    "source_type": RAG_FILE,
                    "parent_id": None,
                    "document_metadata": None,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "test_document.txt",
                    "mime_type": "text/plain",
                    "size": len(test_content),
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/test_document.txt",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    _vectors, text_content, metadata = await process_source(
        content=test_content,
        source_id=str(source_id),
        filename="test_document.txt",
        mime_type="text/plain",
    )

    async with async_session_maker() as session, session.begin():
        result = await session.execute(select(RagSource).where(RagSource.id == source_id))
        rag_source = result.scalar_one()
        rag_source.document_metadata = metadata
        rag_source.indexing_status = SourceIndexingStatusEnum.FINISHED
        rag_source.text_content = text_content

    async with async_session_maker() as session:
        result = await session.execute(select(RagSource).where(RagSource.id == source_id))
        rag_source = result.scalar_one()

        assert rag_source.document_metadata is not None
        assert rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert rag_source.text_content == text_content

        assert "entities" in rag_source.document_metadata
        entities = rag_source.document_metadata["entities"]
        assert isinstance(entities, list)
        assert len(entities) > 0

        for entity in entities:
            assert "type" in entity
            assert "text" in entity
            assert isinstance(entity["type"], str)
            assert isinstance(entity["text"], str)

        entity_types = [e["type"] for e in entities]
        assert len(entity_types) > 0

        assert "keywords" in rag_source.document_metadata
        keywords = rag_source.document_metadata["keywords"]
        assert isinstance(keywords, list)
        assert len(keywords) > 0

        for keyword in keywords:
            assert "keyword" in keyword
            assert "score" in keyword
            assert isinstance(keyword["keyword"], str)
            assert isinstance(keyword["score"], (int, float))
            assert 0.0 <= keyword["score"] <= 1.0

        keyword_texts = [kw["keyword"] for kw in keywords]
        assert all(len(kw) > 0 for kw in keyword_texts)


async def test_metadata_gracefully_handles_no_entities(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    test_content = b"Test content."

    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": None,
                    "source_type": RAG_FILE,
                    "parent_id": None,
                    "document_metadata": None,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "minimal.txt",
                    "mime_type": "text/plain",
                    "size": len(test_content),
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/minimal.txt",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    _vectors, text_content, metadata = await process_source(
        content=test_content,
        source_id=str(source_id),
        filename="minimal.txt",
        mime_type="text/plain",
    )

    async with async_session_maker() as session, session.begin():
        result = await session.execute(select(RagSource).where(RagSource.id == source_id))
        rag_source = result.scalar_one()
        rag_source.document_metadata = metadata
        rag_source.indexing_status = SourceIndexingStatusEnum.FINISHED
        rag_source.text_content = text_content

    async with async_session_maker() as session:
        result = await session.execute(select(RagSource).where(RagSource.id == source_id))
        rag_source = result.scalar_one()

        assert rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert rag_source.document_metadata is not None
        assert "entities" in rag_source.document_metadata
        assert "keywords" in rag_source.document_metadata
        assert isinstance(rag_source.document_metadata["entities"], list)
        assert isinstance(rag_source.document_metadata["keywords"], list)


async def test_metadata_persists_across_database_reload(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    test_entities = [
        {"type": "PERSON", "text": "Dr. Alice Johnson"},
        {"type": "ORG", "text": "MIT"},
        {"type": "DATE", "text": "2024"},
    ]
    test_keywords = [
        {"keyword": "machine learning", "score": 0.85},
        {"keyword": "neural networks", "score": 0.72},
    ]

    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                    "text_content": "Test content",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                    "document_metadata": {
                        "entities": test_entities,
                        "keywords": test_keywords,
                        "other_field": "test",
                    },
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/test.txt",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    async with async_session_maker() as session:
        result = await session.execute(select(RagSource).where(RagSource.id == source_id))
        reloaded_source = result.scalar_one()

        assert reloaded_source.document_metadata is not None
        assert "entities" in reloaded_source.document_metadata
        assert "keywords" in reloaded_source.document_metadata
        assert "other_field" in reloaded_source.document_metadata

        assert reloaded_source.document_metadata["entities"] == test_entities

        assert reloaded_source.document_metadata["keywords"] == test_keywords

        assert reloaded_source.document_metadata["other_field"] == "test"
