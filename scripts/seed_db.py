import asyncio
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.tables import FundingOrganization, GrantCfp
from src.utils.serialization import deserialize


async def seed_db() -> None:
    """Seed the database with test data."""
    load_dotenv()
    session_maker = get_session_maker()

    funding_orgs_json = Path(__file__).parent / "funding_organizations.json"
    grant_cfps_json = Path(__file__).parent / "grant_cfps.json"

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(FundingOrganization).values(deserialize(funding_orgs_json.read_bytes(), list[dict[str, Any]]))
            )
            await session.execute(
                insert(GrantCfp).values(deserialize(grant_cfps_json.read_bytes(), list[dict[str, Any]]))
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e


if __name__ == "__main__":
    asyncio.run(seed_db())
