import logging
import time
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler

# Import our ROUGE calculation functions
from services.rag.tests.e2e.rag_proximity_test import calculate_rouge_l


def calculate_rouge_n_grams(reference_text: str, generated_text: str, n: int) -> float:
    """Calculate ROUGE-N score for any n-gram size"""
    if not reference_text or not generated_text:
        return 0.0

    ref_tokens = reference_text.lower().split()
    gen_tokens = generated_text.lower().split()

    if len(ref_tokens) < n or len(gen_tokens) < n:
        return 0.0

    def create_ngrams(tokens: list[str], n: int) -> set[tuple[str, ...]]:
        return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}

    ref_ngrams = create_ngrams(ref_tokens, n)
    gen_ngrams = create_ngrams(gen_tokens, n)

    if not ref_ngrams or not gen_ngrams:
        return 0.0

    overlap = len(ref_ngrams & gen_ngrams)
    precision = overlap / len(gen_ngrams)
    recall = overlap / len(ref_ngrams)

    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)


def extract_ngrams_for_analysis(text: str, n: int) -> set[tuple[str, ...]]:
    """Extract n-grams from text for analysis"""
    tokens = text.lower().split()
    if len(tokens) < n:
        return set()

    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def create_mock_job_manager() -> AsyncMock:
    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()
    return mock_job_manager


async def analyze_generated_content(
    section_texts: dict[str, str], iteration: int, logger: logging.Logger
) -> dict[str, Any]:
    """Analyze generated content with ROUGE metrics and n-gram analysis"""

    # Define reference requirements for different sections (based on melanoma application)
    section_requirements = {
        "abstract": "melanoma brain metastases immunotherapy single-cell technologies ZMAN-seq PIC-seq STEREO-seq tumor microenvironment TREM2 macrophages cytokines",
        "research_strategy": "single-cell RNA sequencing temporal immune tracking cell-cell interactions spatial transcriptomics tumor microenvironment immune suppression mechanisms therapeutic development",
        "preliminary_results": "anti-TREM2 antibody cytokine combinations immunocytokine fusion proteins masking strategies tumor-associated macrophages immune activation",
        "background": "brain metastases melanoma immunotherapy tumor microenvironment immune suppression single-cell technologies",
        "significance": "melanoma brain metastases immunotherapy clinical impact patient outcomes tumor microenvironment",
        "aims": "research objectives melanoma brain metastases single-cell analysis therapeutic development TREM2 targeting",
        "methodology": "single-cell sequencing ZMAN-seq PIC-seq STEREO-seq experimental design data analysis",
        "work_plan": "research timeline milestones deliverables experimental phases validation studies",
    }

    analysis_results = []

    for section_title, generated_text in section_texts.items():
        # Find the best matching requirement
        section_key = section_title.lower()
        requirements = ""

        for key, req in section_requirements.items():
            if key in section_key or any(word in section_key for word in key.split("_")):
                requirements = req
                break

        if not requirements:
            # Default to general melanoma research requirements
            requirements = section_requirements.get("abstract", "")

        if not generated_text or not requirements:
            continue

        # Calculate ROUGE scores
        rouge_l = calculate_rouge_l(requirements, generated_text)
        rouge_2 = calculate_rouge_n_grams(requirements, generated_text, 2)
        rouge_3 = calculate_rouge_n_grams(requirements, generated_text, 3)
        rouge_4 = calculate_rouge_n_grams(requirements, generated_text, 4)

        # Extract n-grams for detailed analysis
        req_bigrams = extract_ngrams_for_analysis(requirements, 2)
        gen_bigrams = extract_ngrams_for_analysis(generated_text, 2)
        bigram_overlap = len(req_bigrams & gen_bigrams)
        bigram_total = len(req_bigrams | gen_bigrams)

        req_trigrams = extract_ngrams_for_analysis(requirements, 3)
        gen_trigrams = extract_ngrams_for_analysis(generated_text, 3)
        trigram_overlap = len(req_trigrams & gen_trigrams)
        trigram_total = len(req_trigrams | gen_trigrams)

        req_4grams = extract_ngrams_for_analysis(requirements, 4)
        gen_4grams = extract_ngrams_for_analysis(generated_text, 4)
        fourgram_overlap = len(req_4grams & gen_4grams)
        fourgram_total = len(req_4grams | gen_4grams)

        # Count words
        word_count = len(generated_text.split())

        result = {
            "section_name": section_title,
            "iteration": iteration,
            "word_count": word_count,
            "rouge_scores": {
                "rouge_l": rouge_l,
                "rouge_2": rouge_2,
                "rouge_3": rouge_3,
                "rouge_4": rouge_4,
            },
            "ngram_analysis": {
                "bigrams": {
                    "overlap": bigram_overlap,
                    "total_unique": bigram_total,
                    "jaccard_similarity": bigram_overlap / bigram_total if bigram_total > 0 else 0,
                    "requirements_count": len(req_bigrams),
                    "generated_count": len(gen_bigrams),
                },
                "trigrams": {
                    "overlap": trigram_overlap,
                    "total_unique": trigram_total,
                    "jaccard_similarity": trigram_overlap / trigram_total if trigram_total > 0 else 0,
                    "requirements_count": len(req_trigrams),
                    "generated_count": len(gen_trigrams),
                },
                "4grams": {
                    "overlap": fourgram_overlap,
                    "total_unique": fourgram_total,
                    "jaccard_similarity": fourgram_overlap / fourgram_total if fourgram_total > 0 else 0,
                    "requirements_count": len(req_4grams),
                    "generated_count": len(gen_4grams),
                },
            },
            "requirements_used": requirements,
            "generated_text_sample": generated_text[:300] + "..." if len(generated_text) > 300 else generated_text,
        }

        analysis_results.append(result)

        logger.info(
            "Section analysis completed", section=section_title, word_count=word_count, rouge_l=rouge_l, rouge_2=rouge_2
        )

    return analysis_results


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1800)
async def test_rag_focused_prompts_real_generation(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test RAG-focused prompts with real database content generation (single iteration)"""

    logger.info("🚀 Starting RAG-focused prompts test with real generation")

    start_time = time.time()

    mock_job_manager = create_mock_job_manager()

    # Generate content using the RAG pipeline with our enhanced prompts
    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=UUID(melanoma_alliance_full_application_id),
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )

        assert result is not None, "Grant application generation should not return None"
        full_text, section_texts = result

    generation_time = time.time() - start_time

    logger.info(
        "Generation completed",
        execution_time=generation_time,
        full_text_length=len(full_text),
        sections_count=len(section_texts),
    )

    # Analyze the generated content
    analysis_start = time.time()
    analysis_results = await analyze_generated_content(section_texts, 1, logger)
    time.time() - analysis_start

    # Calculate overall metrics
    if analysis_results:
        avg_rouge_l = sum(r["rouge_scores"]["rouge_l"] for r in analysis_results) / len(analysis_results)
        avg_rouge_2 = sum(r["rouge_scores"]["rouge_2"] for r in analysis_results) / len(analysis_results)
        avg_rouge_3 = sum(r["rouge_scores"]["rouge_3"] for r in analysis_results) / len(analysis_results)
        avg_rouge_4 = sum(r["rouge_scores"]["rouge_4"] for r in analysis_results) / len(analysis_results)

        sum(r["ngram_analysis"]["bigrams"]["jaccard_similarity"] for r in analysis_results) / len(analysis_results)
        sum(r["ngram_analysis"]["trigrams"]["jaccard_similarity"] for r in analysis_results) / len(analysis_results)
        sum(r["ngram_analysis"]["4grams"]["jaccard_similarity"] for r in analysis_results) / len(analysis_results)

        total_words = sum(r["word_count"] for r in analysis_results)

        logger.info(
            "RAG-focused analysis completed",
            avg_rouge_l=avg_rouge_l,
            avg_rouge_2=avg_rouge_2,
            avg_rouge_3=avg_rouge_3,
            avg_rouge_4=avg_rouge_4,
            total_words=total_words,
            sections_analyzed=len(analysis_results),
        )

        # Validate that we got reasonable results
        assert avg_rouge_l > 0, f"ROUGE-L should be positive: {avg_rouge_l}"
        assert avg_rouge_2 >= 0, f"ROUGE-2 should be non-negative: {avg_rouge_2}"
        assert total_words > 1000, f"Total generated text should be substantial: {total_words} words"
        assert len(analysis_results) > 0, "Should have analyzed at least one section"

        # Check that the text contains key melanoma research terms
        full_text_lower = full_text.lower()
        melanoma_terms = [
            "melanoma",
            "brain metastases",
            "immunotherapy",
            "single-cell",
            "trem2",
            "tumor microenvironment",
        ]
        found_terms = [
            term
            for term in melanoma_terms
            if term.replace(" ", "").replace("-", "") in full_text_lower.replace(" ", "").replace("-", "")
        ]

        logger.info("Melanoma terms found", found_terms=found_terms, total_terms=len(melanoma_terms))
        assert len(found_terms) >= 4, f"Should contain most melanoma research terms, found: {found_terms}"

    else:
        logger.warning("No analysis results generated")
        raise AssertionError("Failed to analyze any sections")


async def run_rag_focused_baseline_iterations(iterations: int = 5) -> dict:
    """Run multiple iterations of the RAG-focused generation test"""

    # This would need to be called from a test runner that has access to fixtures
    # For now, we'll create a placeholder that can be called manually

    return {
        "message": "Use pytest to run the actual test with database fixtures",
        "command": "E2E_TESTS=1 PYTHONPATH=. uv run pytest services/rag/tests/e2e/rag_focused_generation_test.py::test_rag_focused_prompts_real_generation -v",
    }


if __name__ == "__main__":
    import asyncio

    result = asyncio.run(run_rag_focused_baseline_iterations(5))
