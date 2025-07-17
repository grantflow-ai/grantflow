"""
Vector Benchmark Database Manager

This module manages test databases for vector benchmarking by:
1. Creating isolated test database with production schema
2. Applying synthetic migrations to modify vector dimensions
3. Using real production code for benchmarking
4. Cleaning up after tests

Key advantage: Tests your actual code paths with different vector configurations!
"""

import os

from packages.db.src.tables import Base
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .synthetic_migrations import BENCHMARK_CONFIGURATIONS, VectorTableModifier

logger = get_logger(__name__)


class VectorBenchmarkDatabaseManager:
    """
    Manages isolated test database for vector benchmarking.

    This creates a separate database with the full production schema,
    then applies synthetic migrations to test different vector configurations.

    Usage:
        manager = VectorBenchmarkDatabaseManager()
        await manager.setup_benchmark_database()

        # Database now has production schema ready for modification
        async with manager.get_session() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(256)
            # Now test with 256d vectors using production code!
    """

    def __init__(self) -> None:
        self.worker_id = os.getenv("PYTEST_XDIST_WORKER", "main")
        self.process_id = os.getpid()
        self.db_name = f"grantflow_vector_benchmark_{self.worker_id}_{self.process_id}"

        base_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost:5432/postgres")
        self.benchmark_db_url = base_url.replace("/postgres", f"/{self.db_name}")
        self.admin_db_url = base_url

        self.engine: AsyncEngine | None = None
        self.session_maker: async_sessionmaker[AsyncSession] | None = None
        self.current_modifier: VectorTableModifier | None = None

    async def setup_benchmark_database(self) -> None:
        """
        Creates isolated test database with full production schema.

        Steps:
        1. Create new database
        2. Enable pgvector extension
        3. Create all production tables (users, projects, rag_sources, text_vectors, etc.)
        4. Ready for synthetic migrations!
        """
        logger.info("Setting up benchmark database", db_name=self.db_name)

        admin_engine = create_async_engine(self.admin_db_url, isolation_level="AUTOCOMMIT")

        try:
            async with admin_engine.begin() as conn:
                await conn.execute(text(f"DROP DATABASE IF EXISTS {self.db_name}"))

                await conn.execute(text(f"CREATE DATABASE {self.db_name}"))
                logger.info("Created database", db_name=self.db_name)
        finally:
            await admin_engine.dispose()

        self.engine = create_async_engine(self.benchmark_db_url)

        async with self.engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

            await conn.run_sync(Base.metadata.create_all)

            logger.info("Created production schema with pgvector extension")

        self.session_maker = async_sessionmaker(self.engine, expire_on_commit=False)

        logger.info("Benchmark database ready", db_url=self.benchmark_db_url)

    async def apply_vector_configuration(self, config_name: str) -> VectorTableModifier:
        """
        Applies a predefined vector configuration for benchmarking.

        Args:
            config_name: One of the keys from BENCHMARK_CONFIGURATIONS
                        e.g., "small_fast", "medium_balanced", "current_production"

        Returns:
            VectorTableModifier instance for further customization

        Example:
            modifier = await manager.apply_vector_configuration("small_fast")
            # Now text_vectors table has 128d vectors with fast HNSW index
        """
        if config_name not in BENCHMARK_CONFIGURATIONS:
            raise ValueError(
                f"Unknown configuration: {config_name}. Available: {list(BENCHMARK_CONFIGURATIONS.keys())}"
            )

        config = BENCHMARK_CONFIGURATIONS[config_name]
        logger.info("Applying configuration", config_name=config_name, description=config["description"])

        if self.session_maker is None:
            raise RuntimeError("Database not set up. Call setup_benchmark_database() first.")

        async with self.session_maker() as session:
            modifier = VectorTableModifier(session)

            dimension = (
                int(str(config.get("dimension")))
                if "dimension" in config and config.get("dimension") is not None
                else 384
            )

            await modifier.modify_vector_dimension(dimension)

            if "index_params" in config:
                index_params = config["index_params"]
                if isinstance(index_params, dict):
                    m_value = index_params.get("m", 48)
                    ef_construction_value = index_params.get("ef_construction", 256)

                    m = int(str(m_value)) if m_value is not None else 48
                    ef_construction = int(str(ef_construction_value)) if ef_construction_value is not None else 256

                    await modifier.modify_index_parameters(m=m, ef_construction=ef_construction)

            self.current_modifier = modifier

            logger.info("Applied configuration", config_name=config_name)
            return modifier

    def get_session(self) -> async_sessionmaker[AsyncSession]:
        """
        Returns session maker for database operations.

        Use this to get sessions for your benchmark tests:

        async with manager.get_session() as session:
            # Your benchmark code here - uses production models!
            result = await session.execute(select(TextVector).limit(10))
        """
        if not self.session_maker:
            raise RuntimeError("Database not set up. Call setup_benchmark_database() first.")
        return self.session_maker

    async def cleanup_benchmark_database(self) -> None:
        """
        Cleans up test database and restores any schema modifications.

        Always call this after tests to avoid leaving modified databases around.
        """
        logger.info("Cleaning up benchmark database", db_name=self.db_name)

        if self.current_modifier is not None:
            try:
                if self.session_maker is None:
                    logger.warning("Session maker is None, cannot restore schema")
                else:
                    async with self.session_maker() as session:
                        modifier = VectorTableModifier(session)
                        await modifier.restore_original_schema()
                        logger.info("Schema restored to original state")
            except Exception as e:
                logger.warning("Error restoring schema", error=str(e))

        if self.engine:
            await self.engine.dispose()

        admin_engine = create_async_engine(self.admin_db_url, isolation_level="AUTOCOMMIT")
        try:
            async with admin_engine.begin() as conn:
                await conn.execute(text(f"DROP DATABASE IF EXISTS {self.db_name}"))
                logger.info("Dropped database", db_name=self.db_name)
        except Exception as e:
            logger.warning("Error dropping database", db_name=self.db_name, error=str(e))
        finally:
            await admin_engine.dispose()

    async def reset_tables(self) -> None:
        """
        Clears all data from tables without dropping schema.

        Use this between benchmark runs to ensure clean state.
        """
        if not self.session_maker:
            return

        logger.info("Resetting benchmark tables")

        async with self.session_maker() as session:
            tables_to_clear = [
                "text_vectors",
                "rag_files",
                "rag_urls",
                "rag_sources",
                "grant_applications",
                "projects",
                "users",
            ]

            for table in tables_to_clear:
                try:
                    await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                except Exception as e:
                    logger.debug("Could not truncate table", table=table, error=str(e))

            await session.commit()
            logger.info("Tables reset successfully")


async def create_benchmark_database_with_config(config_name: str) -> VectorBenchmarkDatabaseManager:
    """
    One-liner to create benchmark database with specific configuration.

    Args:
        config_name: Configuration to apply (e.g., "small_fast", "current_production")

    Returns:
        Ready-to-use database manager

    Example:
        manager = await create_benchmark_database_with_config("small_fast")
        # Database now has 128d vectors with fast HNSW index

        async with manager.get_session() as session:
            # Use production code with modified vector table!
            pass
    """
    manager = VectorBenchmarkDatabaseManager()
    await manager.setup_benchmark_database()
    await manager.apply_vector_configuration(config_name)
    return manager
