"""
Additional TypedDict definitions for dev bypass functionality.

These types are used by the dev bypass system to provide mock responses
for endpoints that don't have explicit response types defined.
"""

from typing import NotRequired, TypedDict

from packages.db.src.enums import (
    SourceIndexingStatusEnum,
    UserRoleEnum,
)



class GenerateGrantTemplateRequestBody(TypedDict):
    funding_organization_id: str
    submission_date: str
    grant_url: str
    grant_name: str


class GenerateGrantTemplateResponse(TypedDict):
    message_id: str
    grant_template_id: str



class DismissNotificationRequestBody(TypedDict):
    pass  



class ProjectDetailResponse(TypedDict):
    id: str
    name: str
    description: NotRequired[str]
    role: UserRoleEnum
    created_at: str
    updated_at: str


class ProjectListResponse(TypedDict):
    projects: list[ProjectDetailResponse]


class InvitationResponse(TypedDict):
    id: str
    project_id: str
    role: UserRoleEnum
    expires_at: str
    created_at: str


class MemberResponse(TypedDict):
    id: str
    project_id: str
    firebase_uid: str
    email: str
    role: UserRoleEnum
    created_at: str
    updated_at: str


class MembersListResponse(TypedDict):
    members: list[MemberResponse]
    invitations: list[InvitationResponse]


class CreateInvitationRequestBody(TypedDict):
    role: UserRoleEnum


class CreateInvitationResponse(TypedDict):
    invitation_url: str


class AcceptInvitationRequestBody(TypedDict):
    invitation_token: str



class CreateUploadUrlRequestBody(TypedDict):
    filenames: list[str]
    grant_application_id: str


class CreateUploadUrlResponse(TypedDict):
    upload_urls: dict[str, str]


class CrawlUrlRequestBody(TypedDict):
    urls: list[str]
    grant_application_id: str


class RagSourceResponse(TypedDict):
    id: str
    project_id: str
    source_type: str  
    indexing_status: SourceIndexingStatusEnum
    filename: NotRequired[str]
    url: NotRequired[str]
    created_at: str
    updated_at: str


class RagSourceListResponse(TypedDict):
    sources: list[RagSourceResponse]



class ProjectWithRoleResponse(TypedDict):
    id: str
    name: str
    role: UserRoleEnum


class SoleOwnedProjectsResponse(TypedDict):
    sole_owned_projects: list[ProjectWithRoleResponse]
