from random import choice
from typing import Any, cast

from faker import Faker
from numpy.random import default_rng
from packages.db.src.constants import EMBEDDING_DIMENSIONS, RAG_FILE, RAG_URL
from packages.db.src.json_objects import Chunk, GrantElement, GrantLongFormSection, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagFile,
    RagUrl,
    TextVector,
    Workspace,
    WorkspaceUser,
)
from pgvector.utils import Vector
from polyfactory.factories import TypedDictFactory
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from polyfactory.fields import Use
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
    keywords = Use(lambda: ["methodology", "design", "analysis"])
    topics = Use(lambda: ["background_context", "methodology"])
    max_words = 3000
    search_queries = Use(lambda: ["query1", "query2", "query3"])
    depends_on: list[str] = Use(list)  # type: ignore[assignment]


class GrantTemplateFactory(SQLAlchemyFactory[GrantTemplate]):
    __model__ = GrantTemplate
    grant_sections = Use(
        lambda: [
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
    )


class RagFileFactory(SQLAlchemyFactory[RagFile]):
    __model__ = RagFile
    source_type = RAG_FILE


class RagUrlFactory(SQLAlchemyFactory[RagUrl]):
    __model__ = RagUrl
    source_type = RAG_URL


class GrantTemplateSourceFactory(SQLAlchemyFactory[GrantTemplateRagSource]):
    __model__ = GrantTemplateRagSource
    source_type = choice([RAG_FILE, RAG_URL])


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


class FundingOrganizationSourceFactory(SQLAlchemyFactory[FundingOrganizationRagSource]):
    __model__ = FundingOrganizationRagSource
    source_type = choice([RAG_FILE, RAG_URL])


class WorkspaceFactory(SQLAlchemyFactory[Workspace]):
    __model__ = Workspace


class WorkspaceUserFactory(SQLAlchemyFactory[WorkspaceUser]):
    __model__ = WorkspaceUser


class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication


class GrantApplicationSourceFactory(SQLAlchemyFactory[GrantApplicationRagSource]):
    __model__ = GrantApplicationRagSource
    source_type = choice([RAG_FILE, RAG_URL])


class ResearchObjectiveFactory(TypedDictFactory[ResearchObjective]):
    __model__ = ResearchObjective


class ResearchTaskFactory(TypedDictFactory[ResearchTask]):
    __model__ = ResearchTask

    keywords = Use(lambda: ["methodology", "design", "analysis"])
    topics = Use(lambda: ["background_context", "methodology"])
    max_words = 3000
    search_queries = Use(lambda: ["query1", "query2", "query3"])
    depends_on: list[str] = Use(list)  # type: ignore[assignment]


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
