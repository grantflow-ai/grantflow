#!/usr/bin/env python3

import json
import logging
import statistics
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, ".")

# Import the test functions
from services.rag.tests.e2e.rag_proximity_test import (
    calculate_length_compliance_score,
    calculate_rouge_l,
    calculate_rouge_n,
    parse_word_limit_from_cfp_constraint,
)


def setup_logging():
    """Setup logging for the test runner"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    return logging.getLogger(__name__)

def run_rouge_validation_tests() -> dict[str, Any]:
    """Run ROUGE algorithm validation tests"""
    logger = logging.getLogger(__name__)
    logger.info("Running ROUGE validation tests...")

    test_cases = [
        {
            "name": "identical_texts",
            "ref": "The quick brown fox jumps over the lazy dog",
            "gen": "The quick brown fox jumps over the lazy dog",
        },
        {
            "name": "partial_overlap_melanoma",
            "ref": "melanoma research immunotherapy treatment brain metastases approaches",
            "gen": "novel immunotherapy approaches for melanoma brain metastases treatment development",
        },
        {
            "name": "scientific_terminology",
            "ref": "single cell RNA sequencing tumor microenvironment immune infiltration",
            "gen": "tumor microenvironment analysis using single cell sequencing immune cell infiltration",
        },
        {
            "name": "methodology_overlap",
            "ref": "experimental design data analysis statistical methods hypothesis testing",
            "gen": "statistical analysis experimental methodology hypothesis validation data interpretation",
        },
        {
            "name": "no_overlap",
            "ref": "cancer research methodology experimental design",
            "gen": "artificial intelligence machine learning deep learning",
        }
    ]

    results = []
    for case in test_cases:
        rouge_l = calculate_rouge_l(case["ref"], case["gen"])
        rouge_2 = calculate_rouge_n(case["ref"], case["gen"], n=2)

        results.append({
            "test_case": case["name"],
            "reference": case["ref"],
            "generated": case["gen"],
            "rouge_l": rouge_l,
            "rouge_2": rouge_2,
        })

        logger.info(f"Case '{case['name']}': ROUGE-L={rouge_l:.3f}, ROUGE-2={rouge_2:.3f}")

    return {
        "validation_type": "rouge_algorithm_validation",
        "test_cases": results,
        "timestamp": datetime.now(UTC).isoformat(),
    }

def run_length_compliance_tests() -> dict[str, Any]:
    """Run length compliance parsing and scoring tests"""
    logger = logging.getLogger(__name__)
    logger.info("Running length compliance tests...")

    # Test CFP constraint parsing
    constraint_test_cases = [
        "Maximum 500 words",           # This was failing - should now work
        "500 words maximum",
        "Up to 1000 words",
        "No more than 750 words",
        "250-500 words",
        "Minimum 300 words",           # Test the new minimum pattern too
        "At least 200 words",
        "Between 400-800 words range",
        "Max 800 words",               # Additional test cases
        "Min 200 words",
    ]

    parsing_results = []
    for constraint in constraint_test_cases:
        parsed = parse_word_limit_from_cfp_constraint(constraint)
        parsing_results.append({
            "constraint_text": constraint,
            "parsed_min_words": parsed["min_words"],
            "parsed_max_words": parsed["max_words"],
        })
        logger.info(f"Constraint '{constraint}' -> min={parsed['min_words']}, max={parsed['max_words']}")

    # Test compliance scoring
    compliance_test_cases = [
        {"actual": 450, "min": None, "max": 500, "expected_grade": "A"},  # 90% utilization
        {"actual": 350, "min": None, "max": 500, "expected_grade": "B"},  # 70% utilization
        {"actual": 250, "min": None, "max": 500, "expected_grade": "F"},  # 50% utilization - too low
        {"actual": 520, "min": None, "max": 500, "expected_grade": "F"},  # Over limit
        {"actual": 150, "min": 200, "max": 400, "expected_grade": "F"},  # Below minimum
        {"actual": 320, "min": 200, "max": 400, "expected_grade": "A"},  # 80% utilization
    ]

    compliance_results = []
    for case in compliance_test_cases:
        score = calculate_length_compliance_score(
            actual_word_count=case["actual"],
            min_words=case["min"],
            max_words=case["max"]
        )

        compliance_results.append({
            "test_scenario": f"{case['actual']} words (min={case['min']}, max={case['max']})",
            "actual_word_count": case["actual"],
            "min_words": case["min"],
            "max_words": case["max"],
            "expected_grade": case["expected_grade"],
            "actual_grade": score["grade"],
            "compliance_status": score["compliance_status"],
            "compliance_percentage": score["compliance_percentage"],
            "issues": score["issues"],
            "matches_expected": score["grade"] == case["expected_grade"]
        })

        match_status = "✅" if score["grade"] == case["expected_grade"] else "❌"
        logger.info(f"{match_status} {case['actual']} words -> Grade {score['grade']} (expected {case['expected_grade']})")

    return {
        "validation_type": "length_compliance_validation",
        "constraint_parsing_tests": parsing_results,
        "compliance_scoring_tests": compliance_results,
        "timestamp": datetime.now(UTC).isoformat(),
    }

def simulate_rag_pipeline_tests(iteration: int) -> dict[str, Any]:
    """Simulate RAG pipeline tests with realistic variations"""
    logger = logging.getLogger(__name__)
    logger.info(f"Running RAG pipeline simulation - Iteration {iteration}")

    # Simulate section requirements (consistent across iterations)
    section_requirements = """
    Section: Research Strategy
    Instructions: Describe methodology and analyses for specific aims
    Keywords: methodology experimental design data analysis melanoma immunotherapy
    Search Context: melanoma research methodology experimental design protocols single cell analysis
    CFP Requirements: Maximum 1200 words, include hypothesis methodology and expected outcomes
    """

    # Simulate different RAG retrieval results (varies by iteration to show real-world variance)
    rag_retrievals = [
        # Iteration 1 - High relevance
        """Advanced single-cell RNA sequencing methodology for melanoma tumor microenvironment analysis.
        ZMAN-seq temporal tracking protocols for immune cell dynamics in brain metastases.
        PIC-seq cell-cell interaction measurement techniques for tumor-immune interactions.
        Anti-TREM2 immunocytokine design methodology combining targeted antibodies with cytokines.
        Spatial transcriptomics analysis using Stereo-seq for melanoma brain metastasis research.""",

        # Iteration 2 - Medium-high relevance
        """Melanoma immunotherapy approaches using CAR-T cell engineering protocols.
        Single-cell sequencing analysis for tumor immune infiltration patterns.
        Brain metastases treatment strategies with checkpoint inhibitor combinations.
        Experimental design principles for cancer immunotherapy clinical trials.
        Data analysis workflows for multi-omics melanoma research studies.""",

        # Iteration 3 - Medium relevance
        """Cancer research experimental methodology and statistical analysis frameworks.
        Immunotherapy treatment protocols for solid tumor malignancies including melanoma.
        Clinical trial design considerations for oncology research applications.
        Data collection and analysis strategies for translational research studies.
        Laboratory protocols for immune cell characterization and functional assays.""",

        # Iteration 4 - High relevance (different focus)
        """TREM2-targeted immunocytokine development for brain metastases treatment.
        Novel cytokine screening methodologies in immunocompetent melanoma models.
        Fusion protein design approaches for tumor-specific immunomodulation.
        In-vitro validation protocols for immunocytokine binding and efficacy.
        Preclinical testing frameworks for melanoma brain metastases therapeutics.""",

        # Iteration 5 - Medium relevance
        """General cancer immunotherapy research methodologies and experimental approaches.
        Tumor microenvironment characterization using standard molecular biology techniques.
        Clinical research design principles for oncology studies and patient recruitment.
        Laboratory safety protocols and quality control measures for cancer research.
        Grant application writing guidelines for NIH and NSF funding opportunities.""",
    ]

    # Simulate generated text (varies based on RAG quality)
    generated_texts = [
        # Iteration 1 - High quality generation
        """Our research strategy employs cutting-edge single-cell RNA sequencing methodologies, specifically ZMAN-seq
        temporal tracking and PIC-seq cell-cell interaction analysis, to comprehensively characterize the melanoma brain
        metastases tumor microenvironment. We will implement anti-TREM2 immunocytokine design protocols to develop novel
        therapeutic approaches targeting immunosuppressive macrophages while simultaneously activating T and NK cell responses.
        Spatial transcriptomics using Stereo-seq will provide detailed mapping of immune cell distributions and interactions
        within the brain metastatic niche. This integrated approach combines advanced single-cell technologies with innovative
        immunocytokine engineering to address the critical challenge of immunotherapy resistance in melanoma brain metastases.""",

        # Iteration 2 - Good quality generation
        """Our research methodology incorporates single-cell sequencing analysis to investigate tumor immune infiltration
        patterns in melanoma brain metastases. We will utilize CAR-T cell engineering protocols adapted for brain-penetrating
        immunotherapies and implement checkpoint inhibitor combination strategies. The experimental design follows established
        clinical trial principles for cancer immunotherapy research, with comprehensive data analysis workflows for multi-omics
        integration. Our approach addresses the unique challenges of brain metastases treatment through targeted immunomodulation
        and systematic characterization of therapeutic responses in preclinical models.""",

        # Iteration 3 - Moderate quality generation
        """Our research strategy follows standard cancer research experimental methodology combined with statistical analysis
        frameworks appropriate for oncology studies. We will implement immunotherapy treatment protocols for melanoma with
        emphasis on solid tumor treatment approaches. The clinical trial design incorporates established considerations for
        translational research applications. Data collection and analysis strategies will utilize proven approaches for immune
        cell characterization and functional assays. This methodology ensures rigorous scientific evaluation of treatment
        efficacy while maintaining compliance with regulatory requirements.""",

        # Iteration 4 - High quality (different angle)
        """Our research strategy centers on TREM2-targeted immunocytokine development specifically designed for melanoma brain
        metastases treatment. We will implement novel cytokine screening methodologies in immunocompetent models to identify
        optimal therapeutic combinations. Fusion protein design approaches will focus on tumor-specific immunomodulation while
        minimizing off-target effects. In-vitro validation protocols will assess immunocytokine binding specificity and
        therapeutic efficacy. The preclinical testing framework ensures comprehensive evaluation of safety and efficacy before
        clinical translation for melanoma brain metastases therapeutics.""",

        # Iteration 5 - Lower quality generation
        """Our research approach utilizes general cancer immunotherapy methodologies adapted for melanoma studies. We will
        employ tumor microenvironment characterization using standard molecular biology techniques and established laboratory
        protocols. The clinical research design follows conventional principles for oncology patient recruitment and data
        collection. Quality control measures ensure compliance with standard laboratory safety protocols. This methodology
        provides a foundation for grant application development following NIH and NSF funding guidelines while addressing
        basic research questions in cancer immunotherapy.""",
    ]

    # Use the iteration to select appropriate content
    rag_retrieval = rag_retrievals[iteration - 1]
    generated_text = generated_texts[iteration - 1]

    # Calculate ROUGE scores
    section_to_rag_rouge_l = calculate_rouge_l(section_requirements, rag_retrieval)
    section_to_rag_rouge_2 = calculate_rouge_n(section_requirements, rag_retrieval, n=2)

    rag_to_writing_rouge_l = calculate_rouge_l(rag_retrieval, generated_text)
    rag_to_writing_rouge_2 = calculate_rouge_n(rag_retrieval, generated_text, n=2)

    section_to_writing_rouge_l = calculate_rouge_l(section_requirements, generated_text)
    section_to_writing_rouge_2 = calculate_rouge_n(section_requirements, generated_text, n=2)

    # Calculate information flow score
    information_flow_score = (
        section_to_rag_rouge_l * 0.25 +
        rag_to_writing_rouge_l * 0.35 +
        section_to_writing_rouge_l * 0.40
    )

    # Calculate length compliance
    actual_word_count = len(generated_text.split())
    length_compliance = calculate_length_compliance_score(
        actual_word_count=actual_word_count,
        min_words=None,  # No minimum specified in this test
        max_words=1200,  # CFP requirement
    )

    logger.info(f"Iteration {iteration} - ROUGE-L: Req→RAG={section_to_rag_rouge_l:.3f}, RAG→Text={rag_to_writing_rouge_l:.3f}, Req→Text={section_to_writing_rouge_l:.3f}")
    logger.info(f"Iteration {iteration} - Length: {actual_word_count} words, Grade {length_compliance['grade']}")

    return {
        "iteration": iteration,
        "section_requirements_length": len(section_requirements.split()),
        "retrieved_content_length": len(rag_retrieval.split()),
        "generated_text_length": len(generated_text.split()),
        "rouge_scores": {
            "section_to_rag_rouge_l": section_to_rag_rouge_l,
            "section_to_rag_rouge_2": section_to_rag_rouge_2,
            "rag_to_writing_rouge_l": rag_to_writing_rouge_l,
            "rag_to_writing_rouge_2": rag_to_writing_rouge_2,
            "section_to_writing_rouge_l": section_to_writing_rouge_l,
            "section_to_writing_rouge_2": section_to_writing_rouge_2,
        },
        "information_flow_score": information_flow_score,
        "length_compliance": {
            "actual_word_count": actual_word_count,
            "max_words": 1200,
            "compliance_status": length_compliance["compliance_status"],
            "grade": length_compliance["grade"],
            "compliance_percentage": length_compliance["compliance_percentage"],
            "utilization_percentage": length_compliance.get("utilization_percentage"),
            "issues": length_compliance["issues"],
        },
        "content_samples": {
            "section_requirements": section_requirements[:200] + "...",
            "retrieved_content": rag_retrieval[:200] + "...",
            "generated_text": generated_text[:200] + "...",
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

def calculate_statistics(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate statistical summary of test results"""
    logger = logging.getLogger(__name__)
    logger.info("Calculating statistical summary...")

    # Extract ROUGE scores for statistics
    section_to_rag_rouge_l = [r["rouge_scores"]["section_to_rag_rouge_l"] for r in results]
    rag_to_writing_rouge_l = [r["rouge_scores"]["rag_to_writing_rouge_l"] for r in results]
    section_to_writing_rouge_l = [r["rouge_scores"]["section_to_writing_rouge_l"] for r in results]
    information_flow_scores = [r["information_flow_score"] for r in results]

    # Extract length compliance data
    word_counts = [r["length_compliance"]["actual_word_count"] for r in results]
    compliance_percentages = [r["length_compliance"]["compliance_percentage"] for r in results]
    utilization_percentages = [r["length_compliance"].get("utilization_percentage", 0) or 0 for r in results]

    # Grade distribution
    grades = [r["length_compliance"]["grade"] for r in results]
    grade_counts = {"A": grades.count("A"), "B": grades.count("B"), "F": grades.count("F")}

    # Compliance status distribution
    statuses = [r["length_compliance"]["compliance_status"] for r in results]
    status_counts = {"PASS": statuses.count("PASS"), "FAIL": statuses.count("FAIL")}

    def calc_stats(values):
        if not values:
            return {"mean": 0, "std_dev": 0, "min": 0, "max": 0}
        return {
            "mean": statistics.mean(values),
            "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
            "min": min(values),
            "max": max(values)
        }

    return {
        "test_summary": {
            "total_iterations": len(results),
            "test_date": datetime.now(UTC).isoformat(),
        },
        "rouge_statistics": {
            "section_to_rag_rouge_l": calc_stats(section_to_rag_rouge_l),
            "rag_to_writing_rouge_l": calc_stats(rag_to_writing_rouge_l),
            "section_to_writing_rouge_l": calc_stats(section_to_writing_rouge_l),
            "information_flow_score": calc_stats(information_flow_scores),
        },
        "length_statistics": {
            "word_counts": calc_stats(word_counts),
            "compliance_percentages": calc_stats(compliance_percentages),
            "utilization_percentages": calc_stats(utilization_percentages),
            "grade_distribution": grade_counts,
            "compliance_status_distribution": status_counts,
        },
        "quality_assessment": {
            "avg_rouge_l_end_to_end": statistics.mean(section_to_writing_rouge_l),
            "avg_information_flow": statistics.mean(information_flow_scores),
            "avg_length_compliance": statistics.mean(compliance_percentages),
            "pass_rate": status_counts["PASS"] / len(results) * 100,
            "grade_a_rate": grade_counts["A"] / len(results) * 100,
        }
    }

def main():
    """Main test runner"""
    logger = setup_logging()
    logger.info("🔍 Starting 5-iteration ROUGE and Length Compliance Test Suite")

    # Create results directory
    results_dir = Path("testing/results/5_iteration_analysis")
    results_dir.mkdir(parents=True, exist_ok=True)

    # Run validation tests once
    logger.info("=" * 60)
    rouge_validation = run_rouge_validation_tests()

    logger.info("=" * 60)
    length_validation = run_length_compliance_tests()

    # Run RAG pipeline simulation 5 times
    logger.info("=" * 60)
    logger.info("Running RAG Pipeline Simulations (5 iterations)")

    pipeline_results = []
    for i in range(1, 6):
        logger.info(f"\n--- Iteration {i}/5 ---")
        result = simulate_rag_pipeline_tests(i)
        pipeline_results.append(result)
        time.sleep(0.5)  # Brief pause between iterations

    # Calculate statistics
    logger.info("=" * 60)
    statistics_summary = calculate_statistics(pipeline_results)

    # Combine all results
    comprehensive_results = {
        "test_suite": "5_iteration_rouge_and_length_analysis",
        "rouge_algorithm_validation": rouge_validation,
        "length_compliance_validation": length_validation,
        "rag_pipeline_iterations": pipeline_results,
        "statistical_summary": statistics_summary,
        "test_metadata": {
            "total_test_duration": "Multiple iterations",
            "test_environment": "Simulated RAG Pipeline",
            "test_framework": "Custom ROUGE and Length Analysis",
            "timestamp": datetime.now(UTC).isoformat(),
        }
    }

    # Save results
    output_file = results_dir / "comprehensive_5_iteration_results.json"
    with open(output_file, "w") as f:
        json.dump(comprehensive_results, f, indent=2)

    # Print summary
    logger.info("=" * 60)
    logger.info("🎯 TEST SUITE SUMMARY")
    logger.info("=" * 60)

    stats = statistics_summary["quality_assessment"]
    logger.info(f"Average End-to-End ROUGE-L Score: {stats['avg_rouge_l_end_to_end']:.3f}")
    logger.info(f"Average Information Flow Score: {stats['avg_information_flow']:.3f}")
    logger.info(f"Average Length Compliance: {stats['avg_length_compliance']:.1f}%")
    logger.info(f"Overall Pass Rate: {stats['pass_rate']:.1f}%")
    logger.info(f"Grade A Rate: {stats['grade_a_rate']:.1f}%")

    logger.info(f"\n📊 Results saved to: {output_file}")
    logger.info("✅ 5-iteration test suite completed successfully!")

    return comprehensive_results

if __name__ == "__main__":
    results = main()
