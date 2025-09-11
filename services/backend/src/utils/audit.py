from typing import Any
from uuid import UUID

from packages.db.src.tables import OrganizationAuditLog
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)

DELETE_PROJECT = "DELETE_PROJECT"
DELETE_APPLICATION = "DELETE_APPLICATION"
DELETE_SOURCE = "DELETE_SOURCE"
DELETE_INVITATION = "DELETE_INVITATION"
REMOVE_MEMBER = "REMOVE_MEMBER"
RESTORE_PROJECT = "RESTORE_PROJECT"
RESTORE_APPLICATION = "RESTORE_APPLICATION"
RESTORE_SOURCE = "RESTORE_SOURCE"
UPDATE_MEMBER_ROLE = "UPDATE_MEMBER_ROLE"
ADD_MEMBER = "ADD_MEMBER"
GRANT_PROJECT_ACCESS = "GRANT_PROJECT_ACCESS"
REVOKE_PROJECT_ACCESS = "REVOKE_PROJECT_ACCESS"


def get_client_ip(request: APIRequest) -> str | None:
    headers = request.headers
    for header in ["X-Forwarded-For", "X-Real-IP", "X-Client-IP"]:
        if ip := headers.get(header):
            return ip.split(",")[0].strip()
    return None


async def log_organization_audit(
    session: AsyncSession,
    organization_id: UUID,
    user_firebase_uid: str,
    action: str,
    details: dict[str, Any] | None = None,
    target_user_firebase_uid: str | None = None,
    ip_address: str | None = None,
) -> None:
    try:
        await session.execute(
            insert(OrganizationAuditLog).values(
                organization_id=organization_id,
                user_firebase_uid=user_firebase_uid,
                action=action,
                target_user_firebase_uid=target_user_firebase_uid,
                details=details,
                ip_address=ip_address,
            )
        )
        logger.debug(
            "Audit log created",
            organization_id=str(organization_id),
            user_firebase_uid=user_firebase_uid,
            action=action,
        )
    except Exception as e:
        logger.warning(
            "Failed to create audit log",
            organization_id=str(organization_id),
            user_firebase_uid=user_firebase_uid,
            action=action,
            error=str(e),
        )


async def log_organization_audit_from_request(
    session: AsyncSession,
    request: APIRequest,
    organization_id: UUID,
    action: str,
    details: dict[str, Any] | None = None,
    target_user_firebase_uid: str | None = None,
) -> None:
    if not request.auth:
        logger.warning("Cannot log audit event: no authenticated user", action=action)
        return

    await log_organization_audit(
        session=session,
        organization_id=organization_id,
        user_firebase_uid=request.auth,
        action=action,
        details=details,
        target_user_firebase_uid=target_user_firebase_uid,
        ip_address=get_client_ip(request),
    )
