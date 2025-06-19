from pathlib import Path
from typing import Any, cast

from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.serialization import deserialize
from testing import FIXTURES_FOLDER, TEST_DATA_SOURCES

QUICK_TEST_FILES = TEST_DATA_SOURCES[:3]
QUALITY_TEST_FILES = TEST_DATA_SOURCES[:6]
FULL_TEST_SUITE = TEST_DATA_SOURCES

SMALL_FIXTURE_FILES = [f for f in FIXTURES_FOLDER.glob("**/*.json") if f.stat().st_size < 200000]

MEDIUM_FIXTURE_FILES = [f for f in FIXTURES_FOLDER.glob("**/*.json") if 200000 <= f.stat().st_size < 500000]

LARGE_FIXTURE_FILES = [f for f in FIXTURES_FOLDER.glob("**/*.json") if f.stat().st_size >= 500000]


def get_test_files_by_tier(tier: str) -> list[Path]:
    if tier == "smoke":
        return QUICK_TEST_FILES
    if tier == "quality_assessment":
        return QUALITY_TEST_FILES
    if tier == "e2e_full":
        return FULL_TEST_SUITE
    return TEST_DATA_SOURCES


def get_fixture_files_by_size(size_category: str) -> list[Path]:
    if size_category == "small":
        return SMALL_FIXTURE_FILES
    if size_category == "medium":
        return MEDIUM_FIXTURE_FILES
    if size_category == "large":
        return LARGE_FIXTURE_FILES
    return list(FIXTURES_FOLDER.glob("**/*.json"))


def load_pre_generated_vectors(fixture_file: Path) -> list[VectorDTO]:
    try:
        data = deserialize(fixture_file.read_bytes(), dict[str, Any])

        rag_file_data = data.get("rag_file", {})
        text_vectors = rag_file_data.get("text_vectors", [])

        vectors = []
        for tv in text_vectors:
            vector_dto = cast(
                "VectorDTO",
                {
                    "rag_source_id": tv.get("rag_source_id", ""),
                    "chunk": tv.get("chunk", {"content": ""}),
                    "embedding": tv.get("embedding", []),
                },
            )
            vectors.append(vector_dto)

        return vectors
    except (FileNotFoundError, KeyError, ValueError):
        return []


def get_test_content_summary(file_path: Path) -> dict[str, Any]:
    if not file_path.exists():
        return {"error": "File not found"}

    size_mb = file_path.stat().st_size / (1024 * 1024)

    if file_path.suffix == ".json":
        try:
            vectors = load_pre_generated_vectors(file_path)
            return {
                "file_type": "fixture",
                "size_mb": round(size_mb, 2),
                "vector_count": len(vectors),
                "avg_chunk_length": (sum(len(v["chunk"]["content"]) for v in vectors) / len(vectors) if vectors else 0),
                "embedding_dimension": (len(vectors[0]["embedding"]) if vectors else 0),
            }
        except (FileNotFoundError, ValueError):
            return {"file_type": "json", "size_mb": round(size_mb, 2), "error": "Parse failed"}
    else:
        return {"file_type": "source", "size_mb": round(size_mb, 2), "extension": file_path.suffix}


async def validate_test_data_integrity() -> dict[str, Any]:
    results: dict[str, Any] = {
        "source_files": {"total": len(TEST_DATA_SOURCES), "by_extension": {}, "sizes": []},
        "fixture_files": {
            "total": len(list(FIXTURES_FOLDER.glob("**/*.json"))),
            "small": len(SMALL_FIXTURE_FILES),
            "medium": len(MEDIUM_FIXTURE_FILES),
            "large": len(LARGE_FIXTURE_FILES),
            "vector_counts": [],
        },
        "issues": [],
    }


    for source_file in TEST_DATA_SOURCES:
        if not source_file.exists():
            cast("list[str]", results["issues"]).append(f"Missing source file: {source_file}")
            continue

        ext = source_file.suffix
        cast("dict[str, int]", results["source_files"]["by_extension"])[ext] = cast("dict[str, int]", results["source_files"]["by_extension"]).get(ext, 0) + 1
        cast("list[int]", results["source_files"]["sizes"]).append(source_file.stat().st_size)


    fixture_files = list(FIXTURES_FOLDER.glob("**/*.json"))
    for fixture_file in fixture_files:
        try:
            vectors = load_pre_generated_vectors(fixture_file)
            if vectors:
                cast("list[int]", results["fixture_files"]["vector_counts"]).append(len(vectors))
            else:
                cast("list[str]", results["issues"]).append(f"No vectors in fixture: {fixture_file.name}")
        except (FileNotFoundError, KeyError, ValueError) as e:
            cast("list[str]", results["issues"]).append(f"Error reading fixture {fixture_file.name}: {e}")


    sizes_list = cast("list[int]", results["source_files"]["sizes"])
    if sizes_list:
        cast("dict[str, Any]", results["source_files"])["avg_size_mb"] = (
            sum(sizes_list) / len(sizes_list) / (1024 * 1024)
        )

    vector_counts = cast("list[int]", results["fixture_files"]["vector_counts"])
    if vector_counts:
        cast("dict[str, Any]", results["fixture_files"])["avg_vector_count"] = sum(vector_counts) / len(vector_counts)

    return results


def create_test_scenarios() -> list[dict[str, Any]]:
    return [
        {
            "name": "smoke_basic",
            "description": "Basic smoke tests with minimal data",
            "files": QUICK_TEST_FILES[:2],
            "timeout": 60,
            "markers": ["smoke"],
            "expected_duration": "30-60 seconds",
        },
        {
            "name": "smoke_full",
            "description": "Complete smoke test coverage",
            "files": QUICK_TEST_FILES,
            "timeout": 90,
            "markers": ["smoke"],
            "expected_duration": "60-90 seconds",
        },
        {
            "name": "quality_assessment_basic",
            "description": "Quality assessment with medium dataset",
            "files": QUALITY_TEST_FILES[:3],
            "timeout": 180,
            "markers": ["quality_assessment", "semantic_evaluation"],
            "expected_duration": "2-3 minutes",
        },
        {
            "name": "quality_assessment_full",
            "description": "Comprehensive quality assessment",
            "files": QUALITY_TEST_FILES,
            "timeout": 300,
            "markers": ["quality_assessment", "semantic_evaluation"],
            "expected_duration": "3-5 minutes",
        },
        {
            "name": "ai_evaluation_sample",
            "description": "AI evaluation with sample data",
            "files": QUICK_TEST_FILES[:2],
            "timeout": 240,
            "markers": ["ai_eval"],
            "expected_duration": "3-4 minutes",
        },
        {
            "name": "e2e_full_comprehensive",
            "description": "Complete end-to-end evaluation",
            "files": FULL_TEST_SUITE,
            "timeout": 600,
            "markers": ["e2e_full"],
            "expected_duration": "8-10 minutes",
        },
    ]


async def benchmark_test_performance() -> dict[str, Any]:
    benchmark_results: dict[str, Any] = {"file_sizes": {}, "estimated_processing_times": {}, "recommendations": []}


    for _i, test_file in enumerate(TEST_DATA_SOURCES[:5]):
        size_mb = test_file.stat().st_size / (1024 * 1024)
        benchmark_results["file_sizes"][test_file.name] = size_mb


        estimated_time = size_mb * 12
        benchmark_results["estimated_processing_times"][test_file.name] = estimated_time


    total_size = sum(benchmark_results["file_sizes"].values())
    total_estimated_time = sum(benchmark_results["estimated_processing_times"].values())

    if total_estimated_time > 300:
        benchmark_results["recommendations"].append(
            "Consider using tiered testing approach - full suite may take >5 minutes"
        )

    if total_size > 50:
        benchmark_results["recommendations"].append(
            "Large dataset detected - use session-scoped fixtures for better performance"
        )

    if len(TEST_DATA_SOURCES) > 20:
        benchmark_results["recommendations"].append(
            "Many test files detected - consider parametrized testing with smaller subsets"
        )

    benchmark_results["total_size_mb"] = total_size
    benchmark_results["estimated_total_time_seconds"] = total_estimated_time

    return benchmark_results


def get_optimal_test_configuration(target_duration_minutes: int = 5) -> dict[str, Any]:
    target_seconds = target_duration_minutes * 60

    scenarios = create_test_scenarios()


    suitable_scenarios = []
    for scenario in scenarios:

        duration_str = scenario["expected_duration"]
        if "seconds" in duration_str:
            max_duration = int(duration_str.split("-")[-1].split()[0])
        elif "minutes" in duration_str:
            max_duration = int(duration_str.split("-")[-1].split()[0]) * 60
        else:
            max_duration = scenario["timeout"]

        if max_duration <= target_seconds:
            suitable_scenarios.append({**scenario, "estimated_max_duration": max_duration})

    return {
        "target_duration_minutes": target_duration_minutes,
        "suitable_scenarios": suitable_scenarios,
        "recommendation": (
            suitable_scenarios[-1] if suitable_scenarios else scenarios[0]
        ),
    }
