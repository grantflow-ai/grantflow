import os
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import pytest
import yaml
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER, RESULTS_FOLDER
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test
from testing.rag_ai_evaluation import evaluate_query_generation_quality, evaluate_retrieval_relevance
from testing.rag_evaluation import (
    assess_query_quality,
    calculate_performance_metrics,
    calculate_retrieval_diversity,
    save_evaluation_results,
)

from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

from .framework import VectorBenchmarkFramework
from .synthetic_migrations import VectorTableModifier

logger = get_logger(__name__)


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
    from packages.shared_utils.src.embeddings import generate_embeddings
    from testing.factories import RagFileFactory

    source = RagFileFactory.build(
        filename=filename,
        text_content=content,
        source_type="rag_file",
        mime_type="text/markdown",
    )

    chunks: list[dict[str, Any]] = []
    start = 0
    while start < len(content):
        end = min(start + max_chars, len(content))
        chunk_content = content[start:end]

        if chunk_content.strip():
            chunks.append(
                {
                    "content": chunk_content,
                    "start_idx": start,
                    "end_idx": end,
                }
            )

        start = end - overlap_chars if end < len(content) else end
        if start >= len(content):
            break

    logger.info("Created chunks for indexing", chunk_count=len(chunks), filename=filename)

    chunk_texts: list[str] = [str(chunk["content"]) for chunk in chunks]
    embeddings = await generate_embeddings(chunk_texts, model_name=model_name)

    if embeddings:
        model_dimensions = {
            "sentence-transformers/all-MiniLM-L12-v2": 384,
            "allenai/scibert_scivocab_uncased": 768,
            "sentence-transformers/all-mpnet-base-v2": 768,
        }

        expected_dim = model_dimensions.get(model_name)
        if expected_dim:
            actual_dim = len(embeddings[0])
            assert actual_dim == expected_dim, (
                f"Vector dimension mismatch for {model_name}: expected {expected_dim}, got {actual_dim}"
            )
            logger.info("✅ Embedding dimension validation passed", model=model_name, dimension=actual_dim)

    async with session_maker() as session:
        from uuid import uuid4

        from packages.db.src.tables import GrantApplicationSource, TextVector

        session.add(source)
        await session.commit()
        await session.refresh(source)
        source_id = str(source.id)

        text_vectors = []
        for chunk, embedding in zip(chunks, embeddings, strict=False):
            text_vector = TextVector(
                id=uuid4(),
                chunk=chunk,
                embedding=embedding,
                rag_source_id=source.id,
            )
            text_vectors.append(text_vector)
            session.add(text_vector)

        grant_app_source = GrantApplicationSource(
            grant_application_id=application_id,
            rag_source_id=source.id,
        )
        session.add(grant_app_source)

        await session.commit()

        for text_vector in text_vectors:
            await session.refresh(text_vector)

    vectors = []
    for text_vector in text_vectors:
        vector_dto = {
            "chunk": text_vector.chunk,
            "embedding": text_vector.embedding,
            "rag_source_id": source_id,
        }
        vectors.append(vector_dto)

    logger.info("Generated embeddings and vectors", vector_count=len(vectors), model=model_name, source_id=source_id)

    return source_id, vectors, content


@pytest.fixture
def rag_quality_configurations() -> dict[str, dict[str, Any]]:
    config_path = Path(__file__).parent / "chunking_configs.yaml"
    with config_path.open() as file:
        config_data = yaml.safe_load(file)
    configurations: dict[str, dict[str, Any]] = config_data["configurations"]
    return configurations


@pytest.fixture
def rag_quality_results_dir() -> Path:
    results_dir = RESULTS_FOLDER / "configurable_rag_quality_benchmarks"
    results_dir.mkdir(parents=True, exist_ok=True)
    return results_dir


@pytest.fixture
def cfp_content() -> str:
    cfp_file_path = FIXTURES_FOLDER / "cfps" / "melanoma_alliance.md"
    return cfp_file_path.read_text()


@pytest.fixture
async def cleanup_rag_test_data(async_session_maker: async_sessionmaker[Any]) -> Any:
    from packages.db.src.tables import GrantApplicationSource, RagFile, RagSource, TextVector
    from sqlalchemy import delete, select

    async def _cleanup(application_id: str, test_filename: str) -> None:
        async with async_session_maker() as session:
            await session.execute(
                delete(GrantApplicationSource).where(GrantApplicationSource.grant_application_id == application_id)
            )

            existing_source_ids = list(
                await session.scalars(select(RagFile.id).where(RagFile.filename == test_filename))
            )

            if existing_source_ids:
                await session.execute(delete(TextVector).where(TextVector.rag_source_id.in_(existing_source_ids)))
                await session.execute(delete(RagSource).where(RagSource.id.in_(existing_source_ids)))

            await session.commit()

    return _cleanup


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.VECTOR_BENCHMARK, timeout=1800)
async def test_configurable_rag_quality_benchmark(  # noqa: PLR0915
    async_session_maker: async_sessionmaker[Any],
    cfp_content: str,
    rag_quality_results_dir: Path,
    rag_quality_configurations: dict[str, Any],
    cleanup_rag_test_data: Any,
    grant_application: Any,
    db_connection_string: str,
) -> None:
    os.environ["DATABASE_CONNECTION_STRING"] = db_connection_string

    from packages.db.src.connection import engine_ref, session_maker_ref

    session_maker_ref.value = None
    engine_ref.value = None

    from packages.db.src.tables import GrantApplicationSource, TextVector
    from sqlalchemy import delete

    async with async_session_maker() as cleanup_session:
        await cleanup_session.execute(delete(TextVector))
        await cleanup_session.execute(delete(GrantApplicationSource))
        await cleanup_session.commit()
        logger.info("🧹 Cleared existing vectors for clean test start")

        if hasattr(cleanup_session.bind, "invalidate"):
            await cleanup_session.bind.invalidate()

    configurations = rag_quality_configurations
    test_id = f"configurable_rag_quality_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

    logger.info(
        "🚀 Starting RAG pipeline quality benchmark",
        configurations=list(configurations.keys()),
        total_configs=len(configurations),
    )

    all_results = []

    if "HF_TOKEN" in os.environ:
        del os.environ["HF_TOKEN"]
        logger.info("Cleared HF_TOKEN for public model access")
    if "HUGGINGFACE_HUB_TOKEN" in os.environ:
        del os.environ["HUGGINGFACE_HUB_TOKEN"]
        logger.info("Cleared HUGGINGFACE_HUB_TOKEN for public model access")

    scientific_queries = [
        "CAR-T cell therapy melanoma brain metastases CD8+ T cells immunosuppression",
        "TREM2 macrophages tumor microenvironment immune checkpoint inhibitors",
        "single cell RNA sequencing spatial transcriptomics stereo-seq analysis",
        "immunocytokines antibody-cytokine fusion proteins cancer immunotherapy",
        "brain metastases blood-brain barrier immunotherapy resistance mechanisms",
    ]

    for config_name, config in configurations.items():
        logger.info("🧪 Testing configuration with RAG pipeline", config=config_name)

        required_fields = ["description", "chunking", "embedding"]
        for field in required_fields:
            assert field in config, f"Missing required field '{field}' in configuration {config_name}"

        embedding_dim = config["embedding"]["dimension"]
        embedding_model = config["embedding"]["model"]

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(embedding_dim)
            logger.info("Modified vector dimension for RAG testing", dimension=embedding_dim, config=config_name)

            await session.close()

        from packages.db.src.connection import engine_ref

        if engine_ref.value:
            await engine_ref.value.dispose()
            engine_ref.value = None

        test_filename = f"rag_quality_{config_name}_{test_id}.md"
        await cleanup_rag_test_data(str(grant_application.id), test_filename)

        logger.info("📄 Creating RAG source with indexing pipeline")

        logger.info(
            "🔧 Ensuring vector table matches embedding dimension before indexing",
            embedding_dim=embedding_dim,
            model=embedding_model,
        )

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(embedding_dim)
            logger.info("✅ Vector table dimension updated for production indexing", dimension=embedding_dim)

            await session.close()

        from packages.db.src.connection import engine_ref

        if engine_ref.value:
            await engine_ref.value.dispose()
            engine_ref.value = None

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

        framework = VectorBenchmarkFramework(async_session_maker)

        framework_vectors: list[VectorDTO] = []
        for vector_dto in vectors[:100]:
            framework_vector = VectorDTO(
                chunk=vector_dto["chunk"],
                embedding=vector_dto["embedding"],
                rag_source_id=vector_dto["rag_source_id"],
            )
            framework_vectors.append(framework_vector)

        insertion_result = await framework.benchmark_vector_insertion(
            framework_vectors, test_name=f"{config_name}_rag_quality_insertion"
        )

        query_vectors = []
        for _i, query in enumerate(scientific_queries[:5]):
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

        logger.info("🤖 Starting RAG pipeline quality evaluation with AI assessment")

        from packages.db.src.connection import get_session_maker

        debug_session_maker = get_session_maker()
        async with debug_session_maker() as debug_session:
            from packages.db.src.tables import GrantApplicationSource, RagSource, TextVector
            from sqlalchemy import func, select

            vector_count_result = await debug_session.execute(
                select(func.count(TextVector.id))
                .join(RagSource, TextVector.rag_source_id == RagSource.id)
                .join(GrantApplicationSource, RagSource.id == GrantApplicationSource.rag_source_id)
                .where(GrantApplicationSource.grant_application_id == str(grant_application.id))
            )
            total_vectors = vector_count_result.scalar()
            logger.info(
                "✅ Vectors available for retrieval",
                application_id=str(grant_application.id),
                vector_count=total_vectors,
            )

        rag_quality_results = []
        total_retrieval_time = 0.0

        for query_idx, scientific_query in enumerate(scientific_queries):
            logger.info("🔍 Testing RAG retrieval", query=scientific_query[:50] + "...", config=config_name)

            retrieval_start = time.time()
            search_queries = await handle_create_search_queries(
                user_prompt=scientific_query, embedding_model=embedding_model
            )

            retrieved_docs = await retrieve_documents(
                rerank=True,
                application_id=str(grant_application.id),
                task_description=scientific_query,
                search_queries=search_queries[:3],
                embedding_model=embedding_model,
            )
            retrieval_time = time.time() - retrieval_start
            total_retrieval_time += retrieval_time

            logger.info(
                "📚 Retrieved documents",
                count=len(retrieved_docs),
                retrieval_time=f"{retrieval_time:.2f}s",
                query_index=query_idx + 1,
                config=config_name,
            )

            if retrieved_docs:
                logger.info("🧠 Running AI-powered retrieval relevance evaluation")
                ai_evaluation = await evaluate_retrieval_relevance(scientific_query, retrieved_docs)

                logger.info(
                    "✅ AI evaluation completed",
                    relevance_score=ai_evaluation.get("avg_relevance", 0.0),
                    query_index=query_idx + 1,
                    config=config_name,
                )
            else:
                logger.warning("⚠️ No documents retrieved for query", query_index=query_idx + 1)
                ai_evaluation = {"avg_relevance": 0.0, "error": "No documents retrieved"}

            diversity_score = calculate_retrieval_diversity(retrieved_docs) if retrieved_docs else 0.0

            query_quality_metrics = assess_query_quality(search_queries)

            query_ai_evaluation = await evaluate_query_generation_quality(scientific_query, search_queries)

            performance_metrics = calculate_performance_metrics(retrieval_start, time.time(), "retrieval")

            logger.info(
                "📊 Quality metrics calculated",
                diversity_score=f"{diversity_score:.3f}",
                query_quality_score=f"{query_quality_metrics.get('diversity', 0.0):.3f}",
                query_ai_score=f"{query_ai_evaluation.get('overall_score', 0.0):.3f}",
                performance_score=f"{performance_metrics.get('performance_score', 0.0):.3f}",
                config=config_name,
            )

            query_result = {
                "query": scientific_query,
                "query_index": query_idx,
                "retrieved_count": len(retrieved_docs),
                "retrieval_time_seconds": round(retrieval_time, 3),
                "ai_evaluation": ai_evaluation,
                "relevance_score": ai_evaluation.get("avg_relevance", 0.0),
                "search_queries_generated": len(search_queries),
                "diversity_score": round(diversity_score, 3),
                "query_quality_metrics": query_quality_metrics,
                "query_ai_evaluation": query_ai_evaluation,
                "performance_metrics": performance_metrics,
            }
            rag_quality_results.append(query_result)

        avg_relevance = (
            sum(r["relevance_score"] for r in rag_quality_results) / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )
        avg_retrieval_time = total_retrieval_time / len(scientific_queries) if scientific_queries else 0.0
        total_docs_retrieved = sum(r["retrieved_count"] for r in rag_quality_results)
        successful_retrievals = sum(1 for r in rag_quality_results if r["retrieved_count"] > 0)

        avg_diversity_score = (
            sum(r["diversity_score"] for r in rag_quality_results) / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )
        avg_query_quality = (
            sum(r["query_quality_metrics"]["diversity"] for r in rag_quality_results) / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )
        avg_query_ai_score = (
            sum(r["query_ai_evaluation"].get("overall_score", 0.0) for r in rag_quality_results)
            / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )
        avg_performance_score = (
            sum(r["performance_metrics"].get("performance_score", 0.0) for r in rag_quality_results)
            / len(rag_quality_results)
            if rag_quality_results
            else 0.0
        )

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
                "evaluation_method": "RAG pipeline with AI assessment and e2e quality metrics",
                "queries_tested": len(scientific_queries),
                "total_retrieval_time_seconds": round(total_retrieval_time, 2),
                "avg_retrieval_time_seconds": round(avg_retrieval_time, 2),
                "total_documents_retrieved": total_docs_retrieved,
                "successful_retrievals": successful_retrievals,
                "retrieval_success_rate": successful_retrievals / len(scientific_queries)
                if scientific_queries
                else 0.0,
                "avg_relevance_score": round(avg_relevance, 3),
                "avg_diversity_score": round(avg_diversity_score, 3),
                "avg_query_quality_diversity": round(avg_query_quality, 3),
                "avg_query_ai_score": round(avg_query_ai_score, 3),
                "avg_performance_score": round(avg_performance_score, 3),
                "individual_query_results": rag_quality_results,
            },
        }

        all_results.append(result)

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

    configurable_analysis = generate_rag_quality_analysis(all_results, configurations)

    report_path = rag_quality_results_dir / f"configurable_rag_quality_report_{test_id}.json"
    save_evaluation_results(configurable_analysis, report_path)

    markdown_path = rag_quality_results_dir / f"configurable_rag_quality_summary_{test_id}.md"
    generate_markdown_summary(configurable_analysis, markdown_path)

    if "comprehensive_comparison" in configurable_analysis:
        csv_path = rag_quality_results_dir / f"configurable_rag_quality_comparison_{test_id}.csv"
        with csv_path.open("w") as f:
            f.write(configurable_analysis["comprehensive_comparison"]["csv_table"])

    print_rag_quality_summary(configurable_analysis)

    logger.info(
        "🏆 configurable RAG QUALITY BENCHMARK COMPLETED!",
        configurations_tested=len(all_results),
        json_report_path=str(report_path),
        markdown_report_path=str(markdown_path),
        analysis_type="RAG pipeline with AI evaluation",
    )

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

        assert result_insertion_throughput > 1, (
            f"Low insertion throughput for {result_config_name}: {result_insertion_throughput}"
        )
        assert result_search_throughput > 0.1, (
            f"Low search throughput for {result_config_name}: {result_search_throughput}"
        )
        assert cast("dict[str, Any]", result["chunking_analysis"])["chunk_count"] > 0, (
            f"No chunks generated for {result_config_name}"
        )

        assert result_success_rate >= 0.5, f"Low retrieval success rate for {result_config_name}: {result_success_rate}"
        assert result_avg_relevance >= 0, f"Invalid relevance score for {result_config_name}: {result_avg_relevance}"

        logger.info("✅ All assertions passed for config", config=result_config_name)


def calculate_std_dev(values: list[int]) -> float:
    if not values:
        return 0.0

    mean = float(sum(values)) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    return float(variance**0.5)


def extract_model_data_from_results(results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    model_data = {}

    for result in results:
        config_name = result["configuration"]["name"]
        model_name = result["configuration"]["embedding"]["model"]
        dimension = result["configuration"]["embedding"]["dimension"]

        perf = result["performance_metrics"]
        chunk = result["chunking_analysis"]
        rag = result["rag_quality_evaluation"]

        model_data[config_name] = {
            "model_name": model_name,
            "dimension": f"{dimension}d",
            "description": result["configuration"]["description"],
            "insertion_throughput": round(perf["insertion_benchmark"]["throughput_vectors_per_sec"], 1),
            "search_throughput": round(perf["search_benchmark"]["throughput_queries_per_sec"], 1),
            "memory_usage": round(perf["total_memory_mb"], 2),
            "chunk_count": chunk["chunk_count"],
            "avg_chunk_size": chunk["avg_chunk_size"],
            "chunk_coverage": round(chunk["coverage_ratio"], 3),
            "avg_relevance": round(rag["avg_relevance_score"], 3),
            "success_rate": round(rag["retrieval_success_rate"] * 100, 1),
            "avg_retrieval_time": round(rag["avg_retrieval_time_seconds"], 2),
            "total_docs_retrieved": rag["total_documents_retrieved"],
            "diversity_score": round(rag.get("avg_diversity_score", 0), 3),
            "query_quality": round(rag.get("avg_query_quality_diversity", 0), 3),
            "query_ai_score": round(rag.get("avg_query_ai_score", 0), 3),
            "performance_score": round(rag.get("avg_performance_score", 0), 3),
        }

    return model_data


def generate_markdown_comparison_table(model_data: dict[str, dict[str, Any]]) -> str:
    if not model_data:
        return "❌ No model data available"

    models = list(model_data.keys())

    return f"""# RAG Model Comparison - Complete Results Table

**Generated**: {datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")}
**Models Compared**: {len(models)} configurations

## Model Overview

| Metric | {" | ".join(models)} |
|--------|{"-|" * len(models)}
| **Model Name** | {" | ".join(model_data[m]["model_name"].split("/")[-1] for m in models)} |
| **Dimension** | {" | ".join(model_data[m]["dimension"] for m in models)} |
| **Description** | {" | ".join(model_data[m]["description"] for m in models)} |

## Performance Metrics

| Metric | {" | ".join(models)} |
|--------|{"-|" * len(models)}
| **Insertion Throughput** (ops/sec) | {" | ".join(str(model_data[m]["insertion_throughput"]) for m in models)} |
| **Search Throughput** (ops/sec) | {" | ".join(str(model_data[m]["search_throughput"]) for m in models)} |
| **Memory Usage** (MB) | {" | ".join(str(model_data[m]["memory_usage"]) for m in models)} |

## Chunking Analysis

| Metric | {" | ".join(models)} |
|--------|{"-|" * len(models)}
| **Chunk Count** | {" | ".join(str(model_data[m]["chunk_count"]) for m in models)} |
| **Avg Chunk Size** (chars) | {" | ".join(str(model_data[m]["avg_chunk_size"]) for m in models)} |
| **Coverage Ratio** | {" | ".join(str(model_data[m]["chunk_coverage"]) for m in models)} |

## RAG Quality Metrics

| Metric | {" | ".join(models)} |
|--------|{"-|" * len(models)}
| **Avg Relevance Score** (1-5) | {" | ".join(str(model_data[m]["avg_relevance"]) for m in models)} |
| **Success Rate** (%) | {" | ".join(str(model_data[m]["success_rate"]) + "%" for m in models)} |
| **Avg Retrieval Time** (sec) | {" | ".join(str(model_data[m]["avg_retrieval_time"]) for m in models)} |
| **Total Docs Retrieved** | {" | ".join(str(model_data[m]["total_docs_retrieved"]) for m in models)} |

## Advanced Quality Metrics

| Metric | {" | ".join(models)} |
|--------|{"-|" * len(models)}
| **Diversity Score** | {" | ".join(str(model_data[m]["diversity_score"]) for m in models)} |
| **Query Quality Score** | {" | ".join(str(model_data[m]["query_quality"]) for m in models)} |
| **Query AI Score** | {" | ".join(str(model_data[m]["query_ai_score"]) for m in models)} |
| **Performance Score** | {" | ".join(str(model_data[m]["performance_score"]) for m in models)} |

## Key Insights

### Performance Analysis
- **Fastest Insertion**: {max(models, key=lambda m: model_data[m]["insertion_throughput"])} ({max(model_data[m]["insertion_throughput"] for m in models)} ops/sec)
- **Fastest Search**: {max(models, key=lambda m: model_data[m]["search_throughput"])} ({max(model_data[m]["search_throughput"] for m in models)} ops/sec)
- **Most Efficient**: {min(models, key=lambda m: abs(model_data[m]["memory_usage"]))} ({min(abs(model_data[m]["memory_usage"]) for m in models)} MB)

### Quality Analysis
- **Highest Relevance**: {max(models, key=lambda m: model_data[m]["avg_relevance"])} ({max(model_data[m]["avg_relevance"] for m in models)}/5)
- **Best Success Rate**: {max(models, key=lambda m: model_data[m]["success_rate"])} ({max(model_data[m]["success_rate"] for m in models)}%)
- **Most Documents**: {max(models, key=lambda m: model_data[m]["total_docs_retrieved"])} ({max(model_data[m]["total_docs_retrieved"] for m in models)} docs)

---

*Complete benchmark data available in JSON format for detailed analysis*
"""


def generate_csv_comparison_table(model_data: dict[str, dict[str, Any]]) -> str:
    if not model_data:
        return "No model data available"

    models = list(model_data.keys())

    csv = "Metric," + ",".join(models) + "\\n"

    csv += "Model Name," + ",".join(model_data[m]["model_name"].split("/")[-1] for m in models) + "\\n"
    csv += "Dimension," + ",".join(model_data[m]["dimension"] for m in models) + "\\n"
    csv += "Description," + ",".join(f'"{model_data[m]["description"]}"' for m in models) + "\\n"
    csv += "\\n"

    csv += (
        "Insertion Throughput (ops/sec)," + ",".join(str(model_data[m]["insertion_throughput"]) for m in models) + "\\n"
    )
    csv += "Search Throughput (ops/sec)," + ",".join(str(model_data[m]["search_throughput"]) for m in models) + "\\n"
    csv += "Memory Usage (MB)," + ",".join(str(model_data[m]["memory_usage"]) for m in models) + "\\n"
    csv += "\\n"

    csv += "Chunk Count," + ",".join(str(model_data[m]["chunk_count"]) for m in models) + "\\n"
    csv += "Avg Chunk Size," + ",".join(str(model_data[m]["avg_chunk_size"]) for m in models) + "\\n"
    csv += "Coverage Ratio," + ",".join(str(model_data[m]["chunk_coverage"]) for m in models) + "\\n"
    csv += "\\n"

    csv += "Avg Relevance Score," + ",".join(str(model_data[m]["avg_relevance"]) for m in models) + "\\n"
    csv += "Success Rate (%)," + ",".join(str(model_data[m]["success_rate"]) for m in models) + "\\n"
    csv += "Avg Retrieval Time (sec)," + ",".join(str(model_data[m]["avg_retrieval_time"]) for m in models) + "\\n"
    csv += "Total Docs Retrieved," + ",".join(str(model_data[m]["total_docs_retrieved"]) for m in models) + "\\n"
    csv += "\\n"

    csv += "Diversity Score," + ",".join(str(model_data[m]["diversity_score"]) for m in models) + "\\n"
    csv += "Query Quality Score," + ",".join(str(model_data[m]["query_quality"]) for m in models) + "\\n"
    csv += "Query AI Score," + ",".join(str(model_data[m]["query_ai_score"]) for m in models) + "\\n"
    csv += "Performance Score," + ",".join(str(model_data[m]["performance_score"]) for m in models) + "\\n"

    return csv


def generate_rag_quality_analysis(
    results: list[dict[str, Any]], configurations: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    model_comparison_data = extract_model_data_from_results(results)

    chunking_comparison = generate_dynamic_chunking_comparison(results)

    return {
        "summary": {
            "test_purpose": "configurable RAG quality benchmark using production pipeline",
            "evaluation_method": "retrieve_documents() + evaluate_retrieval_relevance() AI assessment",
            "configurations_tested": [r["configuration"]["name"] for r in results],
            "test_timestamp": datetime.now(UTC).isoformat(),
            "total_configurations": len(results),
        },
        "comprehensive_comparison": {
            "model_data": model_comparison_data,
            "markdown_table": generate_markdown_comparison_table(model_comparison_data),
            "csv_table": generate_csv_comparison_table(model_comparison_data),
        },
        "chunking_strategy_analysis": chunking_comparison,
        "configurable_insights": generate_rag_configurable_insights(results, chunking_comparison),
        "detailed_results": results,
    }


def extract_rag_config_summary(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "chunk_count": result["chunking_analysis"]["chunk_count"],
        "avg_chunk_size": result["chunking_analysis"]["avg_chunk_size"],
        "insertion_throughput": result["performance_metrics"]["insertion_benchmark"]["throughput_vectors_per_sec"],
        "search_throughput": result["performance_metrics"]["search_benchmark"]["throughput_queries_per_sec"],
        "total_memory_mb": result["performance_metrics"]["total_memory_mb"],
        "avg_relevance_score": result["rag_quality_evaluation"]["avg_relevance_score"],
        "retrieval_success_rate": result["rag_quality_evaluation"]["retrieval_success_rate"],
        "avg_retrieval_time": result["rag_quality_evaluation"]["avg_retrieval_time_seconds"],
        "avg_diversity_score": result["rag_quality_evaluation"]["avg_diversity_score"],
        "avg_query_quality_diversity": result["rag_quality_evaluation"]["avg_query_quality_diversity"],
        "avg_query_ai_score": result["rag_quality_evaluation"]["avg_query_ai_score"],
        "avg_performance_score": result["rag_quality_evaluation"]["avg_performance_score"],
    }


def calculate_rag_comparison_ratios(config1: dict[str, Any], config2: dict[str, Any]) -> dict[str, float]:
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
        else 0,
    }


def create_rag_best_summary(result: dict[str, Any] | None, metric_type: str) -> dict[str, Any] | None:
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
    elif metric_type == "diversity":
        base["avg_diversity_score"] = round(result["rag_quality_evaluation"]["avg_diversity_score"], 3)
    elif metric_type == "query_quality":
        base["avg_query_quality_diversity"] = round(result["rag_quality_evaluation"]["avg_query_quality_diversity"], 3)
    elif metric_type == "query_ai":
        base["avg_query_ai_score"] = round(result["rag_quality_evaluation"]["avg_query_ai_score"], 3)
    elif metric_type == "performance":
        base["avg_performance_score"] = round(result["rag_quality_evaluation"]["avg_performance_score"], 3)

    return base


def generate_dynamic_chunking_comparison(results: list[dict[str, Any]]) -> dict[str, Any] | None:
    if len(results) < 2:
        return None

    model_groups: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        model_name = result["configuration"]["embedding"]["model"]
        if model_name not in model_groups:
            model_groups[model_name] = []
        model_groups[model_name].append(result)

    best_comparison = None
    for model_name, group_results in model_groups.items():
        if len(group_results) >= 2:
            sorted_by_chunk = sorted(group_results, key=lambda r: r["configuration"]["chunking"]["max_chars"])
            smallest_chunks = sorted_by_chunk[0]
            largest_chunks = sorted_by_chunk[-1]

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
                break

    return best_comparison


def get_model_display_name(model_name: str, dimension: int) -> str:
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
    model_short = model_name.split("/")[-1] if "/" in model_name else model_name
    return f"{model_short} ({dimension}d)"


def generate_rag_configurable_insights(
    results: list[dict[str, Any]], chunking_comparison: dict[str, Any] | None
) -> dict[str, str]:
    insights = {}

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

    model_384d = [r for r in results if r["configuration"]["embedding"]["dimension"] == 384]
    model_768d = [r for r in results if r["configuration"]["embedding"]["dimension"] == 768]

    if model_384d and model_768d:
        avg_384_memory = sum(r["performance_metrics"]["total_memory_mb"] for r in model_384d) / len(model_384d)
        avg_768_memory = sum(r["performance_metrics"]["total_memory_mb"] for r in model_768d) / len(model_768d)
        memory_ratio = avg_768_memory / avg_384_memory if avg_384_memory != 0 else 0
        insights["dimension_memory"] = f"768d models use {memory_ratio:.1f}x more memory than 384d models"

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
    markdown_lines = []

    markdown_lines.extend(_build_header_section(analysis["summary"]))
    markdown_lines.extend(_build_configs_section(analysis))

    if "comprehensive_comparison" in analysis:
        markdown_lines.append("## Comprehensive Model Comparison")
        markdown_lines.append("")
        markdown_lines.append(analysis["comprehensive_comparison"]["markdown_table"])
        markdown_lines.append("")

    markdown_lines.extend(_build_comparison_section(analysis.get("chunking_strategy_analysis")))
    markdown_lines.extend(_build_insights_section(analysis.get("configurable_insights", {})))
    markdown_lines.extend(_build_footer_section(analysis["summary"]))

    with output_path.open("w") as f:
        f.write("\n".join(markdown_lines))


def _build_header_section(summary: dict[str, Any]) -> list[str]:
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
    lines = ["## Best RAG Quality Results", ""]

    categories = {
        "best_relevance_score": "Best Relevance Score",
        "best_retrieval_success_rate": "Best Retrieval Success Rate",
        "fastest_retrieval_time": "Best Retrieval Time",
        "most_documents_retrieved": "Best Document Retrieval",
        "best_diversity_score": "Best Document Diversity",
        "best_query_quality": "Best Query Quality",
        "best_query_ai_score": "Best Query AI Score",
        "best_performance_score": "Best Performance Score",
    }

    for key, title in categories.items():
        best = rag_best.get(key)
        if best:
            lines.extend(_format_best_section(title, best))

    return lines


def _format_best_section(title: str, best: dict[str, Any]) -> list[str]:
    lines = [f"### {title}", f"**Best**: {best['config']} - {best['description']}"]

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
    if "avg_diversity_score" in best:
        lines.append(f"- **Diversity Score**: {best['avg_diversity_score']:.3f}")
    if "avg_query_quality_diversity" in best:
        lines.append(f"- **Query Quality**: {best['avg_query_quality_diversity']:.3f}")
    if "avg_query_ai_score" in best:
        lines.append(f"- **Query AI Score**: {best['avg_query_ai_score']:.3f}")
    if "avg_performance_score" in best:
        lines.append(f"- **Performance Score**: {best['avg_performance_score']:.3f}")

    lines.append("")
    return lines


def _build_comparison_section(chunking_analysis: dict[str, Any] | None) -> list[str]:
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

    header_a = f"{config_a['config_name']} ({config_a['chunk_size']} chars)"
    header_b = f"{config_b['config_name']} ({config_b['chunk_size']} chars)"
    lines.extend(
        [
            f"| Metric | {header_a} | {header_b} | Ratio |",
            f"|--------|{'-' * len(header_a)}|{'-' * len(header_b)}|-------|",
        ]
    )

    lines.extend(
        _build_comparison_rows(config_a["metrics"], config_b["metrics"], chunking_analysis["comparison_ratios"])
    )
    lines.append("")

    return lines


def _build_comparison_rows(metrics_a: dict[str, Any], metrics_b: dict[str, Any], ratios: dict[str, float]) -> list[str]:
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
    return [
        "---",
        "",
        f"*Report generated on {summary['test_timestamp']}*",
        "",
        "*Full detailed results available in JSON format*",
    ]


def print_rag_quality_summary(analysis: dict[str, Any]) -> None:
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
