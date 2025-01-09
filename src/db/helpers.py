from typing import Any, cast
from uuid import UUID

from sanic import NotFound
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.db.tables import GrantApplication, GrantTemplate


async def retrieve_application(
    *, application_id: UUID | str, session_maker: async_sessionmaker[Any]
) -> GrantApplication:
    """Retrieve a GrantApplication by ID.

    Args:
        application_id: The application ID.
        session_maker: The session maker.

    Raises:
        NotFound: If the application is not found.

    Returns:
        The GrantApplication.
    """
    async with session_maker() as session:
        try:
            result = await session.execute(
                select(GrantApplication)
                .options(selectinload(GrantApplication.grant_template).selectinload(GrantTemplate.funding_organization))
                .where(GrantApplication.id == application_id)
            )
            return cast(GrantApplication, result.scalar_one())
        except NoResultFound as e:
            raise NotFound from e
