from datetime import UTC, datetime, timedelta
from typing import Any, Literal, TypedDict

from firebase_admin import auth
from litestar import post
from litestar.response import Response
from litestar.status_codes import HTTP_201_CREATED, HTTP_500_INTERNAL_SERVER_ERROR
from packages.db.src.tables import Organization, OrganizationUser
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = get_logger(__name__)


class UserCleanupResult(TypedDict):
    processed: int
    errors: list[str]
    deleted_users: list[dict[str, str]]


class OrganizationCleanupResult(TypedDict):
    processed: int
    errors: list[str]
    deleted_organizations: list[dict[str, str]]


class CleanupResponse(TypedDict):
    status: Literal["success", "error"]
    message: str
    user_cleanup: UserCleanupResult
    organization_cleanup: OrganizationCleanupResult
    timestamp: str


async def _hard_delete_user_from_firebase(firebase_uid: str) -> None:
    try:
        auth.delete_user(firebase_uid)
        logger.info("Deleted user from Firebase", firebase_uid=firebase_uid)
    except auth.UserNotFoundError:
        logger.info("User already deleted from Firebase", firebase_uid=firebase_uid)
    except Exception as e:
        logger.error("Failed to delete user from Firebase", firebase_uid=firebase_uid, error=str(e))
        raise


async def _hard_delete_user_from_database(session: AsyncSession, firebase_uid: str) -> None:
    await session.execute(delete(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))

    await session.execute(
        text("DELETE FROM notifications WHERE firebase_uid = :uid"),
        {"uid": firebase_uid},
    )

    await session.execute(
        text("DELETE FROM project_access WHERE firebase_uid = :uid"),
        {"uid": firebase_uid},
    )


async def _cleanup_expired_users(session_maker: async_sessionmaker[Any], now: datetime) -> UserCleanupResult:
    user_grace_period_days = int(get_env("USER_DELETION_GRACE_PERIOD_DAYS", False) or "10")
    cutoff_date = now - timedelta(days=user_grace_period_days)

    results = UserCleanupResult(processed=0, errors=[], deleted_users=[])

    async with session_maker() as session:
        stmt = select(OrganizationUser).where(
            OrganizationUser.deleted_at.isnot(None), OrganizationUser.deleted_at <= cutoff_date
        )

        expired_users = await session.scalars(stmt)

        for user in expired_users:
            firebase_uid = user.firebase_uid
            deleted_at = user.deleted_at

            try:
                await _hard_delete_user_from_firebase(firebase_uid)
                await _hard_delete_user_from_database(session, firebase_uid)
                await session.commit()

                results["processed"] += 1
                results["deleted_users"].append(
                    {
                        "firebase_uid": firebase_uid,
                        "deleted_at": deleted_at.isoformat() if deleted_at else "",
                        "hard_deleted_at": now.isoformat(),
                    }
                )

                logger.info(
                    "Successfully hard deleted user",
                    firebase_uid=firebase_uid,
                    deleted_at=deleted_at,
                )

            except Exception as e:
                error_msg = f"Failed to hard delete user {firebase_uid}: {e!s}"
                results["errors"].append(error_msg)
                logger.error(error_msg, firebase_uid=firebase_uid, error=str(e))

    return results


async def _delete_grant_related_data(session: AsyncSession, organization_id: str) -> None:
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


async def _cleanup_expired_organizations(
    session_maker: async_sessionmaker[Any], now: datetime
) -> OrganizationCleanupResult:
    org_grace_period_days = int(get_env("ORGANIZATION_DELETION_GRACE_PERIOD_DAYS", False) or "30")
    cutoff_date = now - timedelta(days=org_grace_period_days)

    results = OrganizationCleanupResult(processed=0, errors=[], deleted_organizations=[])

    async with session_maker() as session:
        stmt = select(Organization).where(Organization.deleted_at.isnot(None), Organization.deleted_at <= cutoff_date)

        expired_organizations = await session.scalars(stmt)

        for org in expired_organizations:
            organization_id = str(org.id)
            deleted_at = org.deleted_at
            org_name = org.name

            try:
                await _delete_grant_related_data(session, organization_id)
                await _delete_organization_data(session, organization_id)
                await session.commit()

                results["processed"] += 1
                results["deleted_organizations"].append(
                    {
                        "organization_id": organization_id,
                        "name": org_name,
                        "deleted_at": deleted_at.isoformat() if deleted_at else "",
                        "hard_deleted_at": now.isoformat(),
                    }
                )

                logger.info(
                    "Successfully hard deleted organization",
                    organization_id=organization_id,
                    name=org_name,
                    deleted_at=deleted_at,
                )

            except Exception as e:
                error_msg = f"Failed to hard delete organization {organization_id}: {e!s}"
                results["errors"].append(error_msg)
                logger.error(error_msg, organization_id=organization_id, error=str(e))

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

        total_processed = user_results["processed"] + org_results["processed"]
        total_errors = len(user_results["errors"]) + len(org_results["errors"])

        message = f"Entity cleanup completed: {total_processed} entities processed"
        if total_errors > 0:
            message += f" with {total_errors} errors"

        logger.info(
            "Entity cleanup completed",
            users_processed=user_results["processed"],
            orgs_processed=org_results["processed"],
            total_errors=total_errors,
        )

        return CleanupResponse(
            status="success",
            message=message,
            user_cleanup=user_results,
            organization_cleanup=org_results,
            timestamp=now.isoformat(),
        )

    except Exception as e:
        logger.error("Entity cleanup webhook failed", error=str(e))

        return Response(
            content=CleanupResponse(
                status="error",
                message=f"Entity cleanup failed: {e!s}",
                user_cleanup=UserCleanupResult(processed=0, errors=[str(e)], deleted_users=[]),
                organization_cleanup=OrganizationCleanupResult(processed=0, errors=[], deleted_organizations=[]),
                timestamp=now.isoformat(),
            ),
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )
