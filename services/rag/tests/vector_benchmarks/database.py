import os

from packages.db.src.tables import Base
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .synthetic_migrations import BENCHMARK_CONFIGURATIONS, VectorTableModifier

logger = get_logger(__name__)


class VectorBenchmarkDatabaseManager:
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
        if not self.session_maker:
            raise RuntimeError("Database not set up. Call setup_benchmark_database() first.")
        return self.session_maker

    async def cleanup_benchmark_database(self) -> None:
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
    manager = VectorBenchmarkDatabaseManager()
    await manager.setup_benchmark_database()
    await manager.apply_vector_configuration(config_name)
    return manager
