import asyncio
from os import environ
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import BackofficeAdmin, GrantingInstitution
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

logger = get_logger(__name__)


async def seed_db() -> None:
    load_dotenv()

    if "DATABASE_CONNECTION_STRING" not in environ:
        environ["DATABASE_CONNECTION_STRING"] = "postgresql+asyncpg://local:local@db:5432/local"
        logger.info("Using local database connection")
    else:
        logger.info("Using configured database connection")

    session_maker = get_session_maker()

    granting_institutions_json = Path(__file__).parent / "granting_institutions.json"

    async with session_maker() as session, session.begin():
        try:
            # Seed granting institutions
            granting_institutions = deserialize(granting_institutions_json.read_bytes(), list[dict[str, Any]])

            stmt = insert(GrantingInstitution).values(granting_institutions)
            stmt = stmt.on_conflict_do_nothing(index_elements=["full_name"])

            result = await session.execute(stmt)
            logger.info(f"Granting institutions seeded: {result.rowcount} new entries")

            # Seed backoffice admins
            backoffice_admins_data = [
                {"email": "asaf@grantflow.ai"},
                {"email": "naaman@grantflow.ai"},
                {"email": "tirza@grantflow.ai"},
                {"email": "tsveta@grantflow.ai"},
                {"email": "varun@grantflow.ai"},
                {"email": "luca@grantflow.ai"},
                {"email": "yatanvesh@grantflow.ai"},
            ]

            stmt = insert(BackofficeAdmin).values(backoffice_admins_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["email"])

            result = await session.execute(stmt)
            logger.info(f"Backoffice admins seeded: {result.rowcount} new entries")

            logger.info("Seeding complete")

        except SQLAlchemyError as e:
            logger.error(f"Error seeding database: {e}")
            raise e


if __name__ == "__main__":
    asyncio.run(seed_db())
