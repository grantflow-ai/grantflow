"""
Dev bypass route handler for local development.

This module provides endpoints that bypass authentication and return mock data
for all API routes. This is useful for:
1. Frontend development without backend dependencies
2. Testing API integrations
3. Demonstrating API behavior

IMPORTANT: This should only be enabled in development mode.
"""

from typing import Any
from uuid import UUID

from litestar import Router, delete, get, patch, post, put
from litestar.exceptions import NotFoundException
from packages.db.src.enums import ApplicationStatusEnum
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

from services.backend.src.api.routes.auth import LoginResponse, OTPResponse
from services.backend.src.api.routes.dev_types import (
    CrawlUrlRequestBody,
    CreateInvitationResponse,
    CreateUploadUrlRequestBody,
    CreateUploadUrlResponse,
    DismissNotificationRequestBody,
    GenerateGrantTemplateRequestBody,
    GenerateGrantTemplateResponse,
    MembersListResponse,
    ProjectDetailResponse,
    ProjectListResponse,
    RagSourceListResponse,
)
from services.backend.src.api.routes.grant_applications import (
    ApplicationListResponse,
    ApplicationResponse,
    AutofillRequestBody,
    AutofillResponse,
    CreateApplicationRequestBody,
    UpdateApplicationRequestBody,
)
from services.backend.src.api.routes.grant_template import UpdateGrantTemplateRequestBody
from services.backend.src.api.routes.notifications import ListNotificationsResponse
from services.backend.src.api.routes.rag_jobs import RagJobResponse
from services.backend.src.api.routes.user import GetSoleOwnedProjectsResponse
from services.backend.src.common_types import TableIdResponse
from services.backend.tests.factories import (
    ApplicationListResponseFactory,
    ApplicationResponseFactory,
    AutofillResponseFactory,
    CreateInvitationResponseFactory,
    CreateUploadUrlResponseFactory,
    FundingOrganizationResponseFactory,
    GenerateGrantTemplateResponseFactory,
    LoginResponseFactory,
    MembersListResponseFactory,
    NotificationListResponseFactory,
    OTPResponseFactory,
    ProjectDetailResponseFactory,
    ProjectListResponseFactory,
    RagJobResponseFactory,
    RagSourceListResponseFactory,
    SoleOwnedProjectsResponseFactory,
    TableIdResponseFactory,
)

logger = get_logger(__name__)


mock_data_store: dict[str, Any] = {
    "projects": {},
    "applications": {},
    "organizations": {},
    "templates": {},
}


def check_dev_mode() -> bool:
    """Check if dev bypass is enabled."""
    return get_env("ENABLE_DEV_BYPASS", False)



@post("/dev/login")
async def dev_login(data: dict[str, Any]) -> LoginResponse:  # noqa: ARG001
    """Dev bypass for login."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return LoginResponseFactory.build()


@get("/dev/otp")
async def dev_otp() -> OTPResponse:
    """Dev bypass for OTP generation."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return OTPResponseFactory.build()



@delete("/dev/user", status_code=200)
async def dev_delete_user() -> dict[str, str]:
    """Dev bypass for user deletion."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return {"message": "User deleted successfully"}


@get("/dev/user/sole-owned-projects")
async def dev_sole_owned_projects() -> GetSoleOwnedProjectsResponse:
    """Dev bypass for sole owned projects."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return SoleOwnedProjectsResponseFactory.build()



@get("/dev/organizations")
async def dev_list_organizations() -> list[dict[str, Any]]:
    """Dev bypass for listing organizations."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    orgs = list(mock_data_store["organizations"].values())
    if not orgs:
        
        for _ in range(5):
            org = FundingOrganizationResponseFactory.build()
            mock_data_store["organizations"][org["id"]] = org
            orgs.append(org)
    return orgs


@post("/dev/organizations")
async def dev_create_organization(data: dict[str, Any]) -> TableIdResponse:
    """Dev bypass for creating organization."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    org = FundingOrganizationResponseFactory.build()
    org.update(data)
    mock_data_store["organizations"][org["id"]] = org
    return TableIdResponseFactory.build(id=org["id"])


@put("/dev/organizations/{organization_id:uuid}")
async def dev_update_organization(organization_id: UUID, data: dict[str, Any]) -> TableIdResponse:
    """Dev bypass for updating organization."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    org_id = str(organization_id)
    if org_id not in mock_data_store["organizations"]:
        raise NotFoundException("Organization not found")

    mock_data_store["organizations"][org_id].update(data)
    return TableIdResponseFactory.build(id=org_id)


@delete("/dev/organizations/{organization_id:uuid}", status_code=200)
async def dev_delete_organization(organization_id: UUID) -> dict[str, str]:
    """Dev bypass for deleting organization."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    org_id = str(organization_id)
    if org_id in mock_data_store["organizations"]:
        del mock_data_store["organizations"][org_id]

    return {"message": "Organization deleted successfully"}



@get("/dev/projects")
async def dev_list_projects() -> ProjectListResponse:
    """Dev bypass for listing projects."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return ProjectListResponseFactory.build()


@post("/dev/projects")
async def dev_create_project(data: dict[str, Any]) -> TableIdResponse:
    """Dev bypass for creating project."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    project = ProjectDetailResponseFactory.build()
    project.update(data)
    mock_data_store["projects"][project["id"]] = project
    return TableIdResponseFactory.build(id=project["id"])


@get("/dev/projects/{project_id:uuid}")
async def dev_get_project(project_id: UUID) -> ProjectDetailResponse:
    """Dev bypass for getting project."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    project_id_str = str(project_id)
    if project_id_str not in mock_data_store["projects"]:
        project = ProjectDetailResponseFactory.build(id=project_id_str)
        mock_data_store["projects"][project_id_str] = project

    return mock_data_store["projects"][project_id_str]


@patch("/dev/projects/{project_id:uuid}")
async def dev_update_project(project_id: UUID, data: dict[str, Any]) -> TableIdResponse:
    """Dev bypass for updating project."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    project_id_str = str(project_id)
    if project_id_str not in mock_data_store["projects"]:
        raise NotFoundException("Project not found")

    mock_data_store["projects"][project_id_str].update(data)
    return TableIdResponseFactory.build(id=project_id_str)


@delete("/dev/projects/{project_id:uuid}", status_code=200)
async def dev_delete_project(project_id: UUID) -> dict[str, str]:
    """Dev bypass for deleting project."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    project_id_str = str(project_id)
    if project_id_str in mock_data_store["projects"]:
        del mock_data_store["projects"][project_id_str]

    return {"message": "Project deleted successfully"}



@get("/dev/projects/{project_id:uuid}/members")
async def dev_list_members(project_id: UUID) -> MembersListResponse:  # noqa: ARG001
    """Dev bypass for listing project members."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return MembersListResponseFactory.build()


@delete("/dev/projects/{project_id:uuid}/members/{member_id:uuid}", status_code=200)
async def dev_remove_member(project_id: UUID, member_id: UUID) -> dict[str, str]:  # noqa: ARG001
    """Dev bypass for removing project member."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return {"message": "Member removed successfully"}


@patch("/dev/projects/{project_id:uuid}/members/{member_id:uuid}/role")
async def dev_update_member_role(project_id: UUID, member_id: UUID, data: dict[str, Any]) -> TableIdResponse:  # noqa: ARG001
    """Dev bypass for updating member role."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build(id=str(member_id))


@post("/dev/projects/{project_id:uuid}/invitations")
async def dev_create_invitation(project_id: UUID, data: dict[str, Any]) -> CreateInvitationResponse:  # noqa: ARG001
    """Dev bypass for creating invitation."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return CreateInvitationResponseFactory.build()


@post("/dev/projects/{project_id:uuid}/invitations/accept")
async def dev_accept_invitation(project_id: UUID, data: dict[str, Any]) -> TableIdResponse:  # noqa: ARG001
    """Dev bypass for accepting invitation."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build()


@delete("/dev/projects/{project_id:uuid}/invitations/{invitation_id:uuid}", status_code=200)
async def dev_delete_invitation(project_id: UUID, invitation_id: UUID) -> dict[str, str]:  # noqa: ARG001
    """Dev bypass for deleting invitation."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return {"message": "Invitation deleted successfully"}


@patch("/dev/projects/{project_id:uuid}/invitations/{invitation_id:uuid}/role")
async def dev_update_invitation_role(project_id: UUID, invitation_id: UUID, data: dict[str, Any]) -> TableIdResponse:  # noqa: ARG001
    """Dev bypass for updating invitation role."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build(id=str(invitation_id))



@get("/dev/projects/{project_id:uuid}/applications")
async def dev_list_applications(
    project_id: UUID,  # noqa: ARG001
    limit: int = 20,
    offset: int = 0,
    status: ApplicationStatusEnum | None = None,
) -> ApplicationListResponse:
    """Dev bypass for listing applications."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    response = ApplicationListResponseFactory.build()
    
    response["pagination"]["limit"] = limit
    response["pagination"]["offset"] = offset

    
    if status:
        response["applications"] = [app for app in response["applications"] if app["status"] == status]

    return response


@post("/dev/projects/{project_id:uuid}/applications")
async def dev_create_application(project_id: UUID, data: CreateApplicationRequestBody) -> TableIdResponse:
    """Dev bypass for creating application."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    app = ApplicationResponseFactory.build(project_id=str(project_id))
    app.update(data)
    mock_data_store["applications"][app["id"]] = app
    return TableIdResponseFactory.build(id=app["id"])


@get("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}")
async def dev_get_application(project_id: UUID, application_id: UUID) -> ApplicationResponse:
    """Dev bypass for getting application."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    app_id = str(application_id)
    if app_id not in mock_data_store["applications"]:
        app = ApplicationResponseFactory.build(id=app_id, project_id=str(project_id))
        mock_data_store["applications"][app_id] = app

    return mock_data_store["applications"][app_id]


@patch("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}")
async def dev_update_application(
    project_id: UUID,  # noqa: ARG001
    application_id: UUID,
    data: UpdateApplicationRequestBody,
) -> TableIdResponse:
    """Dev bypass for updating application."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    app_id = str(application_id)
    if app_id not in mock_data_store["applications"]:
        raise NotFoundException("Application not found")

    mock_data_store["applications"][app_id].update(data)
    return TableIdResponseFactory.build(id=app_id)


@delete("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}", status_code=200)
async def dev_delete_application(project_id: UUID, application_id: UUID) -> dict[str, str]:  # noqa: ARG001
    """Dev bypass for deleting application."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    app_id = str(application_id)
    if app_id in mock_data_store["applications"]:
        del mock_data_store["applications"][app_id]

    return {"message": "Application deleted successfully"}


@post("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}/generate")
async def dev_generate_application(project_id: UUID, application_id: UUID) -> TableIdResponse:  # noqa: ARG001
    """Dev bypass for generating application."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build()


@post("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}/autofill")
async def dev_trigger_autofill(
    project_id: UUID,  # noqa: ARG001
    application_id: UUID,
    data: AutofillRequestBody,
) -> AutofillResponse:
    """Dev bypass for triggering autofill."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return AutofillResponseFactory.build(
        application_id=str(application_id), autofill_type=data["autofill_type"], field_name=data.get("field_name")
    )



@post("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/generate")
async def dev_generate_grant_template(
    project_id: UUID,  # noqa: ARG001
    application_id: UUID,  # noqa: ARG001
    data: GenerateGrantTemplateRequestBody,  # noqa: ARG001
) -> GenerateGrantTemplateResponse:
    """Dev bypass for generating grant template."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return GenerateGrantTemplateResponseFactory.build()


@patch("/dev/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template")
async def dev_update_grant_template(
    project_id: UUID,  # noqa: ARG001
    application_id: UUID,  # noqa: ARG001
    data: UpdateGrantTemplateRequestBody,  # noqa: ARG001
) -> TableIdResponse:
    """Dev bypass for updating grant template."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build()



@get("/dev/projects/{project_id:uuid}/notifications")
async def dev_list_notifications(project_id: UUID) -> ListNotificationsResponse:  # noqa: ARG001
    """Dev bypass for listing notifications."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return NotificationListResponseFactory.build()


@post("/dev/projects/{project_id:uuid}/notifications/{notification_id:uuid}/dismiss")
async def dev_dismiss_notification(
    project_id: UUID,  # noqa: ARG001
    notification_id: UUID,
    data: DismissNotificationRequestBody,  # noqa: ARG001
) -> TableIdResponse:
    """Dev bypass for dismissing notification."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build(id=str(notification_id))



@post("/dev/projects/{project_id:uuid}/sources/upload-url")
async def dev_create_upload_url(
    project_id: UUID,  # noqa: ARG001
    data: CreateUploadUrlRequestBody,  # noqa: ARG001
) -> CreateUploadUrlResponse:
    """Dev bypass for creating upload URL."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return CreateUploadUrlResponseFactory.build()


@post("/dev/projects/{project_id:uuid}/sources/crawl-url")
async def dev_crawl_url(project_id: UUID, data: CrawlUrlRequestBody) -> TableIdResponse:  # noqa: ARG001
    """Dev bypass for crawling URL."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return TableIdResponseFactory.build()


@get("/dev/projects/{project_id:uuid}/sources")
async def dev_list_sources(project_id: UUID) -> RagSourceListResponse:  # noqa: ARG001
    """Dev bypass for listing sources."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return RagSourceListResponseFactory.build()


@delete("/dev/projects/{project_id:uuid}/sources/{source_id:uuid}", status_code=200)
async def dev_delete_source(project_id: UUID, source_id: UUID) -> dict[str, str]:  # noqa: ARG001
    """Dev bypass for deleting source."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return {"message": "Source deleted successfully"}



@get("/dev/rag-jobs/{job_id:uuid}")
async def dev_get_rag_job(job_id: UUID) -> RagJobResponse:
    """Dev bypass for getting RAG job."""
    if not check_dev_mode():
        raise NotFoundException("Dev bypass not enabled")

    return RagJobResponseFactory.build(id=str(job_id))



dev_bypass_router = Router(
    path="/api",
    route_handlers=[
        
        dev_login,
        dev_otp,
        
        dev_delete_user,
        dev_sole_owned_projects,
        
        dev_list_organizations,
        dev_create_organization,
        dev_update_organization,
        dev_delete_organization,
        
        dev_list_projects,
        dev_create_project,
        dev_get_project,
        dev_update_project,
        dev_delete_project,
        
        dev_list_members,
        dev_remove_member,
        dev_update_member_role,
        dev_create_invitation,
        dev_accept_invitation,
        dev_delete_invitation,
        dev_update_invitation_role,
        
        dev_list_applications,
        dev_create_application,
        dev_get_application,
        dev_update_application,
        dev_delete_application,
        dev_generate_application,
        dev_trigger_autofill,
        
        dev_generate_grant_template,
        dev_update_grant_template,
        
        dev_list_notifications,
        dev_dismiss_notification,
        
        dev_create_upload_url,
        dev_crawl_url,
        dev_list_sources,
        dev_delete_source,
        
        dev_get_rag_job,
    ],
)
