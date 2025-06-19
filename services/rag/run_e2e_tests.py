#!/usr/bin/env python3
"""Script to run RAG e2e tests one by one for debugging."""

import contextlib
import subprocess
import sys
from datetime import datetime
from pathlib import Path

test_files = {
    "test_rag_evaluation.py": [
        "test_retrieval_smoke",
        "test_retrieval_quality_assessment",
        "test_retrieval_semantic_evaluation",
        "test_query_generation_quality",
        "test_cfp_extraction_quality",
        "test_grant_template_generation_full_pipeline",
    ],
    "retrieval_test.py": [
        "test_document_retrieval",
    ],
    "search_queries_test.py": [
        "test_generate_search_queries",
    ],
    "extract_cfp_data_multi_source_test.py": [
        "test_extract_cfp_data_multi_source",
    ],
    "extract_sections_test.py": [
        "test_extract_sections",
    ],
    "generate_grant_template_test.py": [
        "test_generate_grant_template",
    ],
    "application_generation_test.py": [
        "test_generate_full_application_text",
    ],
}

def run_test(test_file: str, test_function: str) -> tuple[bool, str, float]:
    """Run a single test and return success status, output, and duration."""
    start_time = datetime.now()

    cmd = [
        "uv", "run", "pytest",
        f"services/rag/tests/e2e/{test_file}::{test_function}",
        "-v", "-s", "--tb=short"
    ]

    env = {
        "E2E_TESTS": "1",
        "PYTHONPATH": ".",
    }


    try:
        result = subprocess.run(
            cmd,
            check=False, capture_output=True,
            text=True,
            env={**subprocess.os.environ, **env},
            cwd=Path(__file__).parent.parent.parent.parent,
            timeout=900,
        )

        duration = (datetime.now() - start_time).total_seconds()
        success = result.returncode == 0

        if success:
            pass
        else:
            pass

        return success, result.stdout + "\n" + result.stderr, duration

    except subprocess.TimeoutExpired:
        duration = (datetime.now() - start_time).total_seconds()
        error_msg = f"Test timed out after {duration:.2f}s"

        with contextlib.suppress(Exception):
            subprocess.run(["pkill", "-f", f"{test_file}::{test_function}"], check=False, capture_output=True)
        return False, error_msg, duration
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds()
        error_msg = f"Exception running test: {e!s}"
        return False, error_msg, duration


def main() -> int:
    """Run all e2e tests one by one."""

    results = []
    total_start = datetime.now()

    for test_file, test_functions in test_files.items():
        for test_function in test_functions:
            success, output, duration = run_test(test_file, test_function)
            results.append({
                "file": test_file,
                "function": test_function,
                "success": success,
                "duration": duration,
                "output": output,
            })

    (datetime.now() - total_start).total_seconds()



    passed = sum(1 for r in results if r["success"])
    failed = len(results) - passed



    for result in results:
        f"{result['file']}::{result['function']}"
        "✅ PASS" if result["success"] else "❌ FAIL"
        duration = f"{result['duration']:.2f}s"


    results_file = Path(__file__).parent / f"e2e_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(results_file, "w") as f:
        f.write(f"RAG E2E Test Results - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 80 + "\n\n")

        for result in results:
            f.write(f"\nTest: {result['file']}::{result['function']}\n")
            f.write(f"Status: {'PASSED' if result['success'] else 'FAILED'}\n")
            f.write(f"Duration: {result['duration']:.2f}s\n")
            if not result["success"]:
                f.write(f"\nOutput:\n{result['output']}\n")
            f.write("-" * 80 + "\n")


    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
