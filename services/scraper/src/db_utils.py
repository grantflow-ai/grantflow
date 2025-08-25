import time
from collections.abc import Sequence
from typing import Any
from uuid import UUID

from packages.db.src.connection import get_session_maker
from packages.db.src.tables import Grant, GrantingInstitution, RagUrl
from packages.shared_utils.src.logger import get_logger
from services.scraper.src.dtos import GrantInfo
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError

logger = get_logger(__name__)


async def get_nih_institution_id() -> UUID:
    async_session_maker = get_session_maker()

    async with async_session_maker() as session:
        result = await session.scalar(
            select(GrantingInstitution.id).where(GrantingInstitution.full_name == "National Institutes of Health")
        )

        if result is None:
            raise ValueError("NIH granting institution not found in database")

        logger.debug("Retrieved NIH institution ID", nih_id=str(result))
        if not isinstance(result, UUID):
            raise TypeError(f"Expected UUID from database, got {type(result)}")
        return result


async def get_existing_grant_identifiers() -> set[str]:
    start_time = time.time()
    async_session_maker = get_session_maker()

    async with async_session_maker() as session:
        result = await session.execute(select(Grant.document_number))
        identifiers = {row[0] for row in result.fetchall()}

    duration = time.time() - start_time
    logger.info(
        "Retrieved existing grant identifiers from PostgreSQL",
        count=len(identifiers),
        duration_ms=round(duration * 1000, 2),
    )

    return identifiers


async def bulk_insert_grants(grants_data: list[dict[str, Any]], nih_id: UUID) -> int:
    start_time = time.time()
    async_session_maker = get_session_maker()

    if not grants_data:
        logger.info("No grants data provided for bulk insert")
        return 0

    grants_with_institution = [{**grant, "granting_institution_id": nih_id} for grant in grants_data]

    async with async_session_maker() as session, session.begin():
        try:
            stmt = pg_insert(Grant).values(grants_with_institution)
            stmt = stmt.on_conflict_do_nothing(index_elements=["document_number"])
            result = await session.execute(stmt)

            inserted_count = result.rowcount or 0

            duration = time.time() - start_time
            logger.info(
                "Bulk inserted grants to PostgreSQL",
                total_grants=len(grants_data),
                inserted_count=inserted_count,
                skipped_count=len(grants_data) - inserted_count,
                duration_ms=round(duration * 1000, 2),
            )

            return inserted_count

        except IntegrityError as e:
            duration = time.time() - start_time
            logger.error(
                "Failed to bulk insert grants due to integrity error",
                total_grants=len(grants_data),
                duration_ms=round(duration * 1000, 2),
                error=str(e),
            )
            raise
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Failed to bulk insert grants",
                total_grants=len(grants_data),
                duration_ms=round(duration * 1000, 2),
                error=str(e),
            )
            raise


async def batch_save_grants(grants: Sequence[dict[str, Any] | GrantInfo]) -> int:
    start_time = time.time()

    if not grants:
        logger.info("No grants provided for batch save")
        return 0

    try:
        nih_id = await get_nih_institution_id()

        grants_data = []
        for grant in grants:
            grant_data = {
                "title": grant.get("title", ""),
                "description": grant.get("description", ""),
                "release_date": grant.get("release_date", ""),
                "expired_date": grant.get("expired_date", ""),
                "activity_code": grant.get("activity_code", ""),
                "organization": grant.get("organization", ""),
                "parent_organization": grant.get("parent_organization", ""),
                "participating_orgs": grant.get("participating_orgs", ""),
                "document_number": grant.get("document_number", ""),
                "document_type": grant.get("document_type", ""),
                "clinical_trials": grant.get("clinical_trials", ""),
                "url": grant.get("url", ""),
                "amount": grant.get("amount"),
                "amount_min": grant.get("amount_min"),
                "amount_max": grant.get("amount_max"),
                "category": grant.get("category"),
                "eligibility": grant.get("eligibility"),
            }
            grants_data.append(grant_data)

        inserted_count = await bulk_insert_grants(grants_data, nih_id)

        duration = time.time() - start_time
        logger.info(
            "Batch saved grants to PostgreSQL",
            total_grants=len(grants),
            inserted_count=inserted_count,
            skipped_count=len(grants) - inserted_count,
            duration_ms=round(duration * 1000, 2),
        )

        return inserted_count

    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "Failed to batch save grants to PostgreSQL",
            total_grants=len(grants),
            duration_ms=round(duration * 1000, 2),
            error=str(e),
        )
        raise


async def save_grant_page_content(grant_id: str, content: str) -> None:
    start_time = time.time()
    async_session_maker = get_session_maker()

    url = f"https://grants.nih.gov/grants/guide/notice-files/{grant_id}.html"

    lines = content.split("\n")
    description_lines = []
    for line in lines:
        if line.strip() and not line.startswith("#"):
            description_lines.append(line.strip())
            if len(" ".join(description_lines)) >= 500:
                break

    description = " ".join(description_lines)[:500] if description_lines else ""
    title = f"NIH Grant: {grant_id}"

    async with async_session_maker() as session, session.begin():
        try:
            existing_rag_url = await session.scalar(select(RagUrl).where(RagUrl.url == url))

            if existing_rag_url:
                existing_rag_url.text_content = content
                existing_rag_url.description = description
                existing_rag_url.title = title
                logger.debug("Updated existing RagUrl", url=url, grant_id=grant_id)
            else:
                rag_url = RagUrl(
                    url=url,
                    title=title,
                    description=description,
                    text_content=content,
                )
                session.add(rag_url)
                logger.debug("Created new RagUrl", url=url, grant_id=grant_id)

            duration = time.time() - start_time
            logger.info(
                "Saved grant page content to PostgreSQL",
                grant_id=grant_id,
                url=url,
                content_length=len(content),
                description_length=len(description),
                duration_ms=round(duration * 1000, 2),
            )

        except IntegrityError as e:
            duration = time.time() - start_time
            logger.error(
                "Failed to save grant page content due to integrity error",
                grant_id=grant_id,
                url=url,
                duration_ms=round(duration * 1000, 2),
                error=str(e),
            )
            raise
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Failed to save grant page content",
                grant_id=grant_id,
                url=url,
                duration_ms=round(duration * 1000, 2),
                error=str(e),
            )
            raise
