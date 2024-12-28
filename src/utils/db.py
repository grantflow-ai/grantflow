from typing import Any, cast
from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import FileIndexingStatusEnum
from src.db.tables import ApplicationFile


async def check_exists_files_being_indexed(session_maker: async_sessionmaker[Any], application_id: UUID | str) -> bool:
    """Check if there are files being indexed for the given application.

    Args:
        session_maker: The session maker.
        application_id: The application ID.

    Returns:
        Whether there are files being indexed.
    """
    async with session_maker() as session:
        return cast(
            bool,
            await session.scalar(
                select(
                    exists(
                        select(ApplicationFile)
                        .where(ApplicationFile.application_id == application_id)
                        .where(ApplicationFile.status == FileIndexingStatusEnum.INDEXING)
                    )
                )
            ),
        )
