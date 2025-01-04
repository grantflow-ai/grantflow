from typing import Any, cast, overload
from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import FileIndexingStatusEnum
from src.db.tables import GrantApplicationFile, GrantTemplateFile


@overload
async def check_exists_files_being_indexed(
    *,
    application_id: UUID | str,
    session_maker: async_sessionmaker[Any],
) -> bool: ...


@overload
async def check_exists_files_being_indexed(
    *,
    template_id: UUID | str,
    session_maker: async_sessionmaker[Any],
) -> bool: ...


async def check_exists_files_being_indexed(
    *,
    application_id: UUID | str | None = None,
    template_id: UUID | str | None = None,
    session_maker: async_sessionmaker[Any],
) -> bool:
    """Check if there are files being indexed for the given application.

    Args:
        application_id: The application ID, required if template_id is not provided.
        template_id: The format ID, required if application_id is not provided.
        session_maker: The session maker.

    Raises:
        ValueError: If neither application_id nor template_id is provided.

    Returns:
        Whether there are files being indexed.
    """
    if not application_id and not template_id:
        raise ValueError("Either application_id or template_id must be provided.")

    file_table_cls = GrantApplicationFile if application_id else GrantTemplateFile

    async with session_maker() as session:
        return cast(
            bool,
            await session.scalar(
                select(
                    exists(
                        select(file_table_cls)
                        .where(
                            file_table_cls.grant_application_id == application_id
                            if hasattr(file_table_cls, "grant_application_id")
                            else file_table_cls.grant_template_id == template_id
                        )
                        .where(file_table_cls.status == FileIndexingStatusEnum.INDEXING)
                    )
                )
            ),
        )
