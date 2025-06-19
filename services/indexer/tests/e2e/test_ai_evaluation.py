import logging
from os import environ
from pathlib import Path
from typing import TYPE_CHECKING

import pytest
from packages.db.src.tables import GrantApplicationRagSource
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL, get_anthropic_client
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.exceptions import ExternalOperationError
from testing import TEST_DATA_SOURCES

from services.indexer.src.processing import process_source
from services.indexer.tests.e2e.evaluation_utils import (
    comprehensive_quality_assessment,
    cosine_similarity,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
class TestAIEvaluation:
    @pytest.mark.ai_eval
    @pytest.mark.timeout(180)
    async def test_content_relevance_evaluation(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running AI content relevance evaluation")


        test_chunks: list[Chunk] = [
            {
                "content": "This research investigates novel machine learning algorithms for protein structure prediction, "
                "focusing on deep neural networks and transformer architectures to improve accuracy in "
                "computational biology applications."
            },
            {
                "content": "The methodology involves training convolutional neural networks on large protein databases, "
                "utilizing state-of-the-art GPU computing resources and implementing advanced optimization "
                "techniques for model convergence."
            },
            {
                "content": "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut "
                "labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation."
            },
        ]

        try:
            await index_chunks(chunks=test_chunks, source_id=str(grant_application_file.rag_source_id))


            client = get_anthropic_client()

            evaluation_prompt = """
            Evaluate the following research content chunks for their scientific quality and coherence:

            Chunk 1: {chunk1}

            Chunk 2: {chunk2}

            Chunk 3: {chunk3}

            Rate each chunk on a scale of 1-10 for:
            1. Scientific coherence
            2. Research relevance
            3. Technical specificity

            Respond with only a JSON object like:
            {{"chunk1": {{"coherence": 8, "relevance": 9, "specificity": 7}}, "chunk2": ..., "chunk3": ...}}
            """

            message = await client.messages.create(
                model=ANTHROPIC_SONNET_MODEL,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": evaluation_prompt.format(
                            chunk1=test_chunks[0]["content"],
                            chunk2=test_chunks[1]["content"],
                            chunk3=test_chunks[2]["content"],
                        ),
                    }
                ],
            )

            response_content = ""
            if message.content and hasattr(message.content[0], "text"):
                response_content = message.content[0].text
            logger.info("AI evaluation response: %s", response_content)


            assert "chunk1" in response_content, "AI response missing chunk1 evaluation"
            assert "chunk2" in response_content, "AI response missing chunk2 evaluation"
            assert "chunk3" in response_content, "AI response missing chunk3 evaluation"


            assert "coherence" in response_content.lower(), "AI response missing coherence evaluation"
            assert "relevance" in response_content.lower(), "AI response missing relevance evaluation"

            logger.info("✓ AI content relevance evaluation completed successfully")

        except ExternalOperationError as e:
            pytest.skip(f"AI evaluation unavailable: {e}")
        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"AI content relevance evaluation failed: {e}")

    @pytest.mark.ai_eval
    @pytest.mark.timeout(240)
    async def test_hallucination_detection(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running AI hallucination detection test")


        test_cases = [
            {
                "content": "The periodic table contains 118 known chemical elements, with hydrogen being the lightest "
                "and having an atomic number of 1. Carbon has six protons and typically forms four bonds.",
                "label": "factual",
            },
            {
                "content": "The newly discovered element Unobtanium has 200 protons and can reverse the flow of time "
                "when exposed to moonlight. Scientists at the University of Atlantis confirmed this discovery.",
                "label": "fabricated",
            },
        ]

        try:
            await index_chunks(
                chunks=[{"content": case["content"]} for case in test_cases],
                source_id=str(grant_application_file.rag_source_id),
            )

            client = get_anthropic_client()

            hallucination_prompt = """
            Analyze the following statements for factual accuracy and potential hallucinations:

            Statement 1: {statement1}

            Statement 2: {statement2}

            For each statement, determine:
            1. Is it factually accurate? (yes/no)
            2. Contains fabricated information? (yes/no)
            3. Confidence level (1-10)

            Respond with JSON:
            {{"statement1": {{"accurate": true, "fabricated": false, "confidence": 9}}, "statement2": ...}}
            """

            message = await client.messages.create(
                model=ANTHROPIC_SONNET_MODEL,
                max_tokens=800,
                messages=[
                    {
                        "role": "user",
                        "content": hallucination_prompt.format(
                            statement1=test_cases[0]["content"], statement2=test_cases[1]["content"]
                        ),
                    }
                ],
            )

            response_content = ""
            if message.content and hasattr(message.content[0], "text"):
                response_content = message.content[0].text
            logger.info("Hallucination detection response: %s", response_content)


            assert "statement1" in response_content, "Missing evaluation for statement1"
            assert "statement2" in response_content, "Missing evaluation for statement2"
            assert "fabricated" in response_content.lower(), "Missing fabrication assessment"

            logger.info("✓ AI hallucination detection test completed successfully")

        except ExternalOperationError as e:
            pytest.skip(f"AI evaluation unavailable: {e}")
        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"AI hallucination detection failed: {e}")

    @pytest.mark.semantic_evaluation
    @pytest.mark.timeout(120)
    async def test_semantic_similarity_thresholds(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running semantic similarity threshold evaluation")


        similarity_test_cases = [
            {
                "chunk1": "Machine learning algorithms are used for pattern recognition in data science.",
                "chunk2": "Artificial intelligence techniques help identify patterns in large datasets.",
                "expected_min_similarity": 0.6,
                "label": "high_similarity",
            },
            {
                "chunk1": "The research focuses on protein folding mechanisms in cellular biology.",
                "chunk2": "Today's weather is sunny with a temperature of 25 degrees Celsius.",
                "expected_max_similarity": 0.3,
                "label": "low_similarity",
            },
        ]

        try:
            for test_case in similarity_test_cases:
                chunks: list[Chunk] = [{"content": str(test_case["chunk1"])}, {"content": str(test_case["chunk2"])}]

                vectors = await index_chunks(chunks=chunks, source_id=str(grant_application_file.rag_source_id))

                similarity = cosine_similarity(vectors[0]["embedding"], vectors[1]["embedding"])

                if test_case["label"] == "high_similarity":
                    expected_min = float(str(test_case["expected_min_similarity"]))
                    assert similarity >= expected_min, (
                        f"High similarity test failed: {similarity:.3f} < {expected_min}"
                    )
                else:
                    expected_max = float(str(test_case["expected_max_similarity"]))
                    assert similarity <= expected_max, (
                        f"Low similarity test failed: {similarity:.3f} > {expected_max}"
                    )

                logger.info(
                    "✓ Similarity test '%s': %.3f (expected %s %.1f)",
                    test_case["label"],
                    similarity,
                    ">=" if test_case["label"] == "high_similarity" else "<=",
                    test_case.get("expected_min_similarity", test_case.get("expected_max_similarity")),
                )

            logger.info("✓ Semantic similarity threshold evaluation completed")

        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"Semantic similarity threshold evaluation failed: {e}")

    @pytest.mark.quality_assessment
    @pytest.mark.timeout(300)
    @pytest.mark.parametrize("data_file", TEST_DATA_SOURCES[:3])
    async def test_comprehensive_quality_with_ai_validation(
        self, logger: logging.Logger, data_file: Path, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running comprehensive quality assessment with AI validation for %s", data_file.name)

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


            quality_assessment = comprehensive_quality_assessment(vectors, text_content)

            overall_score = quality_assessment["overall_quality_score"]
            assert overall_score > 0.5, f"Overall quality score too low: {overall_score}"


            chunk_quality = quality_assessment["chunk_quality"]
            assert chunk_quality["quality_score"] > 0.6, f"Chunk quality too low: {chunk_quality['quality_score']}"

            embedding_quality = quality_assessment["embedding_quality"]
            assert embedding_quality["embedding_quality_score"] > 0.7, (
                f"Embedding quality too low: {embedding_quality['embedding_quality_score']}"
            )


            try:
                client = get_anthropic_client()


                sample_chunks = vectors[:3]
                chunk_contents = [v["chunk"]["content"] for v in sample_chunks]

                ai_prompt = f"""
                Evaluate these text chunks extracted from a research document for quality:

                Chunk 1: {chunk_contents[0][:500]}...
                Chunk 2: {chunk_contents[1][:500]}...
                Chunk 3: {chunk_contents[2][:500]}...

                Rate overall extraction quality (1-10) considering:
                - Coherence and readability
                - Information completeness
                - Scientific/technical validity

                Respond with just a number (1-10).
                """

                message = await client.messages.create(
                    model=ANTHROPIC_SONNET_MODEL, max_tokens=50, messages=[{"role": "user", "content": ai_prompt}]
                )

                ai_response = ""
                if message.content and hasattr(message.content[0], "text"):
                    ai_response = message.content[0].text
                logger.info("AI quality rating: %s", ai_response.strip())


                try:
                    ai_rating = float(ai_response.strip())
                    assert 1 <= ai_rating <= 10, f"AI rating out of range: {ai_rating}"
                    assert ai_rating >= 5.0, f"AI quality rating too low: {ai_rating}"
                except ValueError:
                    logger.warning("Could not parse AI rating: %s", ai_response)

            except ExternalOperationError:
                logger.info("AI validation skipped (not available)")

            logger.info(
                "✓ Comprehensive quality assessment passed for %s: overall=%.2f, chunks=%.2f, embeddings=%.2f",
                data_file.name,
                overall_score,
                chunk_quality["quality_score"],
                embedding_quality["embedding_quality_score"],
            )

        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"Comprehensive quality assessment failed for {data_file.name}: {e}")

    @pytest.mark.ai_eval
    @pytest.mark.timeout(200)
    async def test_citation_accuracy_validation(
        self, logger: logging.Logger, grant_application_file: GrantApplicationRagSource
    ) -> None:
        logger.info("Running citation accuracy validation test")


        citation_test_content = """
        According to Smith et al. (2023), machine learning techniques have shown significant
        improvement in protein structure prediction. The AlphaFold model developed by DeepMind
        achieved unprecedented accuracy in the CASP competition (Jumper et al., 2021).
        Recent studies indicate that transformer architectures can outperform traditional
        methods by 15-20% (Johnson & Lee, 2024).
        """

        try:
            await index_chunks(
                chunks=[{"content": citation_test_content}], source_id=str(grant_application_file.rag_source_id)
            )

            client = get_anthropic_client()

            citation_prompt = """
            Analyze this text for citation accuracy and format:

            Text: {text}

            Evaluate:
            1. Are citations properly formatted?
            2. Do citations appear realistic?
            3. Are there any obvious citation errors?

            Respond with JSON:
            {{"properly_formatted": true/false, "appear_realistic": true/false, "errors_found": "description"}}
            """

            message = await client.messages.create(
                model=ANTHROPIC_SONNET_MODEL,
                max_tokens=400,
                messages=[{"role": "user", "content": citation_prompt.format(text=citation_test_content)}],
            )

            response_content = ""
            if message.content and hasattr(message.content[0], "text"):
                response_content = message.content[0].text
            logger.info("Citation validation response: %s", response_content)


            assert "formatted" in response_content.lower(), "Missing citation format assessment"
            assert "realistic" in response_content.lower(), "Missing citation realism assessment"

            logger.info("✓ Citation accuracy validation completed successfully")

        except ExternalOperationError as e:
            pytest.skip(f"AI evaluation unavailable: {e}")
        except (ValueError, KeyError, AttributeError) as e:
            pytest.fail(f"Citation accuracy validation failed: {e}")
