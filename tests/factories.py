from random import uniform
from textwrap import dedent
from typing import Any, cast

from faker import Faker
from pgvector.utils import Vector
from polyfactory.factories import TypedDictFactory
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from sqlalchemy import Column

from src.api_types import (
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    CreateApplicationRequestBody,
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
from src.db.json_objects import GrantSection, ResearchObjective, ResearchTask, TextGenerationResult
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


class GrantTemplateFactory(SQLAlchemyFactory[GrantTemplate]):
    __model__ = GrantTemplate
    template = dedent("""
    ## Executive Summary

    {{EXECUTIVE_SUMMARY}}

    ## Significance

    {{RESEARCH_SIGNIFICANCE}}

    ## Innovation

    {{RESEARCH_INNOVATION}}
    """)


class FileFactory(SQLAlchemyFactory[RagFile]):
    __model__ = RagFile


class OrganizationFileFactory(SQLAlchemyFactory[OrganizationFile]):
    __model__ = OrganizationFile


class GrantSectionFactory(SQLAlchemyFactory[GrantSection]):
    __model__ = GrantSection


class TextVectorFactory(SQLAlchemyFactory[TextVector]):
    __model__ = TextVector
    embedding = [uniform(-1, 1) for _ in range(EMBEDDING_DIMENSIONS)]

    @classmethod
    def get_type_from_column(cls, column: Column[Any]) -> type:
        if column.name == "embedding":
            return cast(type, Vector)
        return super().get_type_from_column(column)


# Organization Factories
class FundingOrganizationFactory(SQLAlchemyFactory[FundingOrganization]):
    __model__ = FundingOrganization


# Workspace Related Factories
class WorkspaceFactory(SQLAlchemyFactory[Workspace]):
    __model__ = Workspace


class WorkspaceUserFactory(SQLAlchemyFactory[WorkspaceUser]):
    __model__ = WorkspaceUser


# Application Related Factories
class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication


class GrantApplicationFileFactory(SQLAlchemyFactory[GrantApplicationFile]):
    __model__ = GrantApplicationFile


# Request Body Factories
class CreateApplicationRequestBodyFactory(TypedDictFactory[CreateApplicationRequestBody]):
    __model__ = CreateApplicationRequestBody


class CreateWorkspaceRequestBodyFactory(TypedDictFactory[CreateWorkspaceRequestBody]):
    __model__ = CreateWorkspaceRequestBody


class UpdateWorkspaceRequestBodyFactory(TypedDictFactory[UpdateWorkspaceRequestBody]):
    __model__ = UpdateWorkspaceRequestBody


class UpdateApplicationRequestBodyFactory(TypedDictFactory[UpdateApplicationRequestBody]):
    __model__ = UpdateApplicationRequestBody


class LoginRequestBodyFactory(TypedDictFactory[LoginRequestBody]):
    __model__ = LoginRequestBody


# JSON Object Factories
class ResearchObjectiveFactory(TypedDictFactory[ResearchObjective]):
    __model__ = ResearchObjective


class ResearchTaskFactory(SQLAlchemyFactory[ResearchTask]):
    __model__ = ResearchTask


class SectionGrantSectiony(TypedDictFactory[GrantSection]):
    __model__ = GrantSection


class GenerationResultFactory(TypedDictFactory[TextGenerationResult]):
    __model__ = TextGenerationResult


# API Response Factories


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
