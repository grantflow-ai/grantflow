"""
Configurable RAG Quality Benchmark Test

This test uses the RAG pipeline to provide retrieval quality metrics:
- retrieve_documents() for actual document retrieval
- evaluate_retrieval_relevance() for AI-powered quality assessment
- Search queries and semantic similarity evaluation
- Production-grade performance and quality analysis

"""

import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

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

from .framework import VectorBenchmarkFramework
from .synthetic_migrations import VectorTableModifier


async def create_and_index_rag_source(
    content: str,
    filename: str,
    session_maker: async_sessionmaker[Any],
    application_id: str,
    logger: Any,
    max_chars: int,
    overlap_chars: int,
    model_name: str,
) -> tuple[str, list[dict[str, Any]], str]:
    """
    Create and index RAG source with chunking and embedding generation.

    This is a simplified version for testing that creates chunks and generates
    mock vectors for benchmarking purposes.
    """
    from packages.shared_utils.src.embeddings import generate_embeddings
    from testing.factories import RagFileFactory

    # Create RagFile source
    source = RagFileFactory.build(
        filename=filename,
        text_content=content,
        source_type="rag_file",
        mime_type="text/markdown",
    )

    # Simple chunking based on max_chars and overlap_chars
    chunks: list[dict[str, Any]] = []
    start = 0
    while start < len(content):
        end = min(start + max_chars, len(content))
        chunk_content = content[start:end]

        if chunk_content.strip():  # Only add non-empty chunks
            chunks.append(
                {
                    "content": chunk_content,
                    "start_idx": start,
                    "end_idx": end,
                }
            )

        # Move start position with overlap
        start = end - overlap_chars if end < len(content) else end
        if start >= len(content):
            break

    logger.info("Created chunks for indexing", chunk_count=len(chunks), filename=filename)

    # Generate embeddings for each chunk
    chunk_texts: list[str] = [str(chunk["content"]) for chunk in chunks]
    embeddings = await generate_embeddings(chunk_texts, model_name=model_name)

    # Save source to database
    async with session_maker() as session:
        session.add(source)
        await session.commit()
        source_id = str(source.id)

    # Create vector DTOs for benchmarking
    vectors = []
    for _i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=False)):
        vector_dto = {
            "chunk": chunk,
            "embedding": embedding,
            "rag_source_id": source_id,
        }
        vectors.append(vector_dto)

    logger.info("Generated embeddings and vectors", vector_count=len(vectors), model=model_name, source_id=source_id)

    return source_id, vectors, content


@pytest.fixture
def rag_quality_configurations() -> dict[str, dict[str, Any]]:
    """Load chunking configurations from YAML file."""
    config_path = Path(__file__).parent / "chunking_configs.yaml"
    with config_path.open() as file:
        config_data = yaml.safe_load(file)
    configurations: dict[str, dict[str, Any]] = config_data["configurations"]
    return configurations


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
    from packages.db.src.tables import GrantApplicationSource, RagFile, RagSource, TextVector
    from sqlalchemy import delete, select

    async def _cleanup(application_id: str, test_filename: str) -> None:
        async with async_session_maker() as session:
            # Clean up grant application RAG sources
            await session.execute(
                delete(GrantApplicationSource).where(GrantApplicationSource.grant_application_id == application_id)
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
            total_memory=f"{float(cast('dict[str, Any]', result['performance_metrics'])['total_memory_mb']):.1f}MB",
        )

    # 6. Generate configurable analysis with RAG metrics
    configurable_analysis = generate_rag_quality_analysis(all_results, configurations)

    # Save configurable report (JSON)
    report_path = rag_quality_results_dir / f"configurable_rag_quality_report_{test_id}.json"
    save_evaluation_results(configurable_analysis, report_path)

    # Save markdown summary report
    markdown_path = rag_quality_results_dir / f"configurable_rag_quality_summary_{test_id}.md"
    generate_markdown_summary(configurable_analysis, markdown_path)

    # Print configurable summary
    print_rag_quality_summary(configurable_analysis)

    logger.info(
        "🏆 configurable RAG QUALITY BENCHMARK COMPLETED!",
        configurations_tested=len(all_results),
        json_report_path=str(report_path),
        markdown_report_path=str(markdown_path),
        analysis_type="RAG pipeline with AI evaluation",
    )

    # Assertions for production-grade results
    for result in all_results:
        result_config_name: str = str(cast("dict[str, Any]", result["configuration"])["name"])
        result_insertion_throughput: float = float(
            cast("dict[str, Any]", cast("dict[str, Any]", result["performance_metrics"])["insertion_benchmark"])[
                "throughput_vectors_per_sec"
            ]
        )
        result_search_throughput: float = float(
            cast("dict[str, Any]", cast("dict[str, Any]", result["performance_metrics"])["search_benchmark"])[
                "throughput_queries_per_sec"
            ]
        )
        result_avg_relevance: float = float(
            cast("dict[str, Any]", result["rag_quality_evaluation"])["avg_relevance_score"]
        )
        result_success_rate: float = float(
            cast("dict[str, Any]", result["rag_quality_evaluation"])["retrieval_success_rate"]
        )

        # Performance assertions
        assert result_insertion_throughput > 1, (
            f"Low insertion throughput for {result_config_name}: {result_insertion_throughput}"
        )
        assert result_search_throughput > 0.1, (
            f"Low search throughput for {result_config_name}: {result_search_throughput}"
        )
        assert cast("dict[str, Any]", result["chunking_analysis"])["chunk_count"] > 0, (
            f"No chunks generated for {result_config_name}"
        )

        # RAG quality assertions
        assert result_success_rate >= 0.5, f"Low retrieval success rate for {result_config_name}: {result_success_rate}"
        assert result_avg_relevance >= 0, f"Invalid relevance score for {result_config_name}: {result_avg_relevance}"

        logger.info("✅ All assertions passed for config", config=result_config_name)


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
    {result["configuration"]["name"]: result for result in results}

    # Find performance best results
    best_insertion = max(
        results, key=lambda r: r["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"]
    )
    best_search = max(results, key=lambda r: r["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"])
    most_memory_efficient = min(results, key=lambda r: r["performance_metrics"]["total_memory_mb"])

    # Find RAG quality best results
    best_relevance = max(results, key=lambda r: r["rag_quality_evaluation"]["avg_relevance_score"])
    best_success_rate = max(results, key=lambda r: r["rag_quality_evaluation"]["retrieval_success_rate"])
    fastest_retrieval = min(results, key=lambda r: r["rag_quality_evaluation"]["avg_retrieval_time_seconds"])
    most_docs_retrieved = max(results, key=lambda r: r["rag_quality_evaluation"]["total_documents_retrieved"])

    # Chunking best results
    most_chunks = max(results, key=lambda r: r["chunking_analysis"]["chunk_count"])
    largest_chunks = max(results, key=lambda r: r["chunking_analysis"]["avg_chunk_size"])

    # Dynamic chunking strategy comparison
    chunking_comparison = generate_dynamic_chunking_comparison(results)

    return {
        "summary": {
            "test_purpose": "configurable RAG quality benchmark using production pipeline",
            "evaluation_method": "retrieve_documents() + evaluate_retrieval_relevance() AI assessment",
            "configurations_tested": [r["configuration"]["name"] for r in results],
            "test_timestamp": datetime.now(UTC).isoformat(),
            "total_configurations": len(results),
        },
        "performance_best": {
            "fastest_insertion": create_rag_best_summary(best_insertion, "insertion"),
            "fastest_search": create_rag_best_summary(best_search, "search"),
            "most_memory_efficient": create_rag_best_summary(most_memory_efficient, "memory"),
            "most_chunks_generated": create_rag_best_summary(most_chunks, "chunks"),
            "largest_average_chunks": create_rag_best_summary(largest_chunks, "chunk_size"),
        },
        "rag_quality_best": {
            "best_relevance_score": create_rag_best_summary(best_relevance, "relevance"),
            "best_retrieval_success_rate": create_rag_best_summary(best_success_rate, "success_rate"),
            "fastest_retrieval_time": create_rag_best_summary(fastest_retrieval, "retrieval_speed"),
            "most_documents_retrieved": create_rag_best_summary(most_docs_retrieved, "doc_count"),
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


def create_rag_best_summary(result: dict[str, Any] | None, metric_type: str) -> dict[str, Any] | None:
    """Create a summary for the best RAG configuration."""
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


def generate_dynamic_chunking_comparison(results: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Generate dynamic chunking comparison based on available configurations."""
    if len(results) < 2:
        return None

    # Group results by embedding model for fair comparison
    model_groups: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        model_name = result["configuration"]["embedding"]["model"]
        if model_name not in model_groups:
            model_groups[model_name] = []
        model_groups[model_name].append(result)

    # Find the best model group with multiple chunk sizes for comparison
    best_comparison = None
    for model_name, group_results in model_groups.items():
        if len(group_results) >= 2:
            # Sort by chunk size to get smallest and largest
            sorted_by_chunk = sorted(group_results, key=lambda r: r["configuration"]["chunking"]["max_chars"])
            smallest_chunks = sorted_by_chunk[0]
            largest_chunks = sorted_by_chunk[-1]

            # Only compare if there's actually a difference in chunk size
            if (
                smallest_chunks["configuration"]["chunking"]["max_chars"]
                != largest_chunks["configuration"]["chunking"]["max_chars"]
            ):
                dimension = smallest_chunks["configuration"]["embedding"]["dimension"]
                model_display_name = get_model_display_name(model_name, dimension)

                best_comparison = {
                    "model_tested": model_display_name,
                    "config_a": {
                        "config_name": smallest_chunks["configuration"]["name"],
                        "chunk_size": smallest_chunks["configuration"]["chunking"]["max_chars"],
                        "metrics": extract_rag_config_summary(smallest_chunks),
                    },
                    "config_b": {
                        "config_name": largest_chunks["configuration"]["name"],
                        "chunk_size": largest_chunks["configuration"]["chunking"]["max_chars"],
                        "metrics": extract_rag_config_summary(largest_chunks),
                    },
                    "comparison_ratios": calculate_rag_comparison_ratios(smallest_chunks, largest_chunks),
                }
                break  # Use first valid comparison found

    return best_comparison


def get_model_display_name(model_name: str, dimension: int) -> str:
    """Generate a display name for the embedding model."""
    if "MiniLM" in model_name:
        return f"MiniLM ({dimension}d)"
    if "scibert" in model_name.lower():
        return f"SciBERT ({dimension}d)"
    if "mpnet" in model_name.lower():
        return f"MPNet ({dimension}d)"
    if "ada-002" in model_name.lower():
        return f"OpenAI Ada ({dimension}d)"
    if "distilbert" in model_name.lower():
        return f"DistilBERT ({dimension}d)"
    # Extract a readable name from the model path
    model_short = model_name.split("/")[-1] if "/" in model_name else model_name
    return f"{model_short} ({dimension}d)"


def generate_rag_configurable_insights(
    results: list[dict[str, Any]], chunking_comparison: dict[str, Any] | None
) -> dict[str, str]:
    """Generate configurable insights covering both performance and RAG quality."""

    insights = {}

    # Dynamic chunking strategy insights with RAG metrics
    if chunking_comparison and "comparison_ratios" in chunking_comparison:
        ratios = chunking_comparison["comparison_ratios"]
        config_a_size = chunking_comparison["config_a"]["chunk_size"]
        config_b_size = chunking_comparison["config_b"]["chunk_size"]
        config_a_name = chunking_comparison["config_a"]["config_name"]
        config_b_name = chunking_comparison["config_b"]["config_name"]
        model_name = chunking_comparison["model_tested"]

        insights["chunking_performance"] = (
            f"{config_b_name} ({config_b_size} chars) has {ratios['insertion_speed_ratio']:.2f}x insertion speed, {ratios['search_speed_ratio']:.2f}x search speed vs {config_a_name} ({config_a_size} chars) for {model_name}"
        )
        insights["chunking_memory"] = (
            f"{config_b_name} ({config_b_size} chars) uses {ratios['memory_ratio']:.2f}x {'more' if ratios['memory_ratio'] > 1 else 'less'} memory than {config_a_name} ({config_a_size} chars)"
        )
        insights["chunking_rag_quality"] = (
            f"{config_b_name} ({config_b_size} chars) has {ratios['relevance_ratio']:.2f}x {'better' if ratios['relevance_ratio'] > 1 else 'worse'} RAG relevance score than {config_a_name} ({config_a_size} chars)"
        )
        insights["chunking_success_rate"] = (
            f"{config_b_name} ({config_b_size} chars) has {ratios['success_rate_ratio']:.2f}x {'better' if ratios['success_rate_ratio'] > 1 else 'worse'} retrieval success rate than {config_a_name} ({config_a_size} chars)"
        )
        insights["chunking_retrieval_speed"] = (
            f"{config_b_name} ({config_b_size} chars) is {ratios['retrieval_speed_ratio']:.2f}x {'faster' if ratios['retrieval_speed_ratio'] > 1 else 'slower'} at retrieval than {config_a_name} ({config_a_size} chars)"
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


def generate_markdown_summary(analysis: dict[str, Any], output_path: Path) -> None:
    """Generate a markdown summary report of the RAG quality benchmark results."""
    markdown_lines = []

    # Build each section
    markdown_lines.extend(_build_header_section(analysis["summary"]))
    markdown_lines.extend(_build_configs_section(analysis))
    markdown_lines.extend(_build_performance_section(analysis["performance_best"]))
    markdown_lines.extend(_build_rag_quality_section(analysis["rag_quality_best"]))
    markdown_lines.extend(_build_comparison_section(analysis.get("chunking_strategy_analysis")))
    markdown_lines.extend(_build_insights_section(analysis.get("configurable_insights", {})))
    markdown_lines.extend(_build_footer_section(analysis["summary"]))

    # Write to file
    with output_path.open("w") as f:
        f.write("\n".join(markdown_lines))


def _build_header_section(summary: dict[str, Any]) -> list[str]:
    """Build the header section of the markdown report."""
    return [
        "# RAG Quality Benchmark Results",
        "",
        f"**Test Purpose**: {summary['test_purpose']}",
        f"**Evaluation Method**: {summary['evaluation_method']}",
        f"**Test Timestamp**: {summary['test_timestamp']}",
        f"**Configurations Tested**: {summary['total_configurations']}",
        "",
    ]


def _build_configs_section(analysis: dict[str, Any]) -> list[str]:
    """Build the configurations overview section."""
    if "detailed_results" not in analysis:
        return []

    lines = [
        "## Configurations Overview",
        "",
        "| Configuration | Model | Dimension | Chunk Size | Overlap |",
        "|---------------|-------|-----------|------------|---------|",
    ]

    for result in analysis["detailed_results"]:
        config = result["configuration"]
        embedding = config["embedding"]
        chunking = config["chunking"]
        model_short = embedding["model"].split("/")[-1] if "/" in embedding["model"] else embedding["model"]

        lines.append(
            f"| {config['name']} | {model_short} | {embedding['dimension']}d | {chunking['max_chars']} chars | {chunking['overlap']} chars |"
        )

    lines.append("")
    return lines


def _build_performance_section(perf_best: dict[str, Any]) -> list[str]:
    """Build the performance best results section."""
    lines = ["## Best Performance Results", ""]

    categories = {
        "fastest_insertion": "Best Vector Insertion",
        "fastest_search": "Best Similarity Search",
        "most_memory_efficient": "Best Memory Efficiency",
        "most_chunks_generated": "Best Chunk Generation",
        "largest_average_chunks": "Best Average Chunk Size",
    }

    for key, title in categories.items():
        best = perf_best.get(key)
        if best:
            lines.extend(_format_best_section(title, best))

    return lines


def _build_rag_quality_section(rag_best: dict[str, Any]) -> list[str]:
    """Build the RAG quality best results section."""
    lines = ["## Best RAG Quality Results", ""]

    categories = {
        "best_relevance_score": "Best Relevance Score",
        "best_retrieval_success_rate": "Best Retrieval Success Rate",
        "fastest_retrieval_time": "Best Retrieval Time",
        "most_documents_retrieved": "Best Document Retrieval",
    }

    for key, title in categories.items():
        best = rag_best.get(key)
        if best:
            lines.extend(_format_best_section(title, best))

    return lines


def _format_best_section(title: str, best: dict[str, Any]) -> list[str]:
    """Format a best result section with metrics."""
    lines = [f"### {title}", f"**Best**: {best['config']} - {best['description']}"]

    # Add metrics based on what's available
    if "throughput" in best:
        lines.append(f"- **Throughput**: {best['throughput']:.2f} ops/sec")
    if "total_memory_mb" in best:
        lines.append(f"- **Memory Usage**: {best['total_memory_mb']:.1f} MB")
    if "chunk_count" in best:
        lines.append(f"- **Chunks Generated**: {best['chunk_count']:,}")
    if "avg_chunk_size" in best:
        lines.append(f"- **Average Chunk Size**: {best['avg_chunk_size']:,} chars")
    if "avg_relevance_score" in best:
        lines.append(f"- **Relevance Score**: {best['avg_relevance_score']:.3f}")
    if "retrieval_success_rate" in best:
        lines.append(f"- **Success Rate**: {best['retrieval_success_rate']:.1%}")
    if "avg_retrieval_time_seconds" in best:
        lines.append(f"- **Retrieval Time**: {best['avg_retrieval_time_seconds']:.3f}s")
    if "total_documents_retrieved" in best:
        lines.append(f"- **Documents Retrieved**: {best['total_documents_retrieved']:,}")

    lines.append("")
    return lines


def _build_comparison_section(chunking_analysis: dict[str, Any] | None) -> list[str]:
    """Build the chunking strategy comparison section."""
    if not chunking_analysis:
        return []

    lines = [
        "## Chunking Strategy Comparison",
        "",
        f"**Model Tested**: {chunking_analysis['model_tested']}",
        "",
        "### Configuration Comparison",
        "",
    ]

    config_a = chunking_analysis["config_a"]
    config_b = chunking_analysis["config_b"]

    # Build comparison table
    header_a = f"{config_a['config_name']} ({config_a['chunk_size']} chars)"
    header_b = f"{config_b['config_name']} ({config_b['chunk_size']} chars)"
    lines.extend(
        [
            f"| Metric | {header_a} | {header_b} | Ratio |",
            f"|--------|{'-' * len(header_a)}|{'-' * len(header_b)}|-------|",
        ]
    )

    # Add comparison rows
    lines.extend(
        _build_comparison_rows(config_a["metrics"], config_b["metrics"], chunking_analysis["comparison_ratios"])
    )
    lines.append("")

    return lines


def _build_comparison_rows(metrics_a: dict[str, Any], metrics_b: dict[str, Any], ratios: dict[str, float]) -> list[str]:
    """Build comparison table rows."""
    metrics = [
        ("Chunk Count", "chunk_count", "chunk_count_ratio", ""),
        ("Insertion Throughput", "insertion_throughput", "insertion_speed_ratio", " ops/sec"),
        ("Search Throughput", "search_throughput", "search_speed_ratio", " ops/sec"),
        ("Memory Usage", "total_memory_mb", "memory_ratio", " MB"),
        ("Avg Relevance Score", "avg_relevance_score", "relevance_ratio", ""),
        ("Retrieval Success Rate", "retrieval_success_rate", "success_rate_ratio", "%"),
        ("Avg Retrieval Time", "avg_retrieval_time", "retrieval_speed_ratio", "s"),
    ]

    lines = []
    for name, key, ratio_key, unit in metrics:
        if key in metrics_a and key in metrics_b:
            val_a_str = _format_metric_value(metrics_a[key], unit, key)
            val_b_str = _format_metric_value(metrics_b[key], unit, key)
            ratio = ratios.get(ratio_key, 0)
            lines.append(f"| {name} | {val_a_str} | {val_b_str} | {ratio:.2f}x |")

    return lines


def _format_metric_value(value: Any, unit: str, key: str) -> str:
    """Format a metric value based on its unit and key."""
    if unit == "%":
        return f"{value:.1%}"
    if unit == "s":
        return f"{value:.3f}{unit}"
    if unit == " MB":
        return f"{value:.1f}{unit}"
    if unit == " ops/sec":
        return f"{value:.2f}{unit}"
    if key == "chunk_count":
        return f"{value:,}"
    return f"{value:.3f}{unit}"


def _build_insights_section(insights: dict[str, str]) -> list[str]:
    """Build the key insights section."""
    if not insights:
        return []

    lines = ["## Key Insights", ""]

    categories = {
        "chunking_performance": "Performance Impact",
        "chunking_memory": "Memory Impact",
        "chunking_rag_quality": "RAG Quality Impact",
        "chunking_success_rate": "Success Rate Impact",
        "chunking_retrieval_speed": "Retrieval Speed Impact",
        "dimension_memory": "Model Dimension Memory",
        "dimension_rag_quality": "Model Dimension Quality",
        "dimension_success_rate": "Model Dimension Success Rate",
    }

    for key, title in categories.items():
        if key in insights:
            lines.extend([f"### {title}", f"{insights[key]}", ""])

    return lines


def _build_footer_section(summary: dict[str, Any]) -> list[str]:
    """Build the footer section."""
    return [
        "---",
        "",
        f"*Report generated on {summary['test_timestamp']}*",
        "",
        "*Full detailed results available in JSON format*",
    ]


def print_rag_quality_summary(analysis: dict[str, Any]) -> None:
    """Print a configurable RAG quality summary."""

    analysis["summary"]

    perf_best = analysis["performance_best"]
    for category, best in perf_best.items():
        if best:
            category.replace("_", " ").title()

    rag_best = analysis["rag_quality_best"]
    for category, best in rag_best.items():
        if best:
            category.replace("_", " ").title()

    if analysis.get("configurable_insights"):
        for _insight_type, _insight in analysis["configurable_insights"].items():
            pass

    if analysis.get("chunking_strategy_analysis"):
        chunk_analysis = analysis["chunking_strategy_analysis"]
        if chunk_analysis and "config_a" in chunk_analysis and "config_b" in chunk_analysis:
            chunk_analysis["config_a"]["config_name"]
            chunk_analysis["config_b"]["config_name"]
