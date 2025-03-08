from typing import Any, cast

from faker import Faker
from numpy.random import default_rng
from pgvector.utils import Vector
from polyfactory.factories import TypedDictFactory
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from sqlalchemy import Column

from src.api_types import (
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    CreateApplicationRequestBody,
    CreateOrganizationRequestBody,
    CreateWorkspaceRequestBody,
    LoginRequestBody,
    LoginResponse,
    OTPResponse,
    TableIdResponse,
    UpdateApplicationRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceBaseResponse,
)
from src.constants import EMBEDDING_DIMENSIONS
from src.db.json_objects import GrantElement, GrantLongFormSection, ResearchObjective, ResearchTask
from src.db.tables import (
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
            return cast(type, Vector)
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
