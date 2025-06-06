import asyncio
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import FundingOrganization
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


async def seed_db() -> None:
    load_dotenv()
    session_maker = get_session_maker()

    funding_orgs_json = Path(__file__).parent / "funding_organizations.json"

    async with session_maker() as session, session.begin():
        try:
            funding_orgs = deserialize(funding_orgs_json.read_bytes(), list[dict[str, Any]])

            stmt = insert(FundingOrganization).values(funding_orgs)
            stmt = stmt.on_conflict_do_nothing(index_elements=['full_name'])

            result = await session.execute(stmt)
            await session.commit()

            rows_inserted = result.rowcount
            logger.info(f"Seeding complete: {rows_inserted} new funding organizations added")

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Error seeding database: {e}")
            raise e


if __name__ == "__main__":
    asyncio.run(seed_db())
