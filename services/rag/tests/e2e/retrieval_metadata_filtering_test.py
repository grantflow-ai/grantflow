import logging
from typing import Any
from uuid import UUID

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.json_objects import Chunk
from packages.db.src.tables import GrantApplication, GrantApplicationSource, RagUrl, TextVector
from packages.shared_utils.src.embeddings import generate_embeddings
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.kreuzberg_fixtures import extract_with_cache

from services.rag.src.utils.retrieval import MetadataFilterParams, retrieve_vectors_for_embedding


@pytest.fixture
async def nih_research_paper_source(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> RagUrl:
    paper_content = b"""
    Melanoma Brain Metastases: Current Understanding and Novel Therapeutic Approaches

    National Institutes of Health (NIH)
    Department of Oncology Research

    Abstract:
    Brain metastases (BMs) occur in approximately 50% of patients with metastatic melanoma,
    representing a significant clinical challenge. This review examines current understanding
    of melanoma brain metastases and emerging therapeutic strategies, including immunotherapy
    and targeted molecular approaches.

    Introduction:
    Melanoma is the most aggressive form of skin cancer, with increasing incidence worldwide.
    The development of brain metastases significantly worsens prognosis, with median survival
    of 4-6 months without treatment. Recent advances in immunotherapy have shown promise.

    Methods:
    We conducted a comprehensive review of clinical trials involving checkpoint inhibitors,
    CAR-T cell therapy, and combination approaches for melanoma brain metastases.
    Data from multiple institutions including Memorial Sloan Kettering Cancer Center and
    Mayo Clinic were analyzed.

    Results:
    Combination immunotherapy with anti-PD1 and anti-CTLA4 showed response rates of 55%
    in melanoma brain metastases. Novel CAR-T approaches targeting melanoma-associated
    antigens demonstrated feasibility in preclinical models.

    Discussion:
    The tumor microenvironment in brain metastases presents unique challenges due to
    immunosuppressive factors. Understanding of TREM2+ macrophages and their role in
    creating immunosuppressive niches is critical for developing next-generation therapies.

    Funding:
    This research was supported by the National Institutes of Health grant R01-CA123456
    and the National Cancer Institute.
    """

    content, _mime_type, chunks, metadata = await extract_with_cache(
        content=paper_content,
        mime_type="text/html",
        enable_chunking=True,
        enable_token_reduction=False,
        enable_entity_extraction=True,
        enable_keyword_extraction=True,
        enable_document_classification=True,
    )

    assert metadata is not None, "Kreuzberg metadata extraction failed"
    assert "entities" in metadata, "Entities not extracted"
    assert "keywords" in metadata, "Keywords not extracted"

    async with async_session_maker() as session:
        source = RagUrl(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            url="https://pubmed.ncbi.nlm.nih.gov/test-paper",
            text_content=content,
            document_metadata=metadata,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(source)
        await session.flush()

        app_source = GrantApplicationSource(
            rag_source_id=source.id,
            grant_application_id=grant_application.id,
        )
        session.add(app_source)
        await session.flush()

        if chunks:
            embeddings = await generate_embeddings(chunks[:5])
            for chunk_content, embedding in zip(chunks[:5], embeddings, strict=False):
                vector = TextVector(
                    rag_source_id=source.id,
                    chunk=Chunk(content=chunk_content),
                    embedding=embedding,
                )
                session.add(vector)

        await session.commit()
        await session.refresh(source)
        return source


@pytest.fixture
async def generic_cancer_research_source(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> RagUrl:
    paper_content = b"""
    Advances in Cancer Immunotherapy: A Comprehensive Review

    Abstract:
    Cancer immunotherapy has revolutionized oncology treatment. This review examines
    mechanisms of immune checkpoint inhibition and emerging combination strategies.

    Introduction:
    The immune system plays a critical role in cancer surveillance and elimination.
    Recent developments in understanding tumor-immune interactions have led to
    breakthrough therapies.

    Methods:
    We analyzed clinical trial data from multiple studies examining PD-1 and CTLA-4
    inhibitors across various cancer types. Meta-analysis included over 10,000 patients.

    Results:
    Checkpoint inhibitors demonstrated durable responses in approximately 20-40% of patients
    across multiple tumor types. Combination approaches showed enhanced efficacy.

    Discussion:
    Understanding biomarkers for response prediction remains a key challenge. Tumor
    microenvironment composition and PD-L1 expression are important factors.
    """

    content, _mime_type, chunks, metadata = await extract_with_cache(
        content=paper_content,
        mime_type="text/html",
        enable_chunking=True,
        enable_token_reduction=False,
        enable_entity_extraction=True,
        enable_keyword_extraction=True,
        enable_document_classification=True,
    )

    assert metadata is not None, "Kreuzberg metadata extraction failed"

    async with async_session_maker() as session:
        source = RagUrl(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            url="https://example.com/generic-cancer-review",
            text_content=content,
            document_metadata=metadata,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(source)
        await session.flush()

        app_source = GrantApplicationSource(
            rag_source_id=source.id,
            grant_application_id=grant_application.id,
        )
        session.add(app_source)
        await session.flush()

        if chunks:
            embeddings = await generate_embeddings(chunks[:5])
            for chunk_content, embedding in zip(chunks[:5], embeddings, strict=False):
                vector = TextVector(
                    rag_source_id=source.id,
                    chunk=Chunk(content=chunk_content),
                    embedding=embedding,
                )
                session.add(vector)

        await session.commit()
        await session.refresh(source)
        return source


@pytest.mark.e2e
async def test_retrieval_without_metadata_filter(
    nih_research_paper_source: RagUrl,
    generic_cancer_research_source: RagUrl,
    grant_application: GrantApplication,
    logger: logging.Logger,
) -> None:
    search_queries = ["melanoma immunotherapy brain metastases treatment"]
    embeddings = await generate_embeddings(search_queries)

    vectors = await retrieve_vectors_for_embedding(
        file_table_cls=GrantApplicationSource,
        application_id=str(grant_application.id),
        embeddings=embeddings,
        search_queries=search_queries,
        trace_id="test-no-filter",
        limit=10,
    )

    logger.info("Retrieved %d vectors without metadata filter", len(vectors))

    assert len(vectors) > 0, "Should retrieve at least some vectors"

    source_ids = {v.rag_source_id for v in vectors}
    logger.info("Source IDs retrieved: %s", source_ids)


@pytest.mark.e2e
async def test_retrieval_with_organization_entity_filter(
    nih_research_paper_source: RagUrl,
    generic_cancer_research_source: RagUrl,
    grant_application: GrantApplication,
    logger: logging.Logger,
) -> None:
    search_queries = ["melanoma immunotherapy NIH research"]
    embeddings = await generate_embeddings(search_queries)

    metadata_filter: MetadataFilterParams = {
        "entity_types": ["ORGANIZATION"],
    }

    vectors = await retrieve_vectors_for_embedding(
        file_table_cls=GrantApplicationSource,
        application_id=str(grant_application.id),
        embeddings=embeddings,
        search_queries=search_queries,
        metadata_filter=metadata_filter,
        trace_id="test-org-filter",
        limit=10,
    )

    logger.info("Retrieved %d vectors with ORGANIZATION filter", len(vectors))

    assert len(vectors) > 0, "Should retrieve vectors from documents with organization entities"

    source_ids = {v.rag_source_id for v in vectors}
    logger.info("Source IDs with ORGANIZATION filter: %s", source_ids)

    for vector in vectors[:3]:
        metadata = vector.rag_source.document_metadata
        if metadata is not None and "entities" in metadata:
            entities = metadata.get("entities")
            if isinstance(entities, list):
                org_entities = [e for e in entities if isinstance(e, dict) and e.get("type") == "ORGANIZATION"]
                logger.info("Organizations found: %s", [e.get("text") for e in org_entities])


@pytest.mark.e2e
async def test_retrieval_with_category_filter(
    nih_research_paper_source: RagUrl,
    generic_cancer_research_source: RagUrl,
    grant_application: GrantApplication,
    logger: logging.Logger,
) -> None:
    search_queries = ["cancer research methodology clinical trials"]
    embeddings = await generate_embeddings(search_queries)

    metadata_filter: MetadataFilterParams = {
        "categories": ["research", "scientific"],
        "category_match_mode": "any",
    }

    vectors = await retrieve_vectors_for_embedding(
        file_table_cls=GrantApplicationSource,
        application_id=str(grant_application.id),
        embeddings=embeddings,
        search_queries=search_queries,
        metadata_filter=metadata_filter,
        trace_id="test-category-filter",
        limit=10,
    )

    logger.info("Retrieved %d vectors with category filter", len(vectors))
    assert len(vectors) > 0, "Should retrieve vectors from research/scientific documents"

    for vector in vectors[:3]:
        metadata = vector.rag_source.document_metadata
        if metadata and "categories" in metadata:
            categories = metadata["categories"]
            logger.info("Categories found: %s", categories)


@pytest.mark.e2e
async def test_retrieval_with_quality_score_filter(
    nih_research_paper_source: RagUrl,
    generic_cancer_research_source: RagUrl,
    grant_application: GrantApplication,
    logger: logging.Logger,
) -> None:
    search_queries = ["melanoma treatment research"]
    embeddings = await generate_embeddings(search_queries)

    metadata_filter: MetadataFilterParams = {
        "min_quality_score": 0.7,
    }

    vectors = await retrieve_vectors_for_embedding(
        file_table_cls=GrantApplicationSource,
        application_id=str(grant_application.id),
        embeddings=embeddings,
        search_queries=search_queries,
        metadata_filter=metadata_filter,
        trace_id="test-quality-filter",
        limit=10,
    )

    logger.info("Retrieved %d vectors with quality score filter", len(vectors))

    for vector in vectors:
        metadata = vector.rag_source.document_metadata
        if metadata and "quality_score" in metadata:
            quality_score = metadata["quality_score"]
            logger.info("Quality score: %s", quality_score)
            assert isinstance(quality_score, (int, float)), f"Quality score must be numeric, got {type(quality_score)}"
            assert quality_score >= 0.7, f"Quality score {quality_score} below threshold"


@pytest.mark.e2e
async def test_retrieval_with_combined_filters(
    nih_research_paper_source: RagUrl,
    generic_cancer_research_source: RagUrl,
    grant_application: GrantApplication,
    logger: logging.Logger,
) -> None:
    search_queries = ["NIH melanoma research methodology"]
    embeddings = await generate_embeddings(search_queries)

    metadata_filter: MetadataFilterParams = {
        "entity_types": ["ORGANIZATION"],
        "categories": ["research", "scientific"],
        "min_quality_score": 0.5,
    }

    vectors = await retrieve_vectors_for_embedding(
        file_table_cls=GrantApplicationSource,
        application_id=str(grant_application.id),
        embeddings=embeddings,
        search_queries=search_queries,
        metadata_filter=metadata_filter,
        trace_id="test-combined-filter",
        limit=10,
    )

    logger.info("Retrieved %d vectors with combined filters", len(vectors))
    assert len(vectors) > 0, "Should retrieve vectors matching all criteria"

    for vector in vectors[:3]:
        metadata = vector.rag_source.document_metadata
        if metadata is not None:
            entities = metadata.get("entities", [])
            entity_count = len(entities) if isinstance(entities, list) else 0
            logger.info(
                "Document metadata: entities=%d, categories=%s, quality=%s",
                entity_count,
                metadata.get("categories"),
                metadata.get("quality_score"),
            )


@pytest.mark.e2e
async def test_metadata_extraction_completeness(
    nih_research_paper_source: RagUrl,
    logger: logging.Logger,
) -> None:
    metadata = nih_research_paper_source.document_metadata

    assert metadata is not None, "Metadata should be extracted"
    assert "entities" in metadata, "Should extract entities"
    assert "keywords" in metadata, "Should extract keywords"
    assert "categories" in metadata or "document_type" in metadata, "Should classify document"

    entities = metadata.get("entities", [])
    keywords = metadata.get("keywords", [])
    categories = metadata.get("categories", [])
    doc_type = metadata.get("document_type")

    entities_list = entities if isinstance(entities, list) else []
    keywords_list = keywords if isinstance(keywords, list) else []

    logger.info("Entities extracted: %d", len(entities_list))
    logger.info("Keywords extracted: %d", len(keywords_list))
    logger.info("Categories: %s", categories)
    logger.info("Document type: %s", doc_type)

    org_entities = [e for e in entities_list if isinstance(e, dict) and e.get("type") == "ORGANIZATION"]
    logger.info("Organization entities: %s", [e.get("text") for e in org_entities[:5]])

    person_entities = [e for e in entities_list if isinstance(e, dict) and e.get("type") == "PERSON"]
    logger.info("Person entities: %s", [e.get("text") for e in person_entities[:5]])

    logger.info("Top keywords: %s", keywords_list[:10])
