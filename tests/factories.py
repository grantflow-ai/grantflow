from random import uniform
from typing import Any, cast

from faker import Faker
from pgvector.utils import Vector
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from sqlalchemy import Column

from src.constants import EMBEDDING_DIMENSIONS
from src.db.tables import (
    ApplicationFile,
    ApplicationVector,
    FundingOrganization,
    GenerationResult,
    GrantApplication,
    GrantCfp,
    ResearchAim,
    ResearchInnovation,
    ResearchSignificance,
    ResearchTask,
    User,
    Workspace,
    WorkspaceUser,
)

faker = Faker()


class UserFactory(SQLAlchemyFactory[User]):
    __model__ = User


class WorkspaceFactory(SQLAlchemyFactory[Workspace]):
    __model__ = Workspace


class WorkspaceUserFactory(SQLAlchemyFactory[WorkspaceUser]):
    __model__ = WorkspaceUser


class FundingOrganizationFactory(SQLAlchemyFactory[FundingOrganization]):
    __model__ = FundingOrganization


class GrantCfpFactory(SQLAlchemyFactory[GrantCfp]):
    __model__ = GrantCfp


class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication


class ApplicationFileFactory(SQLAlchemyFactory[ApplicationFile]):
    __model__ = ApplicationFile


class ResearchSignificanceFactory(SQLAlchemyFactory[ResearchSignificance]):
    __model__ = ResearchSignificance


class ResearchInnovationFactory(SQLAlchemyFactory[ResearchInnovation]):
    __model__ = ResearchInnovation


class ResearchAimFactory(SQLAlchemyFactory[ResearchAim]):
    __model__ = ResearchAim


class ResearchTaskFactory(SQLAlchemyFactory[ResearchTask]):
    __model__ = ResearchTask


class GenerationResultFactory(SQLAlchemyFactory[GenerationResult]):
    __model__ = GenerationResult


class ApplicationVectorFactory(SQLAlchemyFactory[ApplicationVector]):
    __model__ = ApplicationVector

    embedding = [uniform(-1, 1) for _ in range(EMBEDDING_DIMENSIONS)]

    @classmethod
    def get_type_from_column(cls, column: Column[Any]) -> type:
        if column.name == "embedding":
            return cast(type, Vector)
        return super().get_type_from_column(column)
