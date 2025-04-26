import asyncio
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import FundingOrganization
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.exc import SQLAlchemyError


async def seed_db() -> None:
    load_dotenv()
    session_maker = get_session_maker()

    funding_orgs_json = Path(__file__).parent / "funding_organizations.json"

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(FundingOrganization).values(deserialize(funding_orgs_json.read_bytes(), list[dict[str, Any]]))
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e


if __name__ == "__main__":
    asyncio.run(seed_db())
