import asyncio
from datetime import UTC, datetime
from os import environ
from uuid import UUID

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.enums import (
    ApplicationStatusEnum,
    UserRoleEnum,
)
from packages.db.src.tables import (
    GrantApplication,
    GrantingInstitution,
    Organization,
    OrganizationUser,
    Project,
)
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

logger = get_logger(__name__)

TEST_ORG_ID = UUID("00000000-0000-0000-0000-000000000001")
TEST_PROJECT_ID = UUID("00000000-0000-0000-0000-000000000002")
TEST_APPLICATION_ID = UUID("00000000-0000-0000-0000-000000000003")
TEST_INSTITUTION_ID = UUID("00000000-0000-0000-0000-000000000004")
TEST_USER_FIREBASE_UID = "e2e-test-user-uid"
TEST_USER_EMAIL = "e2e.playwright+ci@grantflow.ai"


async def seed_e2e_data() -> None:
    load_dotenv()

    if "DATABASE_CONNECTION_STRING" not in environ:
        environ["DATABASE_CONNECTION_STRING"] = "postgresql+asyncpg://local:local@db:5432/local"
        logger.info("Using local database connection")
    else:
        logger.info("Using configured database connection")

    session_maker = get_session_maker()

    async with session_maker() as session, session.begin():
        try:
            logger.info("Cleaning up existing e2e test data")
            await session.execute(
                delete(OrganizationUser).where(OrganizationUser.firebase_uid == TEST_USER_FIREBASE_UID)
            )
            await session.execute(delete(GrantApplication).where(GrantApplication.id == TEST_APPLICATION_ID))
            await session.execute(delete(Project).where(Project.id == TEST_PROJECT_ID))
            await session.execute(delete(Organization).where(Organization.id == TEST_ORG_ID))
            await session.execute(delete(GrantingInstitution).where(GrantingInstitution.id == TEST_INSTITUTION_ID))

            institution_data = {
                "id": TEST_INSTITUTION_ID,
                "full_name": "E2E Test Granting Institution",
                "abbreviation": "E2ETGI",
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            stmt = insert(GrantingInstitution).values(institution_data)
            await session.execute(stmt)
            logger.info("Created test granting institution", institution_id=str(TEST_INSTITUTION_ID))

            org_data = {
                "id": TEST_ORG_ID,
                "name": "E2E Test Organization",
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            stmt = insert(Organization).values(org_data)
            await session.execute(stmt)
            logger.info("Created test organization", organization_id=str(TEST_ORG_ID))

            user_data = {
                "organization_id": TEST_ORG_ID,
                "firebase_uid": TEST_USER_FIREBASE_UID,
                "role": UserRoleEnum.OWNER,
                "has_all_projects_access": True,
                "joined_at": datetime.now(UTC),
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            stmt = insert(OrganizationUser).values(user_data)
            await session.execute(stmt)
            logger.info("Created test organization member", firebase_uid=TEST_USER_FIREBASE_UID)

            project_data = {
                "id": TEST_PROJECT_ID,
                "organization_id": TEST_ORG_ID,
                "name": "E2E Test Project",
                "description": "Test project for e2e tests",
                "logo_url": None,
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            stmt = insert(Project).values(project_data)
            await session.execute(stmt)
            logger.info("Created test project", project_id=str(TEST_PROJECT_ID))

            app_data = {
                "id": TEST_APPLICATION_ID,
                "project_id": TEST_PROJECT_ID,
                "title": "E2E Test Grant Application",
                "status": ApplicationStatusEnum.WORKING_DRAFT,
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            stmt = insert(GrantApplication).values(app_data)
            await session.execute(stmt)
            logger.info("Created test grant application", application_id=str(TEST_APPLICATION_ID))

            logger.info("E2E seeding complete")

        except SQLAlchemyError as e:
            logger.error("Error seeding e2e data", error=str(e))
            raise


if __name__ == "__main__":
    asyncio.run(seed_e2e_data())
