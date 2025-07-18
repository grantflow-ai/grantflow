import asyncio
import contextlib
import os
from datetime import UTC, datetime
from typing import Any

import firebase_admin
from firebase_admin import auth
from google.cloud import firestore
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


def main(_request: Any) -> dict[str, Any]:
    """
    Cloud Function entry point for user and organization cleanup.
    Triggered by Cloud Scheduler to cleanup expired deletion requests.
    """
    return asyncio.run(cleanup_expired_users())


async def cleanup_expired_users() -> dict[str, Any]:
    """
    Main cleanup function to process users and organizations scheduled for deletion.
    """
    try:
        if not firebase_admin._apps:  # noqa: SLF001
            firebase_admin.initialize_app()

        db = firestore.AsyncClient()

        now = datetime.now(UTC).replace(tzinfo=None)

        
        user_results = await cleanup_expired_user_deletions(db, now)

        
        org_results = await cleanup_expired_organization_deletions(db, now)

        
        results: dict[str, Any] = {
            "user_cleanup": user_results,
            "organization_cleanup": org_results,
            "timestamp": now.isoformat(),
        }

        return {"statusCode": 200, "body": results}

    except Exception as e:
        error_msg = f"User cleanup function failed: {e!s}"
        return {"statusCode": 500, "body": {"error": error_msg}}


async def delete_user_completely(firebase_uid: str) -> None:
    """
    Completely delete a user from Firebase Auth and database.
    """

    with contextlib.suppress(auth.UserNotFoundError, Exception):
        auth.delete_user(firebase_uid)

    await delete_user_from_database(firebase_uid)


async def cleanup_expired_user_deletions(db: firestore.AsyncClient, now: datetime) -> dict[str, Any]:
    """
    Process expired user deletion requests.
    """
    expired_query = (
        db.collection("user-deletion-requests").where("status", "==", "scheduled").where("deletion_date", "<=", now)
    )

    expired_users = []
    async for doc in expired_query.stream():
        user_data = doc.to_dict()
        expired_users.append(
            {
                "doc_id": doc.id,
                "firebase_uid": user_data["firebase_uid"],
                "deletion_date": user_data["deletion_date"],
            }
        )

    results: dict[str, Any] = {
        "processed": 0,
        "errors": [],
        "deleted_users": [],
    }

    for user in expired_users:
        try:
            await delete_user_completely(user["firebase_uid"])

            await (
                db.collection("user-deletion-requests")
                .document(user["doc_id"])
                .update(
                    {
                        "status": "completed",
                        "completed_at": firestore.SERVER_TIMESTAMP,
                        "updated_at": firestore.SERVER_TIMESTAMP,
                    }
                )
            )

            results["processed"] += 1
            results["deleted_users"].append(user["firebase_uid"])

        except Exception as e:
            error_msg = f"Failed to delete user {user['firebase_uid']}: {e!s}"
            results["errors"].append(error_msg)

    return results


async def cleanup_expired_organization_deletions(db: firestore.AsyncClient, now: datetime) -> dict[str, Any]:
    """
    Process expired organization deletion requests.
    """
    expired_query = (
        db.collection("organization-deletion-requests")
        .where("status", "==", "scheduled")
        .where("scheduled_hard_delete_at", "<=", now)
    )

    expired_organizations = []
    async for doc in expired_query.stream():
        org_data = doc.to_dict()
        expired_organizations.append(
            {
                "doc_id": doc.id,
                "organization_id": org_data["organization_id"],
                "scheduled_hard_delete_at": org_data["scheduled_hard_delete_at"],
            }
        )

    results: dict[str, Any] = {
        "processed": 0,
        "errors": [],
        "deleted_organizations": [],
    }

    for org in expired_organizations:
        try:
            await delete_organization_completely(org["organization_id"])

            await (
                db.collection("organization-deletion-requests")
                .document(org["doc_id"])
                .update(
                    {
                        "status": "completed",
                        "completed_at": firestore.SERVER_TIMESTAMP,
                        "updated_at": firestore.SERVER_TIMESTAMP,
                    }
                )
            )

            results["processed"] += 1
            results["deleted_organizations"].append(org["organization_id"])

        except Exception as e:
            error_msg = f"Failed to delete organization {org['organization_id']}: {e!s}"
            results["errors"].append(error_msg)

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


async def delete_organization_completely(organization_id: str) -> None:
    """
    Completely delete an organization and all its related data from the database.
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
