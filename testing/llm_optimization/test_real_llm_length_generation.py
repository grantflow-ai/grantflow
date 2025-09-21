import asyncio
import json
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, ".")

from dotenv import load_dotenv
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.tests.e2e.rag_proximity_test import calculate_length_compliance_score, calculate_rouge_l

load_dotenv()


def setup_logging() -> logging.Logger:
    """Setup logging for the test runner"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    return logging.getLogger(__name__)


async def test_real_llm_length_generation() -> None:
    """Test actual LLM length generation vs simulated text"""
    logger = setup_logging()
    logger.info("🧪 Testing Real LLM Length Generation")

    # Test parameters
    test_prompt = """
    Generate a comprehensive Research Strategy section for a melanoma brain metastases immunotherapy grant application.

    Key requirements:
    - Describe novel TREM2-targeted immunocytokine development methodology
    - Include single-cell sequencing protocols (ZMAN-seq, PIC-seq)
    - Detail spatial transcriptomics approaches using Stereo-seq
    - Explain experimental design for brain metastases models
    - Address immunotherapy resistance mechanisms
    - Include statistical analysis plans and expected outcomes

    This section will be reviewed by expert immunologists and neuroscientists.
    """

    # Test context (simulated RAG results)
    test_context = """
    Advanced single-cell RNA sequencing methodology for melanoma tumor microenvironment analysis.
    ZMAN-seq temporal tracking protocols for immune cell dynamics in brain metastases.
    PIC-seq cell-cell interaction measurement techniques for tumor-immune interactions.
    Stereo-seq spatial transcriptomics for melanoma brain metastasis research mapping.
    TREM2-targeted immunocytokine design methodology combining antibodies with cytokines.
    Brain metastases treatment challenges and immunotherapy resistance mechanisms.
    Statistical analysis frameworks for multi-omics cancer research studies.
    Preclinical model systems for melanoma brain metastases drug testing.
    """

    # Test different length targets
    length_test_cases = [
        {"min_words": 800, "max_words": 1200, "name": "Standard Grant Section"},
        {"min_words": 400, "max_words": 600, "name": "Short Section"},
        {"min_words": 200, "max_words": 300, "name": "Brief Summary"},
    ]

    results = []

    for i, case in enumerate(length_test_cases, 1):
        logger.info(
            "Starting test case",
            case_number=i,
            case_name=case["name"],
            min_words=case["min_words"],
            max_words=case["max_words"],
        )

        start_time = time.time()

        try:
            # Call the real LLM generation function
            generated_text = await generate_long_form_text(
                prompt_or_task_description=test_prompt,
                min_words=case["min_words"],
                max_words=case["max_words"],
                prompt_identifier="real_length_test",
                task_description=f"Generate {case['name']} for melanoma research grant",
                context=test_context,
            )

            generation_time = time.time() - start_time
            actual_word_count = len(generated_text.split())

            # Calculate compliance
            compliance = calculate_length_compliance_score(
                actual_word_count=actual_word_count, min_words=case["min_words"], max_words=case["max_words"]
            )

            # Calculate ROUGE score between context and generated text
            context_rouge = calculate_rouge_l(test_context, generated_text)

            logger.info("Generation completed", word_count=actual_word_count, generation_time=generation_time)
            logger.info("Target range", min_words=case["min_words"], max_words=case["max_words"])
            logger.info("Compliance result", status=compliance["compliance_status"], grade=compliance["grade"])
            logger.info("Utilization", percentage=compliance.get("utilization_percentage", 0))
            logger.info("Context similarity", rouge_l=context_rouge)

            if compliance["issues"]:
                logger.warning("Compliance issues found", issues=", ".join(compliance["issues"]))

            results.append(
                {
                    "test_case": case["name"],
                    "target_min_words": case["min_words"],
                    "target_max_words": case["max_words"],
                    "actual_word_count": actual_word_count,
                    "generation_time_seconds": generation_time,
                    "compliance_status": compliance["compliance_status"],
                    "grade": compliance["grade"],
                    "compliance_percentage": compliance["compliance_percentage"],
                    "utilization_percentage": compliance.get("utilization_percentage"),
                    "context_rouge_l": context_rouge,
                    "issues": compliance["issues"],
                    "generated_text_sample": generated_text[:300] + "..."
                    if len(generated_text) > 300
                    else generated_text,
                }
            )

        except Exception as e:
            logger.error("Generation failed", case_name=case["name"], error=str(e))
            results.append(
                {
                    "test_case": case["name"],
                    "error": str(e),
                    "target_min_words": case["min_words"],
                    "target_max_words": case["max_words"],
                }
            )

    # Summary analysis
    logger.info("=" * 60)
    logger.info("📊 REAL LLM LENGTH GENERATION SUMMARY")
    logger.info("=" * 60)

    successful_tests = [r for r in results if "error" not in r]

    if successful_tests:
        avg_utilization = sum(r.get("utilization_percentage", 0) or 0 for r in successful_tests) / len(successful_tests)
        pass_count = sum(1 for r in successful_tests if r["compliance_status"] == "PASS")
        avg_rouge = sum(r["context_rouge_l"] for r in successful_tests) / len(successful_tests)

        logger.info("Tests summary", completed=len(successful_tests), total=len(length_test_cases))
        logger.info(
            "Pass rate",
            passed=pass_count,
            total=len(successful_tests),
            percentage=pass_count / len(successful_tests) * 100,
        )
        logger.info("Average utilization", percentage=avg_utilization)
        logger.info("Average context similarity", rouge_l=avg_rouge)

        # Detailed breakdown
        for result in successful_tests:
            status_emoji = "✅" if result["compliance_status"] == "PASS" else "❌"
            logger.info(
                "Test result",
                status=status_emoji,
                test_case=result["test_case"],
                word_count=result["actual_word_count"],
                grade=result["grade"],
                utilization=result.get("utilization_percentage", 0),
            )

    else:
        logger.error("❌ All tests failed!")

    return results


async def main() -> None:
    """Main test runner"""
    logger = setup_logging()
    logger.info("🔍 Real LLM Length Generation Diagnostic Test")

    try:
        results = await test_real_llm_length_generation()

        # Save results for analysis
        output_dir = Path("testing/results/llm_length_diagnosis")
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / "real_llm_length_test_results.json"
        with output_file.open("w") as f:
            json.dump(
                {
                    "test_type": "real_llm_length_generation_diagnosis",
                    "timestamp": time.time(),
                    "results": results,
                },
                f,
                indent=2,
            )

        logger.info("Results saved", output_file=str(output_file))
        logger.info("✅ Real LLM length generation test completed!")

    except Exception as e:
        logger.error("Test suite failed", error=str(e))
        raise


if __name__ == "__main__":
    asyncio.run(main())
