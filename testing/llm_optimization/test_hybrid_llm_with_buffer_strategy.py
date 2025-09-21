#!/usr/bin/env python3

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, "../..")

from dotenv import load_dotenv
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.tests.e2e.rag_proximity_test import calculate_length_compliance_score, calculate_rouge_l

load_dotenv()


def setup_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    return logging.getLogger(__name__)

def select_model_for_length(max_words: int) -> str:
    if max_words <= 600:
        return "gemini-2.5-flash"
    return "gemini-2.5-flash-lite"

def apply_buffer_strategy(actual_min_words: int, actual_max_words: int, buffer_words: int = 150) -> dict[str, int]:
    llm_min_words = actual_min_words + buffer_words
    llm_max_words = actual_max_words + buffer_words

    return {
        "actual_min": actual_min_words,
        "actual_max": actual_max_words,
        "llm_min": llm_min_words,
        "llm_max": llm_max_words,
        "buffer_applied": buffer_words
    }

async def test_hybrid_llm_with_buffer_strategy() -> list[dict[str, Any]]:
    logger = setup_logging()
    logger.info("Testing Hybrid LLM + Buffer Strategy")
    logger.info("Strategy: Flash for ≤600w, Flash-Lite for >600w + 150 word buffer")

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

    length_test_cases = [
        {"min_words": 800, "max_words": 1200, "name": "Standard Grant Section"},
        {"min_words": 400, "max_words": 600, "name": "Short Section"},
        {"min_words": 200, "max_words": 300, "name": "Brief Summary"},
    ]

    results = []

    for i, case in enumerate(length_test_cases, 1):
        word_config = apply_buffer_strategy(
            actual_min_words=case["min_words"],
            actual_max_words=case["max_words"],
            buffer_words=150
        )

        selected_model = select_model_for_length(case["max_words"])

        logger.info("\n--- Test Case %d: %s ---", i, case["name"])
        logger.info("Actual Target: %d-%d words", case["min_words"], case["max_words"])
        logger.info("LLM Instruction: %d-%d words (+%d buffer)", word_config["llm_min"], word_config["llm_max"], word_config["buffer_applied"])
        logger.info("Selected Model: %s", selected_model)

        original_model = os.environ.get("GENERATION_MODEL", "gemini-2.5-flash-lite")
        os.environ["GENERATION_MODEL"] = selected_model

        start_time = time.time()

        try:
            generated_text = await generate_long_form_text(
                prompt_or_task_description=test_prompt,
                min_words=word_config["llm_min"],
                max_words=word_config["llm_max"],
                prompt_identifier="hybrid_buffer_test",
                task_description=f"Generate {case['name']} for melanoma research grant",
                context=test_context,
            )

            generation_time = time.time() - start_time
            actual_word_count = len(generated_text.split())

            compliance = calculate_length_compliance_score(
                actual_word_count=actual_word_count,
                min_words=case["min_words"],
                max_words=case["max_words"]
            )

            context_rouge = calculate_rouge_l(test_context, generated_text)

            logger.info("Generated: %d words in %.1fs", actual_word_count, generation_time)
            logger.info("Actual Target: %d-%d words", case["min_words"], case["max_words"])
            logger.info("LLM Target: %d-%d words", word_config["llm_min"], word_config["llm_max"])
            logger.info("Compliance vs Actual: %s (Grade %s)", compliance["compliance_status"], compliance["grade"])
            logger.info("Utilization: %.1f%%", compliance.get("utilization_percentage", 0))
            logger.info("Context ROUGE-L: %.3f", context_rouge)

            if compliance["issues"]:
                logger.warning("Issues: %s", ", ".join(compliance["issues"]))

            results.append({
                "test_case": case["name"],
                "selected_model": selected_model,
                "model_selection_reason": "Flash-Lite for long content (>600w)" if case["max_words"] > 600 else "Flash for short content (≤600w)",
                "buffer_strategy": {
                    "actual_min_words": case["min_words"],
                    "actual_max_words": case["max_words"],
                    "llm_min_words": word_config["llm_min"],
                    "llm_max_words": word_config["llm_max"],
                    "buffer_applied": word_config["buffer_applied"]
                },
                "actual_word_count": actual_word_count,
                "generation_time_seconds": generation_time,
                "compliance_status": compliance["compliance_status"],
                "grade": compliance["grade"],
                "compliance_percentage": compliance["compliance_percentage"],
                "utilization_percentage": compliance.get("utilization_percentage"),
                "context_rouge_l": context_rouge,
                "issues": compliance["issues"],
                "generated_text_sample": generated_text[:300] + "..." if len(generated_text) > 300 else generated_text,
            })

        except Exception as e:
            logger.error("Generation failed for %s with %s: %s", case["name"], selected_model, e)
            results.append({
                "test_case": case["name"],
                "selected_model": selected_model,
                "model_selection_reason": "Flash-Lite for long content (>600w)" if case["max_words"] > 600 else "Flash for short content (≤600w)",
                "buffer_strategy": {
                    "actual_min_words": case["min_words"],
                    "actual_max_words": case["max_words"],
                    "llm_min_words": word_config["llm_min"],
                    "llm_max_words": word_config["llm_max"],
                    "buffer_applied": word_config["buffer_applied"]
                },
                "error": str(e),
            })

        finally:
            os.environ["GENERATION_MODEL"] = original_model

    logger.info("\n%s", "="*80)
    logger.info("HYBRID + BUFFER STRATEGY SUMMARY")
    logger.info("="*80)

    successful_tests = [r for r in results if "error" not in r]

    if successful_tests:
        avg_utilization = sum(r.get("utilization_percentage", 0) or 0 for r in successful_tests) / len(successful_tests)
        pass_count = sum(1 for r in successful_tests if r["compliance_status"] == "PASS")
        avg_rouge = sum(r["context_rouge_l"] for r in successful_tests) / len(successful_tests)
        avg_generation_time = sum(r["generation_time_seconds"] for r in successful_tests) / len(successful_tests)

        logger.info("Tests completed: %d/%d", len(successful_tests), len(length_test_cases))
        logger.info("Pass rate: %d/%d (%.1f%%)", pass_count, len(successful_tests), pass_count/len(successful_tests)*100)
        logger.info("Average utilization: %.1f%%", avg_utilization)
        logger.info("Average context ROUGE-L: %.3f", avg_rouge)
        logger.info("Average generation time: %.1fs", avg_generation_time)

        logger.info("\nBuffer Strategy Analysis:")
        for result in successful_tests:
            buffer_info = result["buffer_strategy"]
            actual_max = buffer_info["actual_max_words"]
            generated = result["actual_word_count"]
            effectiveness = min(100, (generated / actual_max) * 100)

            logger.info("- %s: %dw vs %dw target = %.1f%% effectiveness", result["test_case"], generated, actual_max, effectiveness)

        logger.info("\nDetailed Results:")
        for result in successful_tests:
            status_emoji = "✅" if result["compliance_status"] == "PASS" else "❌"
            logger.info("%s %s (%s): %d words (Grade %s, %.1f%% utilization, %.1fs)",
                       status_emoji, result["test_case"], result["selected_model"], result["actual_word_count"],
                       result["grade"], result.get("utilization_percentage", 0), result["generation_time_seconds"])

    else:
        logger.error("All tests failed!")

    return results

async def main() -> None:
    logger = setup_logging()
    logger.info("Hybrid LLM + Buffer Strategy Test")

    try:
        results = await test_hybrid_llm_with_buffer_strategy()

        output_dir = Path("../results/llm_length_diagnosis")
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / "hybrid_buffer_strategy_results.json"
        with output_file.open("w") as f:
            json.dump({
                "test_type": "hybrid_llm_with_buffer_strategy",
                "strategy": "Flash for ≤600 words, Flash-Lite for >600 words + 150 word buffer",
                "buffer_explanation": "LLM receives target+150 words instruction, compliance measured against actual target",
                "timestamp": time.time(),
                "results": results,
            }, f, indent=2)

        logger.info("\nResults saved to: %s", output_file)
        logger.info("Hybrid + Buffer strategy test completed!")

    except Exception as e:
        logger.error("Test suite failed: %s", e)
        raise

if __name__ == "__main__":
    asyncio.run(main())
