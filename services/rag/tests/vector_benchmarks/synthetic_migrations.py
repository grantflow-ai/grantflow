from typing import Any

from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class VectorTableModifier:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.original_dimension = 384
        self.applied_modifications: list[str] = []
        self._original_constants: dict[str, Any] = {}

    async def modify_vector_dimension(self, new_dimension: int) -> None:
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

        if hasattr(self.session.bind, "invalidate"):
            await self.session.bind.invalidate()

        import packages.db.src.constants as db_constants

        if "EMBEDDING_DIMENSIONS" not in self._original_constants:
            self._original_constants["EMBEDDING_DIMENSIONS"] = db_constants.EMBEDDING_DIMENSIONS
        db_constants.EMBEDDING_DIMENSIONS = new_dimension

        import pgvector

        if "original_to_db" not in self._original_constants:
            self._original_constants["original_to_db"] = pgvector.Vector._to_db

        def bypass_dimension_check(value: Any, dim: int | None = None) -> str:
            if hasattr(value, "numpy"):
                result = value.numpy().tolist()
            elif isinstance(value, (list, tuple)):
                result = list(value)
            elif hasattr(value, "tolist"):
                result = value.tolist()
            else:
                result = value

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

        if self._original_constants:
            import packages.db.src.constants as db_constants

            if "EMBEDDING_DIMENSIONS" in self._original_constants:
                db_constants.EMBEDDING_DIMENSIONS = self._original_constants["EMBEDDING_DIMENSIONS"]

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
    if config_name not in BENCHMARK_CONFIGURATIONS:
        raise ValueError(f"Unknown configuration: {config_name}. Available: {list(BENCHMARK_CONFIGURATIONS.keys())}")

    return BENCHMARK_CONFIGURATIONS[config_name].copy()


def list_available_configurations() -> list[str]:
    return list(BENCHMARK_CONFIGURATIONS.keys())
