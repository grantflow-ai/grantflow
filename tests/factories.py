from random import uniform
from textwrap import dedent
from typing import Any, cast

from faker import Faker
from pgvector.utils import Vector
from polyfactory.factories import TypedDictFactory
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from sqlalchemy import Column

from src.api_types import (
    ApplicationBaseResponse,
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    ApplicationFileResponse,
    ApplicationFullResponse,
    CreateApplicationRequestBody,
    CreateResearchAimRequestBody,
    CreateResearchTaskRequestBody,
    CreateWorkspaceRequestBody,
    LoginRequestBody,
    LoginResponse,
    OTPResponse,
    ResearchAimResponse,
    ResearchTaskResponse,
    TableIdResponse,
    UpdateApplicationRequestBody,
    UpdateResearchAimRequestBody,
    UpdateResearchTaskRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceBaseResponse,
    WorkspaceFullResponse,
    WorkspaceIdResponse,
)
from src.constants import EMBEDDING_DIMENSIONS
from src.db.tables import (
    ApplicationVector,
    FundingOrganization,
    GenerationResult,
    GrantApplication,
    GrantApplicationFile,
    GrantSection,
    GrantTemplate,
    GrantTemplateVector,
    OrganizationGrantGuidelinesFile,
    ResearchAim,
    ResearchTask,
    SectionTopic,
    Workspace,
    WorkspaceUser,
)

faker = Faker()


# Grant Format Related Factories
class GrantTemplateFactory(SQLAlchemyFactory[GrantTemplate]):
    __model__ = GrantTemplate
    template = dedent("""
    ## Executive Summary

    {{EXECUTIVE_SUMMARY}}

    ## Significance

    {{SIGNIFICANCE}}

    ## Innovation

    {{INNOVATION}}

    ## Specific Aims

    {{SPECIFIC_AIMS}}

    ## Work Plan

    {{WORK_PLAN}}

    ## Resources

    {{RESOURCES}}

    ## Expected Outcomes

    {{EXPECTED_OUTCOMES}}

    """)


class GrantFormatFileFactory(SQLAlchemyFactory[OrganizationGrantGuidelinesFile]):
    __model__ = OrganizationGrantGuidelinesFile


class GrantSectionFactory(SQLAlchemyFactory[GrantSection]):
    __model__ = GrantSection


class SectionAspectsFactory(SQLAlchemyFactory[SectionTopic]):
    __model__ = SectionTopic


class GrantTemplateVectorFactory(SQLAlchemyFactory[GrantTemplateVector]):
    __model__ = GrantTemplateVector
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


class ResearchAimFactory(SQLAlchemyFactory[ResearchAim]):
    __model__ = ResearchAim


class ResearchTaskFactory(SQLAlchemyFactory[ResearchTask]):
    __model__ = ResearchTask


class TextGenerationResultFactory(SQLAlchemyFactory[GenerationResult]):
    __model__ = GenerationResult


class ApplicationVectorFactory(SQLAlchemyFactory[ApplicationVector]):
    __model__ = ApplicationVector
    embedding = [uniform(-1, 1) for _ in range(EMBEDDING_DIMENSIONS)]

    @classmethod
    def get_type_from_column(cls, column: Column[Any]) -> type:
        if column.name == "embedding":
            return cast(type, Vector)
        return super().get_type_from_column(column)


# Request Body Factories
class CreateApplicationRequestBodyFactory(TypedDictFactory[CreateApplicationRequestBody]):
    __model__ = CreateApplicationRequestBody


class CreateWorkspaceRequestBodyFactory(TypedDictFactory[CreateWorkspaceRequestBody]):
    __model__ = CreateWorkspaceRequestBody


class UpdateWorkspaceRequestBodyFactory(TypedDictFactory[UpdateWorkspaceRequestBody]):
    __model__ = UpdateWorkspaceRequestBody


class CreateResearchTaskRequestBodyFactory(TypedDictFactory[CreateResearchTaskRequestBody]):
    __model__ = CreateResearchTaskRequestBody


class CreateResearchAimRequestBodyFactory(TypedDictFactory[CreateResearchAimRequestBody]):
    __model__ = CreateResearchAimRequestBody


class UpdateApplicationRequestBodyFactory(TypedDictFactory[UpdateApplicationRequestBody]):
    __model__ = UpdateApplicationRequestBody


class UpdateResearchTaskRequestBodyFactory(TypedDictFactory[UpdateResearchTaskRequestBody]):
    __model__ = UpdateResearchTaskRequestBody


class UpdateResearchAimRequestBodyFactory(TypedDictFactory[UpdateResearchAimRequestBody]):
    __model__ = UpdateResearchAimRequestBody


class LoginRequestBodyFactory(TypedDictFactory[LoginRequestBody]):
    __model__ = LoginRequestBody


# API Response Factories
class WorkspaceIdResponseFactory(TypedDictFactory[WorkspaceIdResponse]):
    __model__ = WorkspaceIdResponse


class ResearchTaskResponseFactory(TypedDictFactory[ResearchTaskResponse]):
    __model__ = ResearchTaskResponse


class ResearchAimResponseFactory(TypedDictFactory[ResearchAimResponse]):
    __model__ = ResearchAimResponse


class ApplicationIdResponseFactory(TypedDictFactory[TableIdResponse]):
    __model__ = TableIdResponse


class ApplicationFileResponseFactory(TypedDictFactory[ApplicationFileResponse]):
    __model__ = ApplicationFileResponse


class ApplicationBaseResponseFactory(TypedDictFactory[ApplicationBaseResponse]):
    __model__ = ApplicationBaseResponse


class ApplicationFullResponseFactory(TypedDictFactory[ApplicationFullResponse]):
    __model__ = ApplicationFullResponse


class ApplicationDraftProcessingResponseFactory(TypedDictFactory[ApplicationDraftProcessingResponse]):
    __model__ = ApplicationDraftProcessingResponse


class ApplicationDraftCompleteResponseFactory(TypedDictFactory[ApplicationDraftCompleteResponse]):
    __model__ = ApplicationDraftCompleteResponse


class WorkspaceBaseResponseFactory(TypedDictFactory[WorkspaceBaseResponse]):
    __model__ = WorkspaceBaseResponse


class WorkspaceFullResponseFactory(TypedDictFactory[WorkspaceFullResponse]):
    __model__ = WorkspaceFullResponse


class OTPResponseFactory(TypedDictFactory[OTPResponse]):
    __model__ = OTPResponse


class LoginResponseFactory(TypedDictFactory[LoginResponse]):
    __model__ = LoginResponse
