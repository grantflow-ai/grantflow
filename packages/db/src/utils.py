from typing import Any, cast
from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    RagFile,
)
from packages.shared_utils.src.exceptions import ValidationError


async def check_exists_files_being_indexed(
    *,
    application_id: UUID | str | None = None,
    organization_id: UUID | str | None = None,
    session_maker: async_sessionmaker[Any],
) -> bool:
    if not application_id and not organization_id:
        raise ValidationError("Either application_id or organization_id must be provided.")

    file_table_cls = GrantApplicationRagSource if application_id else FundingOrganizationRagSource

    async with session_maker() as session:
        return cast(
            "bool",
            await session.scalar(
                select(
                    exists(
                        select(file_table_cls)
                        .join(RagFile, RagFile.id == file_table_cls.rag_source_id)
                        .where(
                            file_table_cls.grant_application_id == application_id
                            if hasattr(file_table_cls, "grant_application_id")
                            else file_table_cls.funding_organization_id == organization_id
                        )
                        .where(RagFile.indexing_status == SourceIndexingStatusEnum.INDEXING)
                    )
                )
            ),
        )


async def retrieve_application(
    *, application_id: UUID | str, session_maker: async_sessionmaker[Any]
) -> GrantApplication:
    async with session_maker() as session:
        try:
            result = await session.execute(
                select(GrantApplication)
                .options(selectinload(GrantApplication.grant_template).selectinload(GrantTemplate.funding_organization))
                .where(GrantApplication.id == application_id)
            )
            return cast("GrantApplication", result.scalar_one())
        except NoResultFound as e:
            raise ValidationError("Application not found.", context=str(e)) from e
