from datetime import UTC, datetime, timedelta
from typing import Any, NotRequired, TypedDict

from litestar import delete, get, patch
from litestar.exceptions import HTTPException
from packages.db.src.tables import User
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)


class UserProfileResponse(TypedDict):
    firebase_uid: str
    email: NotRequired[str]
    display_name: NotRequired[str]
    photo_url: NotRequired[str]
    preferences: NotRequired[dict[str, Any]]
    created_at: str
    updated_at: str
    deletion_scheduled_at: NotRequired[str]


class UpdateUserProfileRequest(TypedDict):
    display_name: NotRequired[str]
    preferences: NotRequired[dict[str, Any]]


class UpdateUserProfileResponse(TypedDict):
    success: bool
    user: UserProfileResponse


class DeleteAccountResponse(TypedDict):
    success: bool
    deletion_scheduled_at: str
    days_remaining: int


class AccountStatusResponse(TypedDict):
    deleted: bool
    deletion_scheduled_at: NotRequired[str]
    days_remaining: NotRequired[int]


@get(
    "/user/profile",
    operation_id="GetUserProfile",
    summary="Get user profile information",
    description="Get the authenticated user's profile information including preferences",
)
async def get_user_profile(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> UserProfileResponse:
    """Get user profile information.

    Args:
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        User profile information

    Raises:
        HTTPException: If user not found
    """
    logger.info("Getting user profile", firebase_uid=request.auth)

    async with session_maker() as session:
        result = await session.execute(
            select(User).where(
                User.firebase_uid == request.auth,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("User not found", firebase_uid=request.auth)
            raise HTTPException(status_code=404, detail="User not found")

        response: UserProfileResponse = {
            "firebase_uid": user.firebase_uid,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }

        
        if user.email:
            response["email"] = user.email
        if user.display_name:
            response["display_name"] = user.display_name
        if user.photo_url:
            response["photo_url"] = user.photo_url
        if user.preferences:
            response["preferences"] = user.preferences
        if user.deletion_scheduled_at:
            response["deletion_scheduled_at"] = user.deletion_scheduled_at.isoformat()

        logger.info("Retrieved user profile", firebase_uid=request.auth)
        return response


@patch(
    "/user/profile",
    operation_id="UpdateUserProfile",
    summary="Update user profile",
    description="Update the authenticated user's profile information and preferences",
)
async def update_user_profile(
    data: UpdateUserProfileRequest,
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> UpdateUserProfileResponse:
    """Update user profile information.

    Args:
        data: Profile update data
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Updated user profile information

    Raises:
        HTTPException: If user not found
    """
    logger.info("Updating user profile", firebase_uid=request.auth)

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(
                User.firebase_uid == request.auth,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("User not found for update", firebase_uid=request.auth)
            raise HTTPException(status_code=404, detail="User not found")

        
        if "display_name" in data:
            user.display_name = data["display_name"]
        if "preferences" in data:
            user.preferences = data["preferences"]

        user.updated_at = datetime.now(UTC)
        await session.commit()

        
        response_user: UserProfileResponse = {
            "firebase_uid": user.firebase_uid,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }

        
        if user.email:
            response_user["email"] = user.email
        if user.display_name:
            response_user["display_name"] = user.display_name
        if user.photo_url:
            response_user["photo_url"] = user.photo_url
        if user.preferences:
            response_user["preferences"] = user.preferences
        if user.deletion_scheduled_at:
            response_user["deletion_scheduled_at"] = (
                user.deletion_scheduled_at.isoformat()
            )

        logger.info("Updated user profile", firebase_uid=request.auth)
        return UpdateUserProfileResponse(success=True, user=response_user)


@delete(
    "/user/account",
    operation_id="DeleteAccount",
    summary="Delete user account",
    description="Schedule user account for deletion with 7-day grace period",
    status_code=200,
)
async def delete_account(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> DeleteAccountResponse:
    """Schedule user account for deletion.

    Args:
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Deletion confirmation with grace period information

    Raises:
        HTTPException: If user not found
    """
    logger.info("Scheduling account deletion", firebase_uid=request.auth)

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(
                User.firebase_uid == request.auth,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("User not found for deletion", firebase_uid=request.auth)
            raise HTTPException(status_code=404, detail="User not found")

        
        deletion_time = datetime.now(UTC) + timedelta(days=7)
        user.deletion_scheduled_at = deletion_time
        user.updated_at = datetime.now(UTC)

        await session.commit()

        logger.info(
            "Account deletion scheduled",
            firebase_uid=request.auth,
            deletion_scheduled_at=deletion_time.isoformat(),
        )

        return DeleteAccountResponse(
            success=True,
            deletion_scheduled_at=deletion_time.isoformat(),
            days_remaining=7,
        )


@get(
    "/user/account/status",
    operation_id="GetAccountStatus",
    summary="Get account deletion status",
    description="Check if account is scheduled for deletion and grace period status",
)
async def get_account_status(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> AccountStatusResponse:
    """Get account deletion status.

    Args:
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Account deletion status information

    Raises:
        HTTPException: If user not found
    """
    logger.info("Getting account status", firebase_uid=request.auth)

    async with session_maker() as session:
        result = await session.execute(
            select(User).where(User.firebase_uid == request.auth)
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("User not found for status check", firebase_uid=request.auth)
            raise HTTPException(status_code=404, detail="User not found")

        
        if user.deleted_at:
            logger.info("Account is deleted", firebase_uid=request.auth)
            return AccountStatusResponse(deleted=True)

        
        if user.deletion_scheduled_at:
            days_remaining = max(
                0, (user.deletion_scheduled_at - datetime.now(UTC)).days
            )
            logger.info(
                "Account deletion scheduled",
                firebase_uid=request.auth,
                days_remaining=days_remaining,
            )

            return AccountStatusResponse(
                deleted=False,
                deletion_scheduled_at=user.deletion_scheduled_at.isoformat(),
                days_remaining=days_remaining,
            )

        
        logger.info("Account is active", firebase_uid=request.auth)
        return AccountStatusResponse(deleted=False)
