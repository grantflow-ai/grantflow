"""
Comprehensive Parameter Matrix for Vector Optimization

This module defines systematic parameter combinations for thorough performance testing.
Instead of random fuzzing, we test meaningful combinations that help optimize production settings.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class VectorTestParameters:
    """Parameters for a single vector benchmark configuration."""

    dimension: int
    dataset_size: int

    m: int
    ef_construction: int

    batch_size: int
    search_k: int

    name: str
    description: str
    expected_use_case: str


class ParameterMatrix:
    """
    Generates comprehensive parameter combinations for systematic testing.

    This focuses on realistic production scenarios rather than exhaustive testing.
    """

    DIMENSIONS = [128, 256, 384, 512, 768]
    DATASET_SIZES = [1000, 5000, 10000, 25000]

    M_VALUES = [16, 32, 48, 64]
    EF_CONSTRUCTION_VALUES = [64, 128, 256, 512]

    BATCH_SIZES = [100, 500, 1000, 2000]
    SEARCH_K_VALUES = [5, 10, 20, 50]

    @classmethod
    def generate_dimension_optimization_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix focused on dimension optimization.

        Tests all dimensions with balanced parameters to find optimal dimension.
        """

        base_params = {
            "m": 32,
            "ef_construction": 256,
            "batch_size": 1000,
            "search_k": 10,
            "dataset_size": 5000,
        }

        return [
            VectorTestParameters(
                dimension=dim,
                name=f"dimension_opt_{dim}d",
                description=f"Dimension optimization test: {dim}d vectors",
                expected_use_case=f"Comparing {dim}d performance vs other dimensions",
                **base_params,
            )
            for dim in cls.DIMENSIONS
        ]

    @classmethod
    def generate_hnsw_optimization_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix focused on HNSW parameter optimization.

        Tests different M and ef_construction combinations to find optimal index settings.
        """
        matrix = []

        base_params = {
            "dimension": 384,
            "dataset_size": 10000,
            "batch_size": 1000,
            "search_k": 10,
        }

        hnsw_combinations = [
            (16, 64, "fast_index", "Optimized for speed"),
            (16, 128, "fast_balanced", "Fast build, decent quality"),
            (32, 128, "balanced_standard", "Good balance of speed and quality"),
            (32, 256, "balanced_quality", "Balanced with better quality"),
            (48, 256, "current_production", "Current production settings"),
            (48, 512, "production_quality", "Production with higher quality"),
            (64, 256, "quality_standard", "Quality-focused with standard build"),
            (64, 512, "quality_optimized", "Maximum quality settings"),
        ]

        for m, ef_construction, name, description in hnsw_combinations:
            matrix.append(
                VectorTestParameters(
                    m=m,
                    ef_construction=ef_construction,
                    name=f"hnsw_opt_{name}",
                    description=f"HNSW optimization: {description}",
                    expected_use_case=f"M={m}, ef_construction={ef_construction} for {description.lower()}",
                    **base_params,
                )
            )

        return matrix

    @classmethod
    def generate_scale_optimization_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix focused on dataset size scaling.

        Tests how performance scales with different dataset sizes.
        """
        matrix = []

        base_params = {
            "dimension": 384,
            "m": 48,
            "ef_construction": 256,
            "batch_size": 1000,
            "search_k": 10,
        }

        scale_tests = [
            (1000, "small_dataset", "Small dataset performance"),
            (5000, "medium_dataset", "Medium dataset performance"),
            (10000, "large_dataset", "Large dataset performance"),
            (25000, "xl_dataset", "Extra large dataset performance"),
        ]

        for dataset_size, name, description in scale_tests:
            matrix.append(
                VectorTestParameters(
                    dataset_size=dataset_size,
                    name=f"scale_opt_{name}",
                    description=f"Scale optimization: {description}",
                    expected_use_case=f"Testing {dataset_size} vector performance",
                    **base_params,
                )
            )

        return matrix

    @classmethod
    def generate_batch_optimization_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix focused on batch size optimization.

        Tests different batch sizes to find optimal insertion strategy.
        """
        matrix = []

        base_params = {
            "dimension": 384,
            "dataset_size": 10000,
            "m": 48,
            "ef_construction": 256,
            "search_k": 10,
        }

        batch_tests = [
            (100, "small_batch", "Small batch insertion"),
            (500, "medium_batch", "Medium batch insertion"),
            (1000, "standard_batch", "Standard batch insertion"),
            (2000, "large_batch", "Large batch insertion"),
        ]

        for batch_size, name, description in batch_tests:
            matrix.append(
                VectorTestParameters(
                    batch_size=batch_size,
                    name=f"batch_opt_{name}",
                    description=f"Batch optimization: {description}",
                    expected_use_case=f"Testing {batch_size} vector batches",
                    **base_params,
                )
            )

        return matrix

    @classmethod
    def generate_search_optimization_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix focused on search parameter optimization.

        Tests different search k values and their impact on performance.
        """
        matrix = []

        base_params = {
            "dimension": 384,
            "dataset_size": 10000,
            "m": 48,
            "ef_construction": 256,
            "batch_size": 1000,
        }

        search_tests = [
            (5, "top5_search", "Top 5 results search"),
            (10, "top10_search", "Top 10 results search"),
            (20, "top20_search", "Top 20 results search"),
            (50, "top50_search", "Top 50 results search"),
        ]

        for search_k, name, description in search_tests:
            matrix.append(
                VectorTestParameters(
                    search_k=search_k,
                    name=f"search_opt_{name}",
                    description=f"Search optimization: {description}",
                    expected_use_case=f"Testing k={search_k} search performance",
                    **base_params,
                )
            )

        return matrix

    @classmethod
    def generate_comprehensive_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate a comprehensive matrix covering all optimization areas.

        This is the main function for systematic performance testing.
        """
        matrix = []

        matrix.extend(cls.generate_dimension_optimization_matrix())
        matrix.extend(cls.generate_hnsw_optimization_matrix())
        matrix.extend(cls.generate_scale_optimization_matrix())
        matrix.extend(cls.generate_batch_optimization_matrix())
        matrix.extend(cls.generate_search_optimization_matrix())

        return matrix

    @classmethod
    def generate_production_candidates_matrix(cls) -> list[VectorTestParameters]:
        """
        Generate matrix of top production candidates.

        Based on initial testing, test the most promising configurations
        with larger datasets for production decision making.
        """

        return [
            VectorTestParameters(
                dimension=128,
                dataset_size=25000,
                m=32,
                ef_construction=128,
                batch_size=1000,
                search_k=10,
                name="production_fast",
                description="Fast production candidate: 128d, optimized for speed",
                expected_use_case="High-throughput applications requiring fast responses",
            ),
            VectorTestParameters(
                dimension=256,
                dataset_size=25000,
                m=32,
                ef_construction=256,
                batch_size=1000,
                search_k=10,
                name="production_balanced",
                description="Balanced production candidate: 256d, speed/quality balance",
                expected_use_case="General purpose applications",
            ),
            VectorTestParameters(
                dimension=384,
                dataset_size=25000,
                m=48,
                ef_construction=256,
                batch_size=1000,
                search_k=10,
                name="production_current",
                description="Current production configuration: 384d baseline",
                expected_use_case="Current GrantFlow.AI setup",
            ),
            VectorTestParameters(
                dimension=384,
                dataset_size=25000,
                m=64,
                ef_construction=512,
                batch_size=500,
                search_k=20,
                name="production_quality",
                description="Quality production candidate: 384d, optimized for accuracy",
                expected_use_case="High-precision applications requiring best search quality",
            ),
        ]

    @classmethod
    def get_matrix_summary(cls, matrix: list[VectorTestParameters]) -> dict[str, Any]:
        """Get summary statistics for a parameter matrix."""
        if not matrix:
            return {}

        return {
            "total_configurations": len(matrix),
            "dimension_range": f"{min(p.dimension for p in matrix)}-{max(p.dimension for p in matrix)}",
            "dataset_size_range": f"{min(p.dataset_size for p in matrix)}-{max(p.dataset_size for p in matrix)}",
            "m_range": f"{min(p.m for p in matrix)}-{max(p.m for p in matrix)}",
            "ef_construction_range": f"{min(p.ef_construction for p in matrix)}-{max(p.ef_construction for p in matrix)}",
            "batch_size_range": f"{min(p.batch_size for p in matrix)}-{max(p.batch_size for p in matrix)}",
            "search_k_range": f"{min(p.search_k for p in matrix)}-{max(p.search_k for p in matrix)}",
            "estimated_runtime_minutes": len(matrix) * 2,
        }


DIMENSION_OPTIMIZATION_MATRIX = ParameterMatrix.generate_dimension_optimization_matrix()
HNSW_OPTIMIZATION_MATRIX = ParameterMatrix.generate_hnsw_optimization_matrix()
SCALE_OPTIMIZATION_MATRIX = ParameterMatrix.generate_scale_optimization_matrix()
BATCH_OPTIMIZATION_MATRIX = ParameterMatrix.generate_batch_optimization_matrix()
SEARCH_OPTIMIZATION_MATRIX = ParameterMatrix.generate_search_optimization_matrix()
COMPREHENSIVE_MATRIX = ParameterMatrix.generate_comprehensive_matrix()
PRODUCTION_CANDIDATES_MATRIX = ParameterMatrix.generate_production_candidates_matrix()
