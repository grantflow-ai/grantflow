from datetime import UTC, datetime, timedelta
from typing import Any, Literal, TypedDict

from litestar import post
from litestar.response import Response
from litestar.status_codes import HTTP_201_CREATED, HTTP_500_INTERNAL_SERVER_ERROR
from packages.db.src.tables import Organization, OrganizationUser
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.gcs import delete_blob
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.backend.src.utils.firebase import delete_user

logger = get_logger(__name__)


class CleanupResult(TypedDict):
    processed: int
    errors: list[str]


class CleanupResponse(TypedDict):
    status: Literal["success", "error"]
    users_processed: int
    organizations_processed: int
    total_errors: int


async def _cleanup_expired_users(session_maker: async_sessionmaker[Any], now: datetime) -> CleanupResult:
    user_grace_period_days = int(get_env("USER_DELETION_GRACE_PERIOD_DAYS", fallback="10"))
    cutoff_date = now - timedelta(days=user_grace_period_days)

    results = CleanupResult(processed=0, errors=[])

    async with session_maker() as session:
        stmt = select(OrganizationUser.firebase_uid, OrganizationUser.deleted_at).where(
            OrganizationUser.deleted_at.isnot(None), OrganizationUser.deleted_at <= cutoff_date
        )

        expired_user_rows = list(await session.execute(stmt))
        firebase_uids = [row[0] for row in expired_user_rows]
        firebase_errors = []

        for firebase_uid in firebase_uids:
            try:
                await delete_user(firebase_uid)
            except Exception as e:
                firebase_errors.append((firebase_uid, str(e)))

        successful_firebase_uids = [uid for uid in firebase_uids if uid not in [err[0] for err in firebase_errors]]

        if successful_firebase_uids:
            await session.execute(
                text("DELETE FROM notifications WHERE firebase_uid = ANY(:uids)"),
                {"uids": successful_firebase_uids},
            )

            await session.execute(
                text("DELETE FROM project_access WHERE firebase_uid = ANY(:uids)"),
                {"uids": successful_firebase_uids},
            )

            await session.execute(
                delete(OrganizationUser).where(OrganizationUser.firebase_uid.in_(successful_firebase_uids))
            )

            await session.commit()

            results["processed"] = len(successful_firebase_uids)
            logger.info(
                "Successfully hard deleted users",
                user_count=len(successful_firebase_uids),
                firebase_uids=successful_firebase_uids,
            )

        for firebase_uid, error in firebase_errors:
            error_msg = f"Failed to hard delete user {firebase_uid}: {error}"
            results["errors"].append(error_msg)
            logger.error(error_msg, firebase_uid=firebase_uid, error=error)

    return results


async def _delete_grant_related_data(session: AsyncSession, organization_id: str) -> None:
    # First, delete GCS files for rag_files before deleting database records
    rag_files_stmt = text("""
        SELECT rf.object_path
        FROM rag_files rf
        WHERE rf.id IN (
            SELECT DISTINCT rag_source_id FROM grant_application_sources gas
            JOIN grant_applications ga ON gas.grant_application_id = ga.id
            JOIN projects p ON ga.project_id = p.id
            WHERE p.organization_id = :org_id
        )
        OR rf.id IN (
            SELECT DISTINCT rag_source_id FROM grant_template_sources gts
            JOIN grant_templates gt ON gts.grant_template_id = gt.id
            JOIN grant_applications ga ON gt.grant_application_id = ga.id
            JOIN projects p ON ga.project_id = p.id
            WHERE p.organization_id = :org_id
        )
    """)

    result = await session.execute(rag_files_stmt, {"org_id": organization_id})
    object_paths = [row[0] for row in result]

    # Delete files from GCS
    gcs_errors = []
    for object_path in object_paths:
        try:
            await delete_blob(object_path)
        except Exception as e:
            gcs_errors.append((object_path, str(e)))
            logger.warning(
                "Failed to delete file from GCS during organization cleanup",
                object_path=object_path,
                organization_id=organization_id,
                error=str(e),
            )

    if gcs_errors:
        logger.warning(
            "Some GCS files could not be deleted",
            organization_id=organization_id,
            failed_count=len(gcs_errors),
            total_count=len(object_paths),
        )

    # Now delete database records
    await session.execute(
        text("""
            DELETE FROM grant_application_sources
            WHERE grant_application_id IN (
                SELECT ga.id FROM grant_applications ga
                JOIN projects p ON ga.project_id = p.id
                WHERE p.organization_id = :org_id
            )
        """),
        {"org_id": organization_id},
    )

    await session.execute(
        text("""
            DELETE FROM grant_template_sources
            WHERE grant_template_id IN (
                SELECT gt.id FROM grant_templates gt
                JOIN grant_applications ga ON gt.grant_application_id = ga.id
                JOIN projects p ON ga.project_id = p.id
                WHERE p.organization_id = :org_id
            )
        """),
        {"org_id": organization_id},
    )

    await session.execute(
        text("""
            DELETE FROM rag_sources
            WHERE id IN (
                SELECT DISTINCT rag_source_id FROM grant_application_sources gas
                JOIN grant_applications ga ON gas.grant_application_id = ga.id
                JOIN projects p ON ga.project_id = p.id
                WHERE p.organization_id = :org_id
            )
            OR id IN (
                SELECT DISTINCT rag_source_id FROM grant_template_sources gts
                JOIN grant_templates gt ON gts.grant_template_id = gt.id
                JOIN grant_applications ga ON gt.grant_application_id = ga.id
                JOIN projects p ON ga.project_id = p.id
                WHERE p.organization_id = :org_id
            )
        """),
        {"org_id": organization_id},
    )

    await session.execute(
        text("""
            DELETE FROM grant_templates
            WHERE grant_application_id IN (
                SELECT ga.id FROM grant_applications ga
                JOIN projects p ON ga.project_id = p.id
                WHERE p.organization_id = :org_id
            )
        """),
        {"org_id": organization_id},
    )

    await session.execute(
        text("""
            DELETE FROM grant_applications
            WHERE project_id IN (
                SELECT id FROM projects WHERE organization_id = :org_id
            )
        """),
        {"org_id": organization_id},
    )


async def _delete_organization_data(session: AsyncSession, organization_id: str) -> None:
    await session.execute(
        text("DELETE FROM project_access WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM projects WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM organization_invitations WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM organization_users WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM organization_audit_logs WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM notifications WHERE organization_id = :org_id"),
        {"org_id": organization_id},
    )

    await session.execute(
        text("DELETE FROM organizations WHERE id = :org_id"),
        {"org_id": organization_id},
    )


async def _cleanup_expired_organizations(session_maker: async_sessionmaker[Any], now: datetime) -> CleanupResult:
    org_grace_period_days = int(get_env("ORGANIZATION_DELETION_GRACE_PERIOD_DAYS", fallback="30"))
    cutoff_date = now - timedelta(days=org_grace_period_days)

    results = CleanupResult(processed=0, errors=[])

    async with session_maker() as session:
        stmt = select(Organization.id).where(
            Organization.deleted_at.isnot(None), Organization.deleted_at <= cutoff_date
        )

        expired_org_ids = [str(org_id) for org_id in await session.scalars(stmt)]

        for organization_id in expired_org_ids:
            await _delete_grant_related_data(session, organization_id)
            await _delete_organization_data(session, organization_id)
            await session.commit()

        results["processed"] = len(expired_org_ids)
        logger.info(
            "Successfully hard deleted organizations",
            org_count=len(expired_org_ids),
            organization_ids=expired_org_ids,
        )

    return results


@post(
    "/webhooks/scheduler/entity-cleanup",
    operation_id="EntityCleanupWebhook",
    tags=["Webhooks"],
    status_code=HTTP_201_CREATED,
)
async def handle_entity_cleanup_webhook(
    session_maker: async_sessionmaker[Any],
) -> CleanupResponse | Response[CleanupResponse]:
    now = datetime.now(UTC).replace(tzinfo=None)

    try:
        user_results = await _cleanup_expired_users(session_maker, now)
        org_results = await _cleanup_expired_organizations(session_maker, now)

        total_errors = len(user_results["errors"]) + len(org_results["errors"])

        logger.info(
            "Entity cleanup completed",
            users_processed=user_results["processed"],
            orgs_processed=org_results["processed"],
            total_errors=total_errors,
        )

        return CleanupResponse(
            status="success",
            users_processed=user_results["processed"],
            organizations_processed=org_results["processed"],
            total_errors=total_errors,
        )

    except Exception as e:
        logger.error("Entity cleanup webhook failed", error=str(e))

        return Response(
            content=CleanupResponse(
                status="error",
                users_processed=0,
                organizations_processed=0,
                total_errors=1,
            ),
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )
