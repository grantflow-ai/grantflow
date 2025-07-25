#!/usr/bin/env python3
"""
Script to run the configurable RAG quality benchmark with extended timeout.
This allows the test to complete all three models (MiniLM, SciBERT, MPNet).
"""

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    # Set up environment
    os.environ["PYTHONPATH"] = "."
    os.environ["BENCHMARK_TESTS"] = "1"

    # Change to the correct directory
    repo_root = Path(__file__).parent
    os.chdir(repo_root)

    # Run the test with extended timeout
    cmd = [
        "uv",
        "run",
        "python",
        "-m",
        "pytest",
        "services/rag/tests/vector_benchmarks/configurable_rag_quality_test.py::test_configurable_rag_quality_benchmark",
        "-xvs",
        "--timeout=7200",  # 2 hours
    ]

    try:
        result = subprocess.run(cmd, check=False, timeout=7200, capture_output=False)  # noqa: S603
        return result.returncode
    except subprocess.TimeoutExpired:
        return 1
    except KeyboardInterrupt:
        return 1


if __name__ == "__main__":
    sys.exit(main())
