"""
Synthetic Migrations for Vector Benchmarking

This module provides utilities to temporarily modify the production schema
for benchmarking different vector configurations. The key insight is that
we can test different vector dimensions using the same production code!

Key classes:
- VectorTableModifier: Applies temporary schema changes
- BENCHMARK_CONFIGURATIONS: Predefined test configurations

Usage:
    modifier = VectorTableModifier(session)
    await modifier.modify_vector_dimension(256)
    # Now your production code runs with 256d vectors!
"""

from typing import Any

from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class VectorTableModifier:
    """
    Applies synthetic modifications to the existing text_vectors table for benchmarking.

    This allows testing different vector dimensions and index parameters
    without creating a separate schema - we use the real production code!

    Example:
        async with session_maker() as session:
            modifier = VectorTableModifier(session)

            # Test with smaller vectors
            await modifier.modify_vector_dimension(128)
            # Now all your production RAG code uses 128d vectors!

            # Test with different index parameters
            await modifier.modify_index_parameters(m=32, ef_construction=128)
            # Now HNSW index is faster but potentially less accurate
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.original_dimension = 384
        self.applied_modifications: list[str] = []
        self._original_constants: dict[str, Any] = {}

    async def modify_vector_dimension(self, new_dimension: int) -> None:
        """
        Changes the vector column dimension for benchmarking.

        This is the core functionality - it lets you test your production
        code with different vector sizes to see performance impact.

        Steps:
        1. Drop existing HNSW index (PostgreSQL requires this before column changes)
        2. Clear existing vectors (they're the wrong dimension now)
        3. Drop and recreate the column with new dimension (bypasses SQLAlchemy constraints)
        4. Recreate index with same parameters

        Args:
            new_dimension: New vector dimension to test
                          Common values: 128, 256, 384 (current), 512, 768, 1024

        Example:
            await modifier.modify_vector_dimension(256)
            # Now embedding.shape == (256,) instead of (384,)
            # All your RAG code works unchanged!
        """
        logger.info(
            "Modifying text_vectors table", original_dimension=self.original_dimension, new_dimension=new_dimension
        )

        await self.session.execute(text("DROP INDEX IF EXISTS idx_text_vectors_embedding"))

        await self.session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))

        await self.session.execute(text("ALTER TABLE text_vectors DROP COLUMN embedding"))
        await self.session.execute(text(f"ALTER TABLE text_vectors ADD COLUMN embedding vector({new_dimension})"))

        index_sql = """
        CREATE INDEX idx_text_vectors_embedding ON text_vectors USING hnsw (embedding vector_cosine_ops)
        WITH (m = 48, ef_construction = 256)
        """
        await self.session.execute(text(index_sql))

        await self.session.commit()

        # CRITICAL: Invalidate prepared statement cache after schema change
        # This prevents "cached statement plan is invalid" errors when switching dimensions
        if hasattr(self.session.bind, "invalidate"):
            await self.session.bind.invalidate()

        # CRITICAL: Override SQLAlchemy Vector dimension constraint
        # The database schema is now changed, but SQLAlchemy still validates
        # against the hardcoded EMBEDDING_DIMENSIONS constant (384).
        # We need to temporarily override this for the benchmark.
        import packages.db.src.constants as db_constants

        if "EMBEDDING_DIMENSIONS" not in self._original_constants:
            self._original_constants["EMBEDDING_DIMENSIONS"] = db_constants.EMBEDDING_DIMENSIONS
        # Use type ignore to bypass Final assignment restriction
        db_constants.EMBEDDING_DIMENSIONS = new_dimension  # type: ignore[misc]

        # Override the pgvector dimension validation entirely during the test
        import pgvector

        # Store the original Vector._to_db method for restoration
        if "original_to_db" not in self._original_constants:
            self._original_constants["original_to_db"] = pgvector.Vector._to_db

        # Monkey-patch Vector._to_db to accept any dimension during benchmarks
        def bypass_dimension_check(value: Any, dim: int | None = None) -> str:
            # Properly format the vector for database storage, ignoring dimension constraint

            # Convert value to list format if needed
            if hasattr(value, "numpy"):
                result = value.numpy().tolist()
            elif isinstance(value, (list, tuple)):
                result = list(value)
            elif hasattr(value, "tolist"):
                result = value.tolist()
            else:
                result = value

            # Convert to string format expected by PostgreSQL pgvector
            if isinstance(result, list):
                return "[" + ",".join(str(x) for x in result) + "]"
            return str(result)

        pgvector.Vector._to_db = staticmethod(bypass_dimension_check)

        self.applied_modifications.append(f"dimension_{new_dimension}")
        logger.info(
            "Successfully modified table and SQLAlchemy constraints to new vector dimension",
            new_dimension=new_dimension,
        )

    async def modify_index_parameters(self, m: int = 48, ef_construction: int = 256) -> None:
        """
        Changes HNSW index parameters for benchmarking.

        HNSW is the index type used for fast similarity search. These parameters
        control the speed vs accuracy tradeoff:

        - m: Number of connections per node in the graph
          * Higher m = better recall (accuracy) but more memory usage
          * Lower m = faster queries but potentially worse recall
          * Production uses 48, try 16 (fast) or 64 (accurate)

        - ef_construction: Size of dynamic candidate list during index building
          * Higher ef_construction = better index quality but slower to build
          * Lower ef_construction = faster index building but potentially worse quality
          * Production uses 256, try 128 (fast build) or 512 (high quality)

        Args:
            m: HNSW M parameter (default 48 = production)
            ef_construction: HNSW ef_construction parameter (default 256 = production)

        Example:
            # Fast index (trades accuracy for speed)
            await modifier.modify_index_parameters(m=16, ef_construction=128)

            # High-quality index (trades speed for accuracy)
            await modifier.modify_index_parameters(m=64, ef_construction=512)
        """
        logger.info("Modifying HNSW index parameters", m=m, ef_construction=ef_construction)

        await self.session.execute(text("DROP INDEX IF EXISTS idx_text_vectors_embedding"))

        index_sql = f"""
        CREATE INDEX idx_text_vectors_embedding ON text_vectors USING hnsw (embedding vector_cosine_ops)
        WITH (m = {m}, ef_construction = {ef_construction})
        """
        await self.session.execute(text(index_sql))

        await self.session.commit()
        self.applied_modifications.append(f"index_m{m}_ef{ef_construction}")
        logger.info("Successfully modified index parameters")

    async def restore_original_schema(self) -> None:
        """
        Restores the original production schema.

        This ensures tests don't leave the database in a modified state.
        Always call this in test cleanup!
        """
        if not self.applied_modifications:
            return

        logger.info("Restoring original schema...")

        await self.session.execute(text("DROP INDEX IF EXISTS idx_text_vectors_embedding"))

        await self.session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))

        await self.session.execute(text("ALTER TABLE text_vectors DROP COLUMN embedding"))
        await self.session.execute(
            text(f"ALTER TABLE text_vectors ADD COLUMN embedding vector({self.original_dimension})")
        )

        original_index_sql = """
        CREATE INDEX idx_text_vectors_embedding ON text_vectors USING hnsw (embedding vector_cosine_ops)
        WITH (m = 48, ef_construction = 256)
        """
        await self.session.execute(text(original_index_sql))

        await self.session.commit()

        # Restore original SQLAlchemy constants
        if self._original_constants:
            import packages.db.src.constants as db_constants

            if "EMBEDDING_DIMENSIONS" in self._original_constants:
                # Use type ignore to bypass Final assignment restriction
                db_constants.EMBEDDING_DIMENSIONS = self._original_constants["EMBEDDING_DIMENSIONS"]  # type: ignore[misc]

            # Restore the original pgvector _to_db method
            if "original_to_db" in self._original_constants:
                import pgvector

                pgvector.Vector._to_db = self._original_constants["original_to_db"]

            self._original_constants.clear()

        self.applied_modifications.clear()
        logger.info("Schema and SQLAlchemy constraints restored to original state")


BENCHMARK_CONFIGURATIONS = {
    "small_fast": {
        "dimension": 128,
        "index_params": {"m": 16, "ef_construction": 128},
        "description": "Small vectors with fast index - good for speed-critical applications",
        "use_case": "Real-time search, mobile apps, high-throughput scenarios",
    },
    "medium_balanced": {
        "dimension": 256,
        "index_params": {"m": 32, "ef_construction": 256},
        "description": "Medium vectors with balanced index - good speed/accuracy compromise",
        "use_case": "Most applications, good starting point for optimization",
    },
    "current_production": {
        "dimension": 384,
        "index_params": {"m": 48, "ef_construction": 256},
        "description": "Current production configuration - baseline for comparison",
        "use_case": "Current GrantFlow.AI setup, optimized for sentence-transformers",
    },
    "large_quality": {
        "dimension": 512,
        "index_params": {"m": 64, "ef_construction": 512},
        "description": "Large vectors with quality index - best accuracy, slower speed",
        "use_case": "High-precision applications, research, when accuracy is critical",
    },
    "xl_experimental": {
        "dimension": 768,
        "index_params": {"m": 48, "ef_construction": 256},
        "description": "Extra large vectors - matches OpenAI embeddings dimension",
        "use_case": "Testing OpenAI-compatible embeddings, experimental setups",
    },
    "xxl_research": {
        "dimension": 1024,
        "index_params": {"m": 48, "ef_construction": 256},
        "description": "Very large vectors - research/experimental use",
        "use_case": "Research applications, specialized models, experimental features",
    },
}


def get_configuration_info(config_name: str) -> dict[str, Any]:
    """
    Get detailed information about a benchmark configuration.

    Args:
        config_name: Name of configuration

    Returns:
        Configuration details including dimension, index params, and use case

    Example:
        info = get_configuration_info("small_fast")
        print(f"Dimension: {info['dimension']}")
        print(f"Use case: {info['use_case']}")
    """
    if config_name not in BENCHMARK_CONFIGURATIONS:
        raise ValueError(f"Unknown configuration: {config_name}. Available: {list(BENCHMARK_CONFIGURATIONS.keys())}")

    return BENCHMARK_CONFIGURATIONS[config_name].copy()


def list_available_configurations() -> list[str]:
    """
    List all available benchmark configurations.

    Returns:
        List of configuration names

    Example:
        configs = list_available_configurations()
        for config in configs:
            info = get_configuration_info(config)
            print(f"{config}: {info['description']}")
    """
    return list(BENCHMARK_CONFIGURATIONS.keys())
