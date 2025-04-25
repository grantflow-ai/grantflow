from typing import Any, TypedDict, cast

from faker import Faker
from numpy.random import default_rng
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    OrganizationFile,
    RagFile,
    TextVector,
    Workspace,
    WorkspaceUser,
)
from pgvector.utils import Vector
from polyfactory.factories import TypedDictFactory
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from services.backend.src.api.http.auth import LoginRequestBody, LoginResponse, OTPResponse
from services.backend.src.api.http.funding_organizations import CreateOrganizationRequestBody
from services.backend.src.api.http.grant_applications import (
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    CreateApplicationRequestBody,
    UpdateApplicationRequestBody,
)
from services.backend.src.api.http.workspaces import (
    CreateWorkspaceRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceBaseResponse,
)
from services.backend.src.common_types import TableIdResponse
from services.backend.src.rag.grant_template.determine_application_sections import ExtractedSectionDTO
from services.backend.src.rag.grant_template.determine_longform_metadata import SectionMetadata
from services.backend.src.rag.grant_template.extract_cfp_data import Content
from services.backend.src.tables import EMBEDDING_DIMENSIONS
from sqlalchemy import Column

faker = Faker()
rng = default_rng()


class GrantElementFactory(TypedDictFactory[GrantElement]):
    __model__ = GrantElement
    id = faker.uuid4()
    order = 1
    title = faker.sentence()
    parent_id = None


class GrantSectionFactory(TypedDictFactory[GrantLongFormSection]):
    __model__ = GrantLongFormSection
    is_research_plan = False
    parent_id = None
    order = 1
    keywords = ["methodology", "design", "analysis"]
    topics = ["background_context", "methodology"]
    max_words = 3000
    search_queries = ["query1", "query2", "query3"]
    depends_on: list[str] = []


class GrantTemplateFactory(SQLAlchemyFactory[GrantTemplate]):
    __model__ = GrantTemplate
    grant_sections = [
        GrantSectionFactory.build(
            title="Executive Summary", description="A brief overview of the research proposal", order=1
        ),
        GrantSectionFactory.build(
            title="Significance", description="The importance and potential impact of the research", order=2
        ),
        GrantSectionFactory.build(
            title="Innovation", description="Novel aspects and innovative approaches of the research", order=3
        ),
    ]


class FileFactory(SQLAlchemyFactory[RagFile]):
    __model__ = RagFile


class OrganizationFileFactory(SQLAlchemyFactory[OrganizationFile]):
    __model__ = OrganizationFile


class TextVectorFactory(SQLAlchemyFactory[TextVector]):
    __model__ = TextVector
    embedding = rng.random(EMBEDDING_DIMENSIONS).tolist()

    @classmethod
    def get_type_from_column(cls, column: Column[Any]) -> type:
        if column.name == "embedding":
            return cast("type", Vector)
        return super().get_type_from_column(column)


class FundingOrganizationFactory(SQLAlchemyFactory[FundingOrganization]):
    __model__ = FundingOrganization


class WorkspaceFactory(SQLAlchemyFactory[Workspace]):
    __model__ = Workspace


class WorkspaceUserFactory(SQLAlchemyFactory[WorkspaceUser]):
    __model__ = WorkspaceUser


class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication


class GrantApplicationFileFactory(SQLAlchemyFactory[GrantApplicationFile]):
    __model__ = GrantApplicationFile


class CreateApplicationRequestBodyFactory(TypedDictFactory[CreateApplicationRequestBody]):
    __model__ = CreateApplicationRequestBody


class CreateOrganizationRequestBodyFactory(TypedDictFactory[CreateOrganizationRequestBody]):
    __model__ = CreateOrganizationRequestBody


class CreateWorkspaceRequestBodyFactory(TypedDictFactory[CreateWorkspaceRequestBody]):
    __model__ = CreateWorkspaceRequestBody


class UpdateWorkspaceRequestBodyFactory(TypedDictFactory[UpdateWorkspaceRequestBody]):
    __model__ = UpdateWorkspaceRequestBody


class UpdateApplicationRequestBodyFactory(TypedDictFactory[UpdateApplicationRequestBody]):
    __model__ = UpdateApplicationRequestBody


class LoginRequestBodyFactory(TypedDictFactory[LoginRequestBody]):
    __model__ = LoginRequestBody


class ResearchObjectiveFactory(TypedDictFactory[ResearchObjective]):
    __model__ = ResearchObjective


class ResearchTaskFactory(TypedDictFactory[ResearchTask]):
    __model__ = ResearchTask

    keywords = ["methodology", "design", "analysis"]
    topics = ["background_context", "methodology"]
    max_words = 3000
    search_queries = ["query1", "query2", "query3"]
    depends_on: list[str] = []


class TableIdResponseFactory(TypedDictFactory[TableIdResponse]):
    __model__ = TableIdResponse


class ApplicationDraftProcessingResponseFactory(TypedDictFactory[ApplicationDraftProcessingResponse]):
    __model__ = ApplicationDraftProcessingResponse


class ApplicationDraftCompleteResponseFactory(TypedDictFactory[ApplicationDraftCompleteResponse]):
    __model__ = ApplicationDraftCompleteResponse


class WorkspaceBaseResponseFactory(TypedDictFactory[WorkspaceBaseResponse]):
    __model__ = WorkspaceBaseResponse


class OTPResponseFactory(TypedDictFactory[OTPResponse]):
    __model__ = OTPResponse


class LoginResponseFactory(TypedDictFactory[LoginResponse]):
    __model__ = LoginResponse


class ExtractedSectionDTOFactory(TypedDictFactory[ExtractedSectionDTO]):
    __model__ = ExtractedSectionDTO
    title = faker.sentence()
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


class CfpContentFactory(TypedDictFactory[Content]):
    __model__ = Content
    title = faker.sentence(nb_words=3)

    @classmethod
    def subtitles(cls) -> list[str]:
        return [faker.sentence(nb_words=5) for _ in range(3)]


class ExtractedCfpData(TypedDict):
    organization_id: str
    cfp_subject: str
    content: list[Content]


class ExtractedCfpDataFactory(TypedDictFactory[ExtractedCfpData]):
    __model__ = ExtractedCfpData
    organization_id = faker.uuid4
    cfp_subject = faker.sentence

    @classmethod
    def content(cls) -> list[Content]:
        return [CfpContentFactory.build() for _ in range(3)]
