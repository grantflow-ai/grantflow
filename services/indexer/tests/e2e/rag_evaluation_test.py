import logging
import math
from os import environ
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest
from packages.db.src.tables import GrantApplicationRagSource, TextVector
from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from packages.shared_utils.src.extraction import extract_file_content
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER, TEST_DATA_SOURCES

from services.indexer.src.processing import process_source

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk

QUICK_TEST_FILES = TEST_DATA_SOURCES[:3]
QUALITY_TEST_FILES = TEST_DATA_SOURCES[:6]
FULL_TEST_SUITE = TEST_DATA_SOURCES

FIXTURE_FILES = list(FIXTURES_FOLDER.glob("**/*.json"))
SMALL_FIXTURE_FILES = [f for f in FIXTURE_FILES if f.stat().st_size < 200000]


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
class TestRAGPipeline:
    @pytest.mark.smoke
    @pytest.mark.timeout(60)
    @pytest.mark.parametrize("data_file", QUICK_TEST_FILES)
    async def test_extraction_smoke(self, logger: logging.Logger, data_file: Path) -> None:
        logger.info("Running smoke test for extracting text from %s", data_file.name)

        mime_type = data_file.suffix
        if data_file.suffix == ".pdf":
            mime_type = "application/pdf"
        elif data_file.suffix == ".docx":
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            pytest.skip(f"Unsupported file type: {data_file.suffix}")

        try:
            result, extracted_mime_type = await extract_file_content(
                content=data_file.read_bytes(), mime_type=mime_type
            )

            assert isinstance(result, str), f"Expected string result, got {type(result)}"
            assert result.strip(), "Extracted text is empty"
            assert extracted_mime_type, "No MIME type returned"
            assert len(result) >= 100, f"Extracted text too short: {len(result)} chars"

            logger.info("✓ Smoke test passed: extracted %d characters from %s", len(result), data_file.name)
        except (FileParsingError, ValidationError, ExternalOperationError) as e:
            pytest.fail(f"Extraction failed for {data_file.name}: {e}")

    @pytest.mark.smoke
    @pytest.mark.timeout(90)
    @pytest.mark.parametrize("data_file", QUICK_TEST_FILES)
    async def test_chunking_smoke(self, logger: logging.Logger, data_file: Path) -> None:
        logger.info("Running smoke test for chunking from %s", data_file.name)

        mime_type = (
            "application/pdf"
            if data_file.suffix == ".pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        try:
            text, extracted_mime_type = await extract_file_content(content=data_file.read_bytes(), mime_type=mime_type)

            chunks = chunk_text(text=text, mime_type=extracted_mime_type)

            assert len(chunks) > 0, f"No chunks generated from {data_file.name}"
            assert all(chunk["content"].strip() for chunk in chunks), "Empty chunks found"

            avg_chunk_length = sum(len(chunk["content"]) for chunk in chunks) / len(chunks)
            assert 100 <= avg_chunk_length <= 3000, f"Average chunk length suspicious: {avg_chunk_length}"

            logger.info("✓ Chunking smoke test passed: %d chunks, avg length %d", len(chunks), int(avg_chunk_length))
        except (FileParsingError, ValidationError, ExternalOperationError) as e:
            pytest.fail(f"Chunking failed for {data_file.name}: {e}")

    @pytest.mark.smoke
    @pytest.mark.timeout(120)
    async def test_embedding_generation_smoke(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running smoke test for embedding generation")

        test_chunks: list[Chunk] = [
            {"content": "This is a test chunk about machine learning research."},
            {"content": "Another test chunk discussing neural networks and deep learning."},
        ]

        try:
            vectors = await index_chunks(chunks=test_chunks, source_id=str(grant_application_file.rag_source_id))

            assert len(vectors) == 2, f"Expected 2 vectors, got {len(vectors)}"

            for vector in vectors:
                assert "embedding" in vector, "Missing embedding in vector"
                assert len(vector["embedding"]) > 0, "Empty embedding vector"
                assert all(isinstance(val, float) for val in vector["embedding"]), "Non-float values in embedding"
                assert vector["rag_source_id"] == str(grant_application_file.rag_source_id), "Incorrect source ID"

            logger.info("✓ Embedding generation smoke test passed: %d vectors generated", len(vectors))
        except (ExternalOperationError, ValidationError) as e:
            pytest.fail(f"Embedding generation failed: {e}")

    @pytest.mark.quality_assessment
    @pytest.mark.timeout(180)
    @pytest.mark.parametrize("data_file", QUALITY_TEST_FILES)
    async def test_semantic_coherence_assessment(
        self, logger: logging.Logger, data_file: Path, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running semantic coherence assessment for %s", data_file.name)

        mime_type = (
            "application/pdf"
            if data_file.suffix == ".pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        try:
            vectors, text_content = await process_source(
                content=data_file.read_bytes(),
                filename=data_file.name,
                mime_type=mime_type,
                source_id=str(grant_application_file.rag_source_id),
            )

            assert len(vectors) > 0, "No vectors generated"
            assert len(text_content) > 500, f"Text content too short: {len(text_content)} chars"

            chunk_lengths = [len(v["chunk"]["content"]) for v in vectors]
            avg_length = sum(chunk_lengths) / len(chunk_lengths)
            std_dev = math.sqrt(sum((x - avg_length) ** 2 for x in chunk_lengths) / len(chunk_lengths))

            assert 500 <= avg_length <= 2500, f"Average chunk length out of range: {avg_length}"
            assert std_dev / avg_length < 0.8, f"Chunk length variance too high: {std_dev / avg_length}"

            embedding_norms = [math.sqrt(sum(x**2 for x in v["embedding"])) for v in vectors]
            avg_norm = sum(embedding_norms) / len(embedding_norms)

            assert 0.5 <= avg_norm <= 2.0, f"Average embedding norm suspicious: {avg_norm}"
            assert all(0.1 <= norm <= 3.0 for norm in embedding_norms), "Embedding norms out of range"

            logger.info(
                "✓ Semantic coherence assessment passed: %d vectors, avg chunk %d chars, avg norm %.3f",
                len(vectors),
                int(avg_length),
                avg_norm,
            )
        except (FileParsingError, ValidationError, ExternalOperationError) as e:
            pytest.fail(f"Semantic coherence assessment failed for {data_file.name}: {e}")

    @pytest.mark.semantic_evaluation
    @pytest.mark.timeout(240)
    async def test_embedding_similarity_evaluation(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running embedding similarity evaluation")

        similar_chunks: list[Chunk] = [
            {"content": "Machine learning algorithms are used for pattern recognition and data analysis."},
            {"content": "Artificial intelligence techniques help identify patterns in large datasets."},
            {"content": "The weather is sunny today with clear blue skies."},
            {"content": "Today features bright sunshine and cloudless weather conditions."},
        ]

        try:
            vectors = await index_chunks(chunks=similar_chunks, source_id=str(grant_application_file.rag_source_id))

            def cosine_similarity(a: list[float], b: list[float]) -> float:
                dot_product = sum(x * y for x, y in zip(a, b, strict=False))
                norm_a = math.sqrt(sum(x**2 for x in a))
                norm_b = math.sqrt(sum(x**2 for x in b))
                return dot_product / (norm_a * norm_b)

            ml_similarity = cosine_similarity(vectors[0]["embedding"], vectors[1]["embedding"])
            weather_similarity = cosine_similarity(vectors[2]["embedding"], vectors[3]["embedding"])

            cross_similarity = cosine_similarity(vectors[0]["embedding"], vectors[2]["embedding"])

            assert ml_similarity > 0.6, f"ML chunks similarity too low: {ml_similarity}"
            assert weather_similarity > 0.6, f"Weather chunks similarity too low: {weather_similarity}"
            assert cross_similarity < ml_similarity, "Cross-domain similarity unexpectedly high"
            assert cross_similarity < weather_similarity, "Cross-domain similarity unexpectedly high"

            logger.info(
                "✓ Similarity evaluation passed: ML=%.3f, Weather=%.3f, Cross=%.3f",
                ml_similarity,
                weather_similarity,
                cross_similarity,
            )
        except (ExternalOperationError, ValidationError) as e:
            pytest.fail(f"Similarity evaluation failed: {e}")

    @pytest.mark.quality_assessment
    @pytest.mark.timeout(300)
    async def test_database_integration_quality(
        self,
        logger: logging.Logger,
        async_session_maker: async_sessionmaker[Any],
        grant_application_file: GrantApplicationRagSource,
    ) -> None:
        logger.info("Running database integration quality test")

        test_chunks: list[Chunk] = [
            {"content": "Research methodology for analyzing protein structures using computational methods."},
            {"content": "Statistical analysis of experimental data from biochemical assays."},
        ]

        try:
            vectors = await index_chunks(chunks=test_chunks, source_id=str(grant_application_file.rag_source_id))

            async with async_session_maker() as session:
                result = await session.execute(
                    select(TextVector).where(TextVector.rag_source_id == grant_application_file.rag_source_id)
                )
                existing_vectors = result.scalars().all()

                for vector in vectors:
                    assert len(vector["embedding"]) == 384, (
                        f"Unexpected embedding dimension: {len(vector['embedding'])}"
                    )
                    assert vector["rag_source_id"] == str(grant_application_file.rag_source_id), "Source ID mismatch"
                    assert "chunk" in vector, "Missing chunk in vector"
                    assert vector["chunk"]["content"], "Empty chunk content"

                logger.info(
                    "✓ Database integration quality test passed: %d new vectors, %d existing vectors",
                    len(vectors),
                    len(existing_vectors),
                )
        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"Database integration quality test failed: {e}")

    @pytest.mark.e2e_full
    @pytest.mark.timeout(600)
    @pytest.mark.parametrize("data_file", FULL_TEST_SUITE)
    async def test_comprehensive_pipeline_evaluation(
        self,
        logger: logging.Logger,
        data_file: Path,
        async_session_maker: async_sessionmaker[Any],
        grant_application_file: GrantApplicationRagSource,
    ) -> None:
        logger.info("Running comprehensive pipeline evaluation for %s", data_file.name)

        mime_type = (
            "application/pdf"
            if data_file.suffix == ".pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        try:
            vectors, text_content = await process_source(
                content=data_file.read_bytes(),
                filename=data_file.name,
                mime_type=mime_type,
                source_id=str(grant_application_file.rag_source_id),
            )

            assert len(vectors) > 0, "No vectors generated"
            assert len(text_content) > 200, f"Insufficient text content: {len(text_content)} chars"

            total_chunk_chars = sum(len(v["chunk"]["content"]) for v in vectors)
            coverage_ratio = total_chunk_chars / len(text_content)

            assert 0.7 <= coverage_ratio <= 1.5, f"Coverage ratio suspicious: {coverage_ratio}"

            embedding_dims = {len(v["embedding"]) for v in vectors}
            assert len(embedding_dims) == 1, f"Inconsistent embedding dimensions: {embedding_dims}"
            assert next(iter(embedding_dims)) == 384, f"Unexpected embedding dimension: {next(iter(embedding_dims))}"

            chunk_contents = [v["chunk"]["content"] for v in vectors]
            unique_contents = set(chunk_contents)
            duplicate_ratio = 1 - (len(unique_contents) / len(chunk_contents))

            assert duplicate_ratio < 0.1, f"Too many duplicate chunks: {duplicate_ratio:.2%}"
            assert all(content.strip() for content in chunk_contents), "Empty chunks detected"

            content_lengths = [len(content) for content in chunk_contents]
            avg_length = sum(content_lengths) / len(content_lengths)

            assert 300 <= avg_length <= 2500, f"Average chunk length out of range: {avg_length}"

            logger.info(
                "✓ Comprehensive evaluation passed: %s - %d vectors, %.1f%% coverage, avg %d chars",
                data_file.name,
                len(vectors),
                coverage_ratio * 100,
                int(avg_length),
            )
        except (FileParsingError, ValidationError, ExternalOperationError) as e:
            logger.error("Comprehensive evaluation failed for %s: %s", data_file.name, e)
            pytest.fail(f"Comprehensive evaluation failed for {data_file.name}: {e}")
        except Exception as e:
            logger.exception("Unexpected error in comprehensive evaluation for %s", data_file.name)
            pytest.fail(f"Unexpected comprehensive evaluation error for {data_file.name}: {e}")
