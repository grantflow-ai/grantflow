from datetime import UTC, datetime, timedelta
from uuid import uuid4

from packages.db.src.enums import (
    ApplicationStatusEnum,
    NotificationTypeEnum,
    SourceIndexingStatusEnum,
    UserRoleEnum,
)
from packages.db.src.json_objects import (
    GrantElement,
    GrantLongFormSection,
    ResearchDeepDive,
    ResearchObjective,
)
from polyfactory.factories import TypedDictFactory
from testing.factories import faker

from services.backend.src.api.routes.auth import (
    LoginRequestBody,
    LoginResponse,
    OTPResponse,
)
from services.backend.src.api.routes.dev_types import (
    AcceptInvitationRequestBody,
    CrawlUrlRequestBody,
    CreateInvitationRequestBody,
    CreateInvitationResponse,
    CreateUploadUrlRequestBody,
    CreateUploadUrlResponse,
    DismissNotificationRequestBody,
    GenerateGrantTemplateRequestBody,
    GenerateGrantTemplateResponse,
    InvitationResponse,
    MemberResponse,
    MembersListResponse,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectWithRoleResponse,
    RagSourceListResponse,
    RagSourceResponse,
)
from services.backend.src.api.routes.funding_organizations import (
    CreateOrganizationRequestBody,
    FundingOrganizationResponse,
    UpdateOrganizationRequestBody,
)
from services.backend.src.api.routes.grant_applications import (
    ApplicationListItemResponse,
    ApplicationListResponse,
    ApplicationResponse,
    AutofillResponse,
    GrantTemplateResponse,
    PaginationMetadata,
    SourceResponse,
)
from services.backend.src.api.routes.grant_applications import (
    FundingOrganizationResponse as AppFundingOrgResponse,
)
from services.backend.src.api.routes.grant_template import UpdateGrantTemplateRequestBody
from services.backend.src.api.routes.notifications import (
    ListNotificationsResponse,
    NotificationResponse,
)
from services.backend.src.api.routes.projects import (
    CreateProjectRequestBody,
    ProjectBaseResponse,
    UpdateInvitationRoleRequestBody,
    UpdateMemberRoleRequestBody,
    UpdateProjectRequestBody,
)
from services.backend.src.api.routes.rag_jobs import RagJobResponse
from services.backend.src.api.routes.user import GetSoleOwnedProjectsResponse
from services.backend.src.common_types import TableIdResponse
from services.rag.src.grant_template.determine_application_sections import (
    ExtractedSectionDTO,
)
from services.rag.src.grant_template.determine_longform_metadata import SectionMetadata


class CreateOrganizationRequestBodyFactory(TypedDictFactory[CreateOrganizationRequestBody]):
    __model__ = CreateOrganizationRequestBody


class CreateProjectRequestBodyFactory(TypedDictFactory[CreateProjectRequestBody]):
    __model__ = CreateProjectRequestBody


class UpdateProjectRequestBodyFactory(TypedDictFactory[UpdateProjectRequestBody]):
    __model__ = UpdateProjectRequestBody


class LoginRequestBodyFactory(TypedDictFactory[LoginRequestBody]):
    __model__ = LoginRequestBody


class TableIdResponseFactory(TypedDictFactory[TableIdResponse]):
    __model__ = TableIdResponse


class ProjectBaseResponseFactory(TypedDictFactory[ProjectBaseResponse]):
    __model__ = ProjectBaseResponse


class OTPResponseFactory(TypedDictFactory[OTPResponse]):
    __model__ = OTPResponse


class LoginResponseFactory(TypedDictFactory[LoginResponse]):
    __model__ = LoginResponse


class ExtractedSectionDTOFactory(TypedDictFactory[ExtractedSectionDTO]):
    __model__ = ExtractedSectionDTO
    title = faker.sentence
    is_long_form = True
    parent_id = None

    @classmethod
    def id(cls) -> str:
        return faker.slug().replace("-", "_")

    @classmethod
    def order(cls) -> int:
        return faker.pyint(min_value=1, max_value=10)


class SectionMetadataFactory(TypedDictFactory[SectionMetadata]):
    __model__ = SectionMetadata

    @classmethod
    def id(cls) -> str:
        return faker.slug().replace("-", "_")

    @classmethod
    def keywords(cls) -> list[str]:
        return [faker.word() for _ in range(5)]

    @classmethod
    def topics(cls) -> list[str]:
        return [faker.sentence(nb_words=3) for _ in range(3)]

    generation_instructions = faker.paragraph
    depends_on: list[str] = []

    @classmethod
    def max_words(cls) -> int:
        return faker.pyint(min_value=200, max_value=2000)

    @classmethod
    def search_queries(cls) -> list[str]:
        return [faker.sentence() for _ in range(3)]



class UpdateOrganizationRequestBodyFactory(TypedDictFactory[UpdateOrganizationRequestBody]):
    __model__ = UpdateOrganizationRequestBody
    full_name = faker.company

    @classmethod
    def abbreviation(cls) -> str:
        return faker.lexify("???")


class FundingOrganizationResponseFactory(TypedDictFactory[FundingOrganizationResponse]):
    __model__ = FundingOrganizationResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    full_name = faker.company

    @classmethod
    def abbreviation(cls) -> str:
        return faker.lexify("???")

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()



class SourceResponseFactory(TypedDictFactory[SourceResponse]):
    __model__ = SourceResponse

    @classmethod
    def sourceId(cls) -> str:  # noqa: N802
        return str(uuid4())

    @classmethod
    def status(cls) -> SourceIndexingStatusEnum:
        return faker.random_element(SourceIndexingStatusEnum)

    @classmethod
    def filename(cls) -> str:
        return faker.file_name(extension="pdf")

    @classmethod
    def url(cls) -> str:
        return faker.url()


class AppFundingOrgResponseFactory(TypedDictFactory[AppFundingOrgResponse]):
    __model__ = AppFundingOrgResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    full_name = faker.company

    @classmethod
    def abbreviation(cls) -> str:
        return faker.lexify("???")

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class ResearchObjectiveFactory(TypedDictFactory[ResearchObjective]):
    __model__ = ResearchObjective
    objective = faker.sentence
    description = faker.paragraph


class ResearchDeepDiveFactory(TypedDictFactory[ResearchDeepDive]):
    __model__ = ResearchDeepDive
    executive_summary = faker.paragraph

    @classmethod
    def research_objectives(cls) -> list[ResearchObjective]:
        return [ResearchObjectiveFactory.build() for _ in range(3)]


class GrantElementFactory(TypedDictFactory[GrantElement]):
    __model__ = GrantElement

    @classmethod
    def id(cls) -> str:
        return faker.slug().replace("-", "_")

    title = faker.sentence

    @classmethod
    def type(cls) -> str:
        return faker.random_element(["text", "number", "select", "textarea"])

    @classmethod
    def order(cls) -> int:
        return faker.pyint(min_value=1, max_value=10)

    placeholder = faker.sentence

    @classmethod
    def required(cls) -> bool:
        return faker.pybool()

    validation_rules = dict


class GrantLongFormSectionFactory(TypedDictFactory[GrantLongFormSection]):
    __model__ = GrantLongFormSection

    @classmethod
    def id(cls) -> str:
        return faker.slug().replace("-", "_")

    title = faker.sentence

    @classmethod
    def order(cls) -> int:
        return faker.pyint(min_value=1, max_value=10)

    content = faker.paragraph

    @classmethod
    def character_limit(cls) -> int:
        return faker.pyint(min_value=500, max_value=5000)

    @classmethod
    def word_limit(cls) -> int:
        return faker.pyint(min_value=100, max_value=1000)


class GrantTemplateResponseFactory(TypedDictFactory[GrantTemplateResponse]):
    __model__ = GrantTemplateResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def grant_application_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def funding_organization_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def funding_organization(cls) -> AppFundingOrgResponse:
        return AppFundingOrgResponseFactory.build()

    @classmethod
    def grant_sections(cls) -> list[GrantLongFormSection | GrantElement]:
        return [GrantLongFormSectionFactory.build() for _ in range(5)]

    @classmethod
    def submission_date(cls) -> str:
        return (datetime.now(UTC) + timedelta(days=30)).isoformat()

    @classmethod
    def rag_sources(cls) -> list[SourceResponse]:
        return [SourceResponseFactory.build() for _ in range(3)]

    @classmethod
    def rag_job_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class ApplicationResponseFactory(TypedDictFactory[ApplicationResponse]):
    __model__ = ApplicationResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def title(cls) -> str:
        return faker.catch_phrase()

    @classmethod
    def status(cls) -> ApplicationStatusEnum:
        return faker.random_element(ApplicationStatusEnum)

    @classmethod
    def completed_at(cls) -> str | None:
        return datetime.now(UTC).isoformat() if faker.pybool() else None

    @classmethod
    def form_inputs(cls) -> ResearchDeepDive:
        return ResearchDeepDiveFactory.build()

    @classmethod
    def research_objectives(cls) -> list[ResearchObjective]:
        return [ResearchObjectiveFactory.build() for _ in range(3)]

    text = faker.paragraph

    @classmethod
    def grant_template(cls) -> GrantTemplateResponse:
        return GrantTemplateResponseFactory.build()

    @classmethod
    def rag_sources(cls) -> list[SourceResponse]:
        return [SourceResponseFactory.build() for _ in range(2)]

    @classmethod
    def rag_job_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class ApplicationListItemResponseFactory(TypedDictFactory[ApplicationListItemResponse]):
    __model__ = ApplicationListItemResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def title(cls) -> str:
        return faker.catch_phrase()

    @classmethod
    def status(cls) -> ApplicationStatusEnum:
        return faker.random_element(ApplicationStatusEnum)

    @classmethod
    def completed_at(cls) -> str | None:
        return datetime.now(UTC).isoformat() if faker.pybool() else None

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class PaginationMetadataFactory(TypedDictFactory[PaginationMetadata]):
    __model__ = PaginationMetadata

    @classmethod
    def total(cls) -> int:
        return faker.pyint(min_value=0, max_value=100)

    @classmethod
    def limit(cls) -> int:
        return 20

    @classmethod
    def offset(cls) -> int:
        return 0

    @classmethod
    def has_more(cls) -> bool:
        return faker.pybool()


class ApplicationListResponseFactory(TypedDictFactory[ApplicationListResponse]):
    __model__ = ApplicationListResponse

    @classmethod
    def applications(cls) -> list[ApplicationListItemResponse]:
        return [ApplicationListItemResponseFactory.build() for _ in range(10)]

    @classmethod
    def pagination(cls) -> PaginationMetadata:
        return PaginationMetadataFactory.build()


class AutofillResponseFactory(TypedDictFactory[AutofillResponse]):
    __model__ = AutofillResponse

    @classmethod
    def message_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def application_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def autofill_type(cls) -> str:
        return faker.random_element(["research_plan", "research_deep_dive"])

    @classmethod
    def field_name(cls) -> str:
        return faker.slug()



class GenerateGrantTemplateRequestBodyFactory(TypedDictFactory[GenerateGrantTemplateRequestBody]):
    __model__ = GenerateGrantTemplateRequestBody

    @classmethod
    def funding_organization_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def submission_date(cls) -> str:
        return (datetime.now(UTC) + timedelta(days=30)).isoformat()

    @classmethod
    def grant_url(cls) -> str:
        return faker.url()

    @classmethod
    def grant_name(cls) -> str:
        return faker.catch_phrase()


class GenerateGrantTemplateResponseFactory(TypedDictFactory[GenerateGrantTemplateResponse]):
    __model__ = GenerateGrantTemplateResponse

    @classmethod
    def message_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def grant_template_id(cls) -> str:
        return str(uuid4())


class UpdateGrantTemplateRequestBodyFactory(TypedDictFactory[UpdateGrantTemplateRequestBody]):
    __model__ = UpdateGrantTemplateRequestBody

    @classmethod
    def funding_organization_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def submission_date(cls) -> str:
        return (datetime.now(UTC) + timedelta(days=30)).isoformat()

    @classmethod
    def grant_sections(cls) -> list[GrantLongFormSection | GrantElement]:
        return [GrantLongFormSectionFactory.build() for _ in range(5)]



class NotificationResponseFactory(TypedDictFactory[NotificationResponse]):
    __model__ = NotificationResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def resource_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def resource_type(cls) -> str:
        return faker.random_element(["grant_application", "grant_template"])

    @classmethod
    def notification_type(cls) -> NotificationTypeEnum:
        return faker.random_element(NotificationTypeEnum)

    message = faker.sentence

    @classmethod
    def is_dismissed(cls) -> bool:
        return faker.pybool()

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class NotificationListResponseFactory(TypedDictFactory[ListNotificationsResponse]):
    __model__ = ListNotificationsResponse

    @classmethod
    def notifications(cls) -> list[NotificationResponse]:
        return [NotificationResponseFactory.build() for _ in range(5)]


class DismissNotificationRequestBodyFactory(TypedDictFactory[DismissNotificationRequestBody]):
    __model__ = DismissNotificationRequestBody



class CreateInvitationRequestBodyFactory(TypedDictFactory[CreateInvitationRequestBody]):
    __model__ = CreateInvitationRequestBody

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)


class CreateInvitationResponseFactory(TypedDictFactory[CreateInvitationResponse]):
    __model__ = CreateInvitationResponse

    @classmethod
    def invitation_url(cls) -> str:
        return faker.url()


class AcceptInvitationRequestBodyFactory(TypedDictFactory[AcceptInvitationRequestBody]):
    __model__ = AcceptInvitationRequestBody

    @classmethod
    def invitation_token(cls) -> str:
        return faker.lexify("?" * 32)


class UpdateInvitationRoleRequestBodyFactory(TypedDictFactory[UpdateInvitationRoleRequestBody]):
    __model__ = UpdateInvitationRoleRequestBody

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)


class UpdateMemberRoleRequestBodyFactory(TypedDictFactory[UpdateMemberRoleRequestBody]):
    __model__ = UpdateMemberRoleRequestBody

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element([UserRoleEnum.OWNER, UserRoleEnum.MEMBER])


class InvitationResponseFactory(TypedDictFactory[InvitationResponse]):
    __model__ = InvitationResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)

    @classmethod
    def expires_at(cls) -> str:
        return (datetime.now(UTC) + timedelta(days=7)).isoformat()

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class MemberResponseFactory(TypedDictFactory[MemberResponse]):
    __model__ = MemberResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def firebase_uid(cls) -> str:
        return faker.lexify("?" * 28)

    email = faker.email

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class MembersListResponseFactory(TypedDictFactory[MembersListResponse]):
    __model__ = MembersListResponse

    @classmethod
    def members(cls) -> list[MemberResponse]:
        return [MemberResponseFactory.build() for _ in range(3)]

    @classmethod
    def invitations(cls) -> list[InvitationResponse]:
        return [InvitationResponseFactory.build() for _ in range(2)]


class ProjectDetailResponseFactory(TypedDictFactory[ProjectDetailResponse]):
    __model__ = ProjectDetailResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def name(cls) -> str:
        return faker.company()

    description = faker.paragraph

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class ProjectListResponseFactory(TypedDictFactory[ProjectListResponse]):
    __model__ = ProjectListResponse

    @classmethod
    def projects(cls) -> list[ProjectDetailResponse]:
        return [ProjectDetailResponseFactory.build() for _ in range(3)]



class RagJobResponseFactory(TypedDictFactory[RagJobResponse]):
    __model__ = RagJobResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def job_type(cls) -> str:
        return faker.random_element(["INDEXING", "TEMPLATE_GENERATION", "APPLICATION_GENERATION"])

    @classmethod
    def status(cls) -> str:
        return faker.random_element(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])

    @classmethod
    def progress(cls) -> int:
        return faker.pyint(min_value=0, max_value=100)

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def started_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def completed_at(cls) -> str | None:
        return datetime.now(UTC).isoformat() if faker.pybool() else None



class CreateUploadUrlRequestBodyFactory(TypedDictFactory[CreateUploadUrlRequestBody]):
    __model__ = CreateUploadUrlRequestBody

    @classmethod
    def filenames(cls) -> list[str]:
        return [faker.file_name(extension="pdf") for _ in range(3)]

    @classmethod
    def grant_application_id(cls) -> str:
        return str(uuid4())


class CreateUploadUrlResponseFactory(TypedDictFactory[CreateUploadUrlResponse]):
    __model__ = CreateUploadUrlResponse

    @classmethod
    def upload_urls(cls) -> dict[str, str]:
        return {faker.file_name(extension="pdf"): faker.url() for _ in range(3)}


class CrawlUrlRequestBodyFactory(TypedDictFactory[CrawlUrlRequestBody]):
    __model__ = CrawlUrlRequestBody

    @classmethod
    def urls(cls) -> list[str]:
        return [faker.url() for _ in range(3)]

    @classmethod
    def grant_application_id(cls) -> str:
        return str(uuid4())


class RagSourceResponseFactory(TypedDictFactory[RagSourceResponse]):
    __model__ = RagSourceResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def project_id(cls) -> str:
        return str(uuid4())

    @classmethod
    def source_type(cls) -> str:
        return faker.random_element(["FILE", "URL"])

    @classmethod
    def indexing_status(cls) -> SourceIndexingStatusEnum:
        return faker.random_element(SourceIndexingStatusEnum)

    @classmethod
    def filename(cls) -> str:
        return faker.file_name(extension="pdf")

    @classmethod
    def url(cls) -> str:
        return faker.url()

    @classmethod
    def created_at(cls) -> str:
        return datetime.now(UTC).isoformat()

    @classmethod
    def updated_at(cls) -> str:
        return datetime.now(UTC).isoformat()


class RagSourceListResponseFactory(TypedDictFactory[RagSourceListResponse]):
    __model__ = RagSourceListResponse

    @classmethod
    def sources(cls) -> list[RagSourceResponse]:
        return [RagSourceResponseFactory.build() for _ in range(5)]



class ProjectWithRoleResponseFactory(TypedDictFactory[ProjectWithRoleResponse]):
    __model__ = ProjectWithRoleResponse

    @classmethod
    def id(cls) -> str:
        return str(uuid4())

    @classmethod
    def name(cls) -> str:
        return faker.company()

    @classmethod
    def role(cls) -> UserRoleEnum:
        return faker.random_element(UserRoleEnum)


class SoleOwnedProjectsResponseFactory(TypedDictFactory[GetSoleOwnedProjectsResponse]):
    __model__ = GetSoleOwnedProjectsResponse

    @classmethod
    def sole_owned_projects(cls) -> list[ProjectWithRoleResponse]:
        return [ProjectWithRoleResponseFactory.build() for _ in range(2)]
