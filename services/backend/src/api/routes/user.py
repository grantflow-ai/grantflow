from typing import Any, TypedDict

from litestar import delete
from litestar.exceptions import HTTPException
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.firebase import (
    get_user_deletion_status,
    schedule_user_deletion,
)

logger = get_logger(__name__)


class DeleteUserResponse(TypedDict):
    message: str
    scheduled_deletion_date: str
    grace_period_days: int
    restoration_info: str


@delete("/user", operation_id="DeleteUser", status_code=200)
async def delete_user(
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> DeleteUserResponse:
    """
    Schedule user account for deletion with grace period.
    User will be removed from all projects immediately.
    Account will be permanently deleted after grace period.
    """
    firebase_uid = request.auth
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        existing_deletion = await get_user_deletion_status(firebase_uid)
        if existing_deletion and existing_deletion.get("status") == "scheduled":
            raise HTTPException(
                status_code=400,
                detail="User account is already scheduled for deletion",
            )

        async with session_maker() as session, session.begin():
            result = await session.execute(
                text("DELETE FROM project_users WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )
            projects_removed = result.rowcount

            await session.execute(
                text("DELETE FROM notifications WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )

            logger.info(
                "Removed user from projects",
                firebase_uid=firebase_uid,
                projects_removed=projects_removed,
            )

        grace_period_days = 30
        deletion_data = await schedule_user_deletion(firebase_uid, grace_period_days)

        logger.info(
            "User deletion scheduled successfully",
            firebase_uid=firebase_uid,
            deletion_date=deletion_data["deletion_date"].isoformat(),
        )

        return {
            "message": "Account scheduled for deletion. You will be removed from all projects immediately.",
            "scheduled_deletion_date": deletion_data["deletion_date"].isoformat() + "Z",
            "grace_period_days": deletion_data["grace_period_days"],
            "restoration_info": f"Contact support within {deletion_data['grace_period_days']} days to restore your account",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            "Error deleting user account",
            firebase_uid=firebase_uid,
            error=str(e),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete user account",
        ) from e
