import asyncio
import contextlib
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import firebase_admin
from firebase_admin import auth
from google.cloud import firestore
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


def main(_request: Any) -> dict[str, Any]:
    """
    Cloud Function entry point for user and organization cleanup.
    Triggered by Cloud Scheduler to cleanup expired soft deletes.
    """
    return asyncio.run(cleanup_expired_entities())


async def cleanup_expired_entities() -> dict[str, Any]:
    """
    Main cleanup function to process users and organizations with expired soft deletes.
    """
    try:
        if not firebase_admin._apps:  # noqa: SLF001
            firebase_admin.initialize_app()

        firestore.AsyncClient()

        now = datetime.now(UTC).replace(tzinfo=None)

        user_results = await user_cleanup(now)

        org_results = await organization_cleanup(now)

        results: dict[str, Any] = {
            "user_cleanup": user_results,
            "organization_cleanup": org_results,
            "timestamp": now.isoformat(),
        }

        return {"statusCode": 200, "body": results}

    except Exception as e:
        error_msg = f"Entity cleanup function failed: {e!s}"
        return {"statusCode": 500, "body": {"error": error_msg}}


async def hard_delete_user(firebase_uid: str) -> None:
    """
    Completely delete a user from Firebase Auth and database.
    """

    with contextlib.suppress(auth.UserNotFoundError, Exception):
        auth.delete_user(firebase_uid)

    await delete_user_from_database(firebase_uid)


async def user_cleanup(now: datetime) -> dict[str, Any]:
    """
    Process users with expired soft deletes (10 days grace period).
    """

    user_grace_period_days = get_user_deletion_grace_period_days()
    cutoff_date = now - timedelta(days=user_grace_period_days)

    database_url = get_database_url()
    engine = create_async_engine(database_url)
    session_maker = async_sessionmaker(engine)

    results: dict[str, Any] = {
        "processed": 0,
        "errors": [],
        "deleted_users": [],
    }

    try:
        async with session_maker() as session:
            result = await session.execute(
                text("""
                    SELECT firebase_uid, deleted_at
                    FROM organization_users
                    WHERE deleted_at IS NOT NULL
                    AND deleted_at <= :cutoff_date
                """),
                {"cutoff_date": cutoff_date},
            )

            expired_users = result.fetchall()

            for user_row in expired_users:
                firebase_uid = user_row[0]
                deleted_at = user_row[1]

                try:
                    await hard_delete_user(firebase_uid)
                    results["processed"] += 1
                    results["deleted_users"].append(
                        {
                            "firebase_uid": firebase_uid,
                            "deleted_at": deleted_at.isoformat(),
                            "hard_deleted_at": now.isoformat(),
                        }
                    )

                except Exception as e:
                    error_msg = f"Failed to hard delete user {firebase_uid}: {e!s}"
                    results["errors"].append(error_msg)

    except Exception as e:
        error_msg = f"Error processing user cleanup: {e!s}"
        results["errors"].append(error_msg)
    finally:
        await engine.dispose()

    return results


async def organization_cleanup(now: datetime) -> dict[str, Any]:
    """
    Process organizations with expired soft deletes (30 days grace period).
    """

    org_grace_period_days = get_organization_deletion_grace_period_days()
    cutoff_date = now - timedelta(days=org_grace_period_days)

    database_url = get_database_url()
    engine = create_async_engine(database_url)
    session_maker = async_sessionmaker(engine)

    results: dict[str, Any] = {
        "processed": 0,
        "errors": [],
        "deleted_organizations": [],
    }

    try:
        async with session_maker() as session:
            result = await session.execute(
                text("""
                    SELECT id, deleted_at, name
                    FROM organizations
                    WHERE deleted_at IS NOT NULL
                    AND deleted_at <= :cutoff_date
                """),
                {"cutoff_date": cutoff_date},
            )

            expired_organizations = result.fetchall()

            for org_row in expired_organizations:
                organization_id = str(org_row[0])
                deleted_at = org_row[1]
                org_name = org_row[2]

                try:
                    await hard_delete_organization(organization_id)
                    results["processed"] += 1
                    results["deleted_organizations"].append(
                        {
                            "organization_id": organization_id,
                            "name": org_name,
                            "deleted_at": deleted_at.isoformat(),
                            "hard_deleted_at": now.isoformat(),
                        }
                    )

                except Exception as e:
                    error_msg = f"Failed to hard delete organization {organization_id}: {e!s}"
                    results["errors"].append(error_msg)

    except Exception as e:
        error_msg = f"Error processing organization cleanup: {e!s}"
        results["errors"].append(error_msg)
    finally:
        await engine.dispose()

    return results


async def delete_user_from_database(firebase_uid: str) -> None:
    """
    Delete user records from the database.
    """
    database_url = get_database_url()
    engine = create_async_engine(database_url)
    session_maker = async_sessionmaker(engine)

    try:
        async with session_maker() as session, session.begin():
            await session.execute(
                text("DELETE FROM organization_users WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )

            await session.execute(
                text("DELETE FROM notifications WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )

    except Exception:
        raise
    finally:
        await engine.dispose()


async def hard_delete_organization(organization_id: str) -> None:
    """
    Completely delete an organization and all its related data from the database.
    This includes both soft-deleted and non-deleted child entities.
    """
    database_url = get_database_url()
    engine = create_async_engine(database_url)
    session_maker = async_sessionmaker(engine)

    try:
        async with session_maker() as session, session.begin():
            await session.execute(
                text("DELETE FROM project_access WHERE organization_id = :org_id"),
                {"org_id": organization_id},
            )

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

    except Exception:
        raise
    finally:
        await engine.dispose()


def get_database_url() -> str:
    """
    Get database connection URL from environment variables.
    """

    if "GOOGLE_CLOUD_PROJECT" in os.environ:
        project = os.environ["GOOGLE_CLOUD_PROJECT"]
        instance = os.environ.get("CLOUD_SQL_INSTANCE", "grantflow-db")
        db_name = os.environ.get("DATABASE_NAME", "grantflow")
        db_user = os.environ.get("DATABASE_USER", "grantflow")
        db_password = os.environ.get("DATABASE_PASSWORD", "")

        return (
            f"postgresql+asyncpg://{db_user}:{db_password}@"
            f"/{db_name}?host=/cloudsql/{project}:{os.environ.get('CLOUD_SQL_REGION', 'us-central1')}:{instance}"
        )

    return os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://grantflow:password@localhost:5432/grantflow",
    )


def get_organization_deletion_grace_period_days() -> int:
    """
    Get the organization deletion grace period in days from environment variables.
    Defaults to 30 days as specified in the business requirements.
    """
    return int(os.environ.get("ORGANIZATION_DELETION_GRACE_PERIOD_DAYS", "30"))


def get_user_deletion_grace_period_days() -> int:
    """
    Get the user deletion grace period in days from environment variables.
    Defaults to 10 days as specified in the business requirements.
    """
    return int(os.environ.get("USER_DELETION_GRACE_PERIOD_DAYS", "10"))
