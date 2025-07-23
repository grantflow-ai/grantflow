"""
Configurable RAG Quality Benchmark Test

This test uses the RAG pipeline to provide retrieval quality metrics:
- retrieve_documents() for actual document retrieval
- evaluate_retrieval_relevance() for AI-powered quality assessment
- Search queries and semantic similarity evaluation
- Production-grade performance and quality analysis

"""
# mypy: ignore-errors

import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
import yaml
from packages.shared_utils.src.dto import VectorDTO
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER, RESULTS_FOLDER
from testing.benchmark_utils import benchmark_vector
from testing.rag_ai_evaluation import evaluate_retrieval_relevance
from testing.rag_evaluation import save_evaluation_results

from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries
from services.rag.tests.e2e.conftest import create_and_index_rag_source

from .framework import VectorBenchmarkFramework
from .synthetic_migrations import VectorTableModifier


@pytest.fixture
def rag_quality_configurations() -> dict[str, dict[str, Any]]:
    """Load chunking configurations from YAML file."""
    config_path = Path(__file__).parent / "chunking_configs.yaml"
    with config_path.open() as file:
        config_data = yaml.safe_load(file)
    return config_data["configurations"]


@pytest.fixture
def rag_quality_results_dir() -> Path:
    """Create results directory for configurable RAG quality benchmarks."""
    results_dir = RESULTS_FOLDER / "configurable_rag_quality_benchmarks"
    results_dir.mkdir(parents=True, exist_ok=True)
    return results_dir


@pytest.fixture
def cfp_content() -> str:
    """Load CFP content for RAG testing."""
    cfp_file_path = FIXTURES_FOLDER / "cfps" / "melanoma_alliance.md"
    return cfp_file_path.read_text()


@pytest.fixture
async def cleanup_rag_test_data(async_session_maker: async_sessionmaker[Any]) -> Any:
    """Cleanup RAG test data after configurable tests."""
    from packages.db.src.tables import GrantApplicationRagSource, RagFile, RagSource, TextVector
    from sqlalchemy import delete, select

    async def _cleanup(application_id: str, test_filename: str) -> None:
        async with async_session_maker() as session:
            # Clean up grant application RAG sources
            await session.execute(
                delete(GrantApplicationRagSource).where(
                    GrantApplicationRagSource.grant_application_id == application_id
                )
            )

            # Find and delete associated RAG sources
            existing_source_ids = list(
                await session.scalars(select(RagFile.id).where(RagFile.filename == test_filename))
            )

            if existing_source_ids:
                # Delete vectors first (foreign key dependency)
                await session.execute(delete(TextVector).where(TextVector.rag_source_id.in_(existing_source_ids)))
                # Then delete RAG sources
                await session.execute(delete(RagSource).where(RagSource.id.in_(existing_source_ids)))

            await session.commit()

    return _cleanup


@benchmark_vector(timeout=1800)  # 30 minutes for RAG pipeline testing
async def test_configurable_rag_quality_benchmark(
    async_session_maker: async_sessionmaker[Any],
    cfp_content: str,
    rag_quality_results_dir: Path,
    rag_quality_configurations: dict[str, Any],
    cleanup_rag_test_data: Any,
    grant_application: Any,
    logger: Any,
) -> None:
    """
    Configurable RAG quality benchmark using the production pipeline.

    This test:
    1. Uses actual retrieve_documents() function for retrieval
    2. Employs evaluate_retrieval_relevance() for AI-powered quality assessment
    3. Tests all 4 configurations with performance and quality metrics
    4. Generates production-grade comparison reports
    5. Provides authentic RAG pipeline evaluation (not simplified metrics)
    """
    configurations = rag_quality_configurations
    test_id = f"configurable_rag_quality_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

    logger.info(
        "🚀 Starting RAG pipeline quality benchmark",
        configurations=list(configurations.keys()),
        total_configs=len(configurations),
    )

    all_results = []

    # Clear HF authentication to avoid auth issues
    import os

    if "HF_TOKEN" in os.environ:
        del os.environ["HF_TOKEN"]
        logger.info("Cleared HF_TOKEN for public model access")
    if "HUGGINGFACE_HUB_TOKEN" in os.environ:
        del os.environ["HUGGINGFACE_HUB_TOKEN"]
        logger.info("Cleared HUGGINGFACE_HUB_TOKEN for public model access")

    # Scientific queries for RAG evaluation
    scientific_queries = [
        "CAR-T cell therapy melanoma brain metastases CD8+ T cells immunosuppression",
        "TREM2 macrophages tumor microenvironment immune checkpoint inhibitors",
        "single cell RNA sequencing spatial transcriptomics stereo-seq analysis",
        "immunocytokines antibody-cytokine fusion proteins cancer immunotherapy",
        "brain metastases blood-brain barrier immunotherapy resistance mechanisms",
    ]

    # Test each configuration with the RAG pipeline
    for config_name, config in configurations.items():
        logger.info("🧪 Testing configuration with RAG pipeline", config=config_name)

        # Validate configuration has required fields
        required_fields = ["description", "chunking", "embedding"]
        for field in required_fields:
            assert field in config, f"Missing required field '{field}' in configuration {config_name}"

        # 1. Set up vector dimension using synthetic migrations
        embedding_dim = config["embedding"]["dimension"]
        embedding_model = config["embedding"]["model"]

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(embedding_dim)
            logger.info("Modified vector dimension for RAG testing", dimension=embedding_dim, config=config_name)

        # 2. Create and index content using production RAG pipeline
        test_filename = f"rag_quality_{config_name}_{test_id}.md"
        await cleanup_rag_test_data(str(grant_application.id), test_filename)

        logger.info("📄 Creating RAG source with indexing pipeline")

        # CRITICAL: Reset vector table dimension for this model before indexing
        # This ensures the production pipeline can insert vectors of the correct dimension
        logger.info(
            "🔧 Ensuring vector table matches embedding dimension before indexing",
            embedding_dim=embedding_dim,
            model=embedding_model,
        )

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(embedding_dim)
            logger.info("✅ Vector table dimension updated for production indexing", dimension=embedding_dim)

        # Use the production indexing pipeline
        chunking_params = config["chunking"]
        source_id, vectors, extracted_text = await create_and_index_rag_source(
            content=cfp_content,
            filename=test_filename,
            session_maker=async_session_maker,
            application_id=str(grant_application.id),
            logger=logger,
            max_chars=chunking_params["max_chars"],
            overlap_chars=chunking_params["overlap"],
            model_name=embedding_model,
        )

        logger.info(
            "✅ Successfully indexed content with production pipeline",
            vectors_created=len(vectors),
            source_id=source_id,
            config=config_name,
        )

        # 3. Run performance benchmarks on the vectors
        framework = VectorBenchmarkFramework(async_session_maker)

        # Convert VectorDTO to format expected by framework
        framework_vectors: list[VectorDTO] = []
        for vector_dto in vectors[:100]:  # Use subset for performance testing
            framework_vector = VectorDTO(
                chunk=vector_dto["chunk"],
                embedding=vector_dto["embedding"],
                rag_source_id=vector_dto["rag_source_id"],
            )
            framework_vectors.append(framework_vector)

        # Benchmark vector operations
        insertion_result = await framework.benchmark_vector_insertion(
            framework_vectors, test_name=f"{config_name}_rag_quality_insertion"
        )

        # Generate query vectors for search benchmark
        query_vectors = []
        for _i, query in enumerate(scientific_queries[:5]):
            # Use embedding model to generate query vectors
            from packages.shared_utils.src.embeddings import generate_embeddings

            query_embeddings = await generate_embeddings([query], model_name=embedding_model)
            query_vectors.extend(query_embeddings)

        search_result = await framework.benchmark_similarity_search(
            query_vectors, k=10, test_name=f"{config_name}_rag_quality_search"
        )

        logger.info(
            "📊 Performance benchmarks completed",
            insertion_throughput=insertion_result.throughput,
            search_throughput=search_result.throughput,
            config=config_name,
        )

        # 4. **RAG PIPELINE QUALITY EVALUATION**
        logger.info("🤖 Starting RAG pipeline quality evaluation with AI assessment")

        rag_quality_results = []
        total_retrieval_time = 0.0

        for query_idx, scientific_query in enumerate(scientific_queries):
            logger.info("🔍 Testing RAG retrieval", query=scientific_query[:50] + "...", config=config_name)

            # Generate search queries using production pipeline
            retrieval_start = time.time()
            search_queries = await handle_create_search_queries(user_prompt=scientific_query)

            # **RETRIEVAL** using production retrieve_documents()
            retrieved_docs = await retrieve_documents(
                rerank=True,
                application_id=str(grant_application.id),
                task_description=scientific_query,
                search_queries=search_queries[:3],  # Use top 3 queries for efficiency
            )
            retrieval_time = time.time() - retrieval_start
            total_retrieval_time += retrieval_time

            logger.info(
                "📚 Retrieved documents",
                count=len(retrieved_docs),
                retrieval_time=f"{retrieval_time:.2f}s",
                query_idx=query_idx + 1,
                config=config_name,
            )

            # **AI EVALUATION** using production evaluate_retrieval_relevance()
            if retrieved_docs:
                logger.info("🧠 Running AI-powered retrieval relevance evaluation")
                ai_evaluation = await evaluate_retrieval_relevance(scientific_query, retrieved_docs)

                logger.info(
                    "✅ AI evaluation completed",
                    relevance_score=ai_evaluation.get("avg_relevance", 0.0),
                    query_idx=query_idx + 1,
                    config=config_name,
                )
            else:
                logger.warning("⚠️ No documents retrieved for query", query_idx=query_idx + 1)
                ai_evaluation = {"avg_relevance": 0.0, "error": "No documents retrieved"}

            # Store individual query results
            query_result = {
                "query": scientific_query,
                "query_index": query_idx,
                "retrieved_count": len(retrieved_docs),
                "retrieval_time_seconds": round(retrieval_time, 3),
                "ai_evaluation": ai_evaluation,
                "relevance_score": ai_evaluation.get("avg_relevance", 0.0),
                "search_queries_generated": len(search_queries),
            }
            rag_quality_results.append(query_result)

        # Calculate aggregate RAG quality metrics
        avg_relevance = (
            sum(r["relevance_score"] for r in rag_quality_results) / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )
        avg_retrieval_time = total_retrieval_time / len(scientific_queries) if scientific_queries else 0.0
        total_docs_retrieved = sum(r["retrieved_count"] for r in rag_quality_results)
        successful_retrievals = sum(1 for r in rag_quality_results if r["retrieved_count"] > 0)

        # Analyze chunk characteristics from indexed content
        chunk_sizes = [len(vector_dto["chunk"]["content"]) for vector_dto in vectors]
        chunk_metrics = {
            "chunk_count": len(vectors),
            "avg_chunk_size": sum(chunk_sizes) // len(chunk_sizes) if chunk_sizes else 0,
            "min_chunk_size": min(chunk_sizes) if chunk_sizes else 0,
            "max_chunk_size": max(chunk_sizes) if chunk_sizes else 0,
            "total_content_length": sum(chunk_sizes),
            "coverage_ratio": sum(chunk_sizes) / len(cfp_content) if cfp_content else 0,
            "chunk_size_std": calculate_std_dev(chunk_sizes),
        }

        # 5. Compile results with RAG metrics
        result = {
            "test_id": f"{test_id}_{config_name}",
            "timestamp": datetime.now(UTC).isoformat(),
            "test_type": "configurable_rag_quality_pipeline",
            "configuration": {
                "name": config_name,
                "description": config["description"],
                "chunking": chunking_params,
                "embedding": config["embedding"],
            },
            "performance_metrics": {
                "indexing_pipeline": {
                    "vectors_created": len(vectors),
                    "extracted_text_length": len(extracted_text),
                    "source_id": source_id,
                },
                "insertion_benchmark": {
                    "throughput_vectors_per_sec": insertion_result.throughput,
                    "execution_time_ms": insertion_result.execution_time_ms,
                    "memory_usage_mb": insertion_result.memory_usage_mb,
                },
                "search_benchmark": {
                    "throughput_queries_per_sec": search_result.throughput,
                    "execution_time_ms": search_result.execution_time_ms,
                    "memory_usage_mb": search_result.memory_usage_mb,
                },
                "total_memory_mb": insertion_result.memory_usage_mb + search_result.memory_usage_mb,
            },
            "chunking_analysis": chunk_metrics,
            "rag_quality_evaluation": {
                "evaluation_method": "RAG pipeline with AI assessment",
                "queries_tested": len(scientific_queries),
                "total_retrieval_time_seconds": round(total_retrieval_time, 2),
                "avg_retrieval_time_seconds": round(avg_retrieval_time, 2),
                "total_documents_retrieved": total_docs_retrieved,
                "successful_retrievals": successful_retrievals,
                "retrieval_success_rate": successful_retrievals / len(scientific_queries)
                if scientific_queries
                else 0.0,
                "avg_relevance_score": round(avg_relevance, 3),
                "individual_query_results": rag_quality_results,
            },
        }

        all_results.append(result)

        # Save individual configuration result
        individual_path = rag_quality_results_dir / f"individual_{config_name}_{test_id}.json"
        save_evaluation_results(result, individual_path)

        logger.info(
            "🎯 RAG pipeline configuration completed successfully!",
            config=config_name,
            chunk_count=chunk_metrics["chunk_count"],
            avg_chunk_size=chunk_metrics["avg_chunk_size"],
            insertion_throughput=f"{insertion_result.throughput:.1f}",
            search_throughput=f"{search_result.throughput:.1f}",
            avg_relevance=avg_relevance,
            successful_retrievals=successful_retrievals,
            total_memory=f"{float(result['performance_metrics']['total_memory_mb']):.1f}MB",
        )

    # 6. Generate configurable analysis with RAG metrics
    configurable_analysis = generate_rag_quality_analysis(all_results, configurations)

    # Save configurable report
    report_path = rag_quality_results_dir / f"configurable_rag_quality_report_{test_id}.json"
    save_evaluation_results(configurable_analysis, report_path)

    # Print configurable summary
    print_rag_quality_summary(configurable_analysis)

    logger.info(
        "🏆 configurable RAG QUALITY BENCHMARK COMPLETED!",
        configurations_tested=len(all_results),
        report_path=str(report_path),
        analysis_type="RAG pipeline with AI evaluation",
    )

    # Assertions for production-grade results
    for result in all_results:
        config_name: str = result["configuration"]["name"]  # type: ignore[assignment]
        insertion_throughput: float = result["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"]  # type: ignore[assignment]
        search_throughput: float = result["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"]  # type: ignore[assignment]
        avg_relevance: float = result["rag_quality_evaluation"]["avg_relevance_score"]  # type: ignore[assignment]
        success_rate: float = result["rag_quality_evaluation"]["retrieval_success_rate"]  # type: ignore[assignment]

        # Performance assertions
        assert insertion_throughput > 1, f"Low insertion throughput for {config_name}: {insertion_throughput}"
        assert search_throughput > 0.1, f"Low search throughput for {config_name}: {search_throughput}"
        assert result["chunking_analysis"]["chunk_count"] > 0, f"No chunks generated for {config_name}"

        # RAG quality assertions
        assert success_rate >= 0.5, f"Low retrieval success rate for {config_name}: {success_rate}"
        assert avg_relevance >= 0, f"Invalid relevance score for {config_name}: {avg_relevance}"

        logger.info("✅ All assertions passed for config", config=config_name)


def calculate_std_dev(values: list[int]) -> float:
    """Calculate standard deviation of chunk sizes."""
    if not values:
        return 0.0

    mean = float(sum(values)) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    return float(variance**0.5)


def generate_rag_quality_analysis(
    results: list[dict[str, Any]], configurations: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Generate configurable analysis with RAG quality metrics."""

    # Extract results by configuration name
    configs = {result["configuration"]["name"]: result for result in results}

    # Find performance winners
    best_insertion = max(
        results, key=lambda r: r["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"]
    )
    best_search = max(results, key=lambda r: r["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"])
    most_memory_efficient = min(results, key=lambda r: r["performance_metrics"]["total_memory_mb"])

    # Find RAG quality winners
    best_relevance = max(results, key=lambda r: r["rag_quality_evaluation"]["avg_relevance_score"])
    best_success_rate = max(results, key=lambda r: r["rag_quality_evaluation"]["retrieval_success_rate"])
    fastest_retrieval = min(results, key=lambda r: r["rag_quality_evaluation"]["avg_retrieval_time_seconds"])
    most_docs_retrieved = max(results, key=lambda r: r["rag_quality_evaluation"]["total_documents_retrieved"])

    # Chunking winners
    most_chunks = max(results, key=lambda r: r["chunking_analysis"]["chunk_count"])
    largest_chunks = max(results, key=lambda r: r["chunking_analysis"]["avg_chunk_size"])

    # Chunking strategy comparison (MiniLM 1000 vs 2000)
    minilm_1000 = configs.get("minilm_1000")
    minilm_2000 = configs.get("minilm_2000")

    chunking_comparison = None
    if minilm_1000 and minilm_2000:
        chunking_comparison = {
            "model_tested": "MiniLM (384d)",
            "small_chunks_1000": extract_rag_config_summary(minilm_1000),
            "large_chunks_2000": extract_rag_config_summary(minilm_2000),
            "comparison_ratios": calculate_rag_comparison_ratios(minilm_1000, minilm_2000),
        }

    return {
        "summary": {
            "test_purpose": "configurable RAG quality benchmark using production pipeline",
            "evaluation_method": "retrieve_documents() + evaluate_retrieval_relevance() AI assessment",
            "configurations_tested": [r["configuration"]["name"] for r in results],
            "test_timestamp": datetime.now(UTC).isoformat(),
            "total_configurations": len(results),
        },
        "performance_winners": {
            "fastest_insertion": create_rag_winner_summary(best_insertion, "insertion"),
            "fastest_search": create_rag_winner_summary(best_search, "search"),
            "most_memory_efficient": create_rag_winner_summary(most_memory_efficient, "memory"),
            "most_chunks_generated": create_rag_winner_summary(most_chunks, "chunks"),
            "largest_average_chunks": create_rag_winner_summary(largest_chunks, "chunk_size"),
        },
        "rag_quality_winners": {
            "best_relevance_score": create_rag_winner_summary(best_relevance, "relevance"),
            "best_retrieval_success_rate": create_rag_winner_summary(best_success_rate, "success_rate"),
            "fastest_retrieval_time": create_rag_winner_summary(fastest_retrieval, "retrieval_speed"),
            "most_documents_retrieved": create_rag_winner_summary(most_docs_retrieved, "doc_count"),
        },
        "chunking_strategy_analysis": chunking_comparison,
        "configurable_insights": generate_rag_configurable_insights(results, chunking_comparison),
        "detailed_results": results,
    }


def extract_rag_config_summary(result: dict[str, Any]) -> dict[str, Any]:
    """Extract key metrics from a RAG configuration result."""
    return {
        "chunk_count": result["chunking_analysis"]["chunk_count"],
        "avg_chunk_size": result["chunking_analysis"]["avg_chunk_size"],
        "insertion_throughput": result["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"],
        "search_throughput": result["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"],
        "total_memory_mb": result["performance_metrics"]["total_memory_mb"],
        "avg_relevance_score": result["rag_quality_evaluation"]["avg_relevance_score"],
        "retrieval_success_rate": result["rag_quality_evaluation"]["retrieval_success_rate"],
        "avg_retrieval_time": result["rag_quality_evaluation"]["avg_retrieval_time_seconds"],
    }


def calculate_rag_comparison_ratios(config1: dict[str, Any], config2: dict[str, Any]) -> dict[str, float]:
    """Calculate comparison ratios between two RAG configurations."""
    c1_perf = config1["performance_metrics"]
    c2_perf = config2["performance_metrics"]
    c1_chunk = config1["chunking_analysis"]
    c2_chunk = config2["chunking_analysis"]
    c1_rag = config1["rag_quality_evaluation"]
    c2_rag = config2["rag_quality_evaluation"]

    return {
        "chunk_count_ratio": c2_chunk["chunk_count"] / c1_chunk["chunk_count"] if c1_chunk["chunk_count"] > 0 else 0,
        "insertion_speed_ratio": c2_perf["insertion_benchmark"]["throughput_vectors_per_sec"]
        / c1_perf["insertion_benchmark"]["throughput_vectors_per_sec"],
        "search_speed_ratio": c2_perf["search_benchmark"]["throughput_queries_per_sec"]
        / c1_perf["search_benchmark"]["throughput_queries_per_sec"],
        "memory_ratio": c2_perf["total_memory_mb"] / c1_perf["total_memory_mb"],
        "relevance_ratio": c2_rag["avg_relevance_score"] / c1_rag["avg_relevance_score"]
        if c1_rag["avg_relevance_score"] > 0
        else 0,
        "success_rate_ratio": c2_rag["retrieval_success_rate"] / c1_rag["retrieval_success_rate"]
        if c1_rag["retrieval_success_rate"] > 0
        else 0,
        "retrieval_speed_ratio": c1_rag["avg_retrieval_time_seconds"] / c2_rag["avg_retrieval_time_seconds"]
        if c2_rag["avg_retrieval_time_seconds"] > 0
        else 0,  # Inverted (lower is better)
    }


def create_rag_winner_summary(result: dict[str, Any] | None, metric_type: str) -> dict[str, Any] | None:
    """Create a summary for a winning RAG configuration."""
    if not result:
        return None

    base = {
        "config": result["configuration"]["name"],
        "description": result["configuration"]["description"],
    }

    if metric_type == "insertion":
        base["throughput"] = round(
            result["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"], 2
        )
    elif metric_type == "search":
        base["throughput"] = round(result["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"], 2)
    elif metric_type == "memory":
        base["total_memory_mb"] = round(result["performance_metrics"]["total_memory_mb"], 2)
    elif metric_type == "chunks":
        base["chunk_count"] = result["chunking_analysis"]["chunk_count"]
    elif metric_type == "chunk_size":
        base["avg_chunk_size"] = result["chunking_analysis"]["avg_chunk_size"]
    elif metric_type == "relevance":
        base["avg_relevance_score"] = round(result["rag_quality_evaluation"]["avg_relevance_score"], 3)
    elif metric_type == "success_rate":
        base["retrieval_success_rate"] = round(result["rag_quality_evaluation"]["retrieval_success_rate"], 3)
    elif metric_type == "retrieval_speed":
        base["avg_retrieval_time_seconds"] = round(result["rag_quality_evaluation"]["avg_retrieval_time_seconds"], 3)
    elif metric_type == "doc_count":
        base["total_documents_retrieved"] = result["rag_quality_evaluation"]["total_documents_retrieved"]

    return base


def generate_rag_configurable_insights(
    results: list[dict[str, Any]], chunking_comparison: dict[str, Any] | None
) -> dict[str, str]:
    """Generate configurable insights covering both performance and RAG quality."""

    insights = {}

    # Chunking strategy insights with RAG metrics
    if chunking_comparison and "comparison_ratios" in chunking_comparison:
        ratios = chunking_comparison["comparison_ratios"]
        insights["chunking_performance"] = (
            f"Large chunks (2000) are {ratios['insertion_speed_ratio']:.2f}x insertion speed, {ratios['search_speed_ratio']:.2f}x search speed"
        )
        insights["chunking_memory"] = (
            f"Large chunks use {ratios['memory_ratio']:.2f}x {'more' if ratios['memory_ratio'] > 1 else 'less'} memory"
        )
        insights["chunking_rag_quality"] = (
            f"Large chunks have {ratios['relevance_ratio']:.2f}x {'better' if ratios['relevance_ratio'] > 1 else 'worse'} RAG relevance score"
        )
        insights["chunking_success_rate"] = (
            f"Large chunks have {ratios['success_rate_ratio']:.2f}x {'better' if ratios['success_rate_ratio'] > 1 else 'worse'} retrieval success rate"
        )
        insights["chunking_retrieval_speed"] = (
            f"Large chunks are {ratios['retrieval_speed_ratio']:.2f}x {'faster' if ratios['retrieval_speed_ratio'] > 1 else 'slower'} at retrieval"
        )

    # Model dimension insights with RAG metrics
    model_384d = [r for r in results if r["configuration"]["embedding"]["dimension"] == 384]
    model_768d = [r for r in results if r["configuration"]["embedding"]["dimension"] == 768]

    if model_384d and model_768d:
        # Performance comparison
        avg_384_memory = sum(r["performance_metrics"]["total_memory_mb"] for r in model_384d) / len(model_384d)
        avg_768_memory = sum(r["performance_metrics"]["total_memory_mb"] for r in model_768d) / len(model_768d)
        memory_ratio = avg_768_memory / avg_384_memory if avg_384_memory != 0 else 0
        insights["dimension_memory"] = f"768d models use {memory_ratio:.1f}x more memory than 384d models"

        # RAG quality comparison
        avg_384_relevance = sum(r["rag_quality_evaluation"]["avg_relevance_score"] for r in model_384d) / len(
            model_384d
        )
        avg_768_relevance = sum(r["rag_quality_evaluation"]["avg_relevance_score"] for r in model_768d) / len(
            model_768d
        )
        relevance_ratio = avg_768_relevance / avg_384_relevance if avg_384_relevance > 0 else 0
        insights["dimension_rag_quality"] = (
            f"768d models have {relevance_ratio:.2f}x {'better' if relevance_ratio > 1 else 'worse'} RAG relevance than 384d models"
        )

        # Success rate comparison
        avg_384_success = sum(r["rag_quality_evaluation"]["retrieval_success_rate"] for r in model_384d) / len(
            model_384d
        )
        avg_768_success = sum(r["rag_quality_evaluation"]["retrieval_success_rate"] for r in model_768d) / len(
            model_768d
        )
        success_ratio = avg_768_success / avg_384_success if avg_384_success > 0 else 0
        insights["dimension_success_rate"] = (
            f"768d models have {success_ratio:.2f}x {'better' if success_ratio > 1 else 'worse'} retrieval success rate"
        )

    return insights


def print_rag_quality_summary(analysis: dict[str, Any]) -> None:
    """Print a configurable RAG quality summary."""

    analysis["summary"]

    perf_winners = analysis["performance_winners"]
    for category, winner in perf_winners.items():
        if winner:
            category.replace("_", " ").title()

    rag_winners = analysis["rag_quality_winners"]
    for category, winner in rag_winners.items():
        if winner:
            category.replace("_", " ").title()

    if analysis.get("configurable_insights"):
        for _insight_type, _insight in analysis["configurable_insights"].items():
            pass

    if analysis.get("chunking_strategy_analysis"):
        chunk_analysis = analysis["chunking_strategy_analysis"]
        chunk_analysis["small_chunks_1000"]
        chunk_analysis["large_chunks_2000"]
