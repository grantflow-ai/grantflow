from random import choice
from typing import Any, cast

from faker import Faker
from numpy.random import default_rng
from packages.db.src.constants import (
    EMBEDDING_DIMENSIONS,
    GRANT_APPLICATION_GENERATION,
    GRANT_TEMPLATE_GENERATION,
    RAG_FILE,
    RAG_URL,
)
from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.json_objects import Chunk, GrantElement, GrantLongFormSection, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationGenerationJob,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateGenerationJob,
    GrantTemplateRagSource,
    Project,
    ProjectUser,
    RagFile,
    RagGenerationJob,
    RagGenerationNotification,
    RagSource,
    RagUrl,
    TextVector,
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
    rag_job_id = None
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


class RagSourceFactory(SQLAlchemyFactory[RagSource]):
    __model__ = RagSource
    source_type = choice([RAG_FILE, RAG_URL])


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


class ProjectFactory(SQLAlchemyFactory[Project]):
    __model__ = Project


class ProjectUserFactory(SQLAlchemyFactory[ProjectUser]):
    __model__ = ProjectUser


class RagGenerationJobFactory(SQLAlchemyFactory[RagGenerationJob]):
    __model__ = RagGenerationJob
    total_stages = 5
    current_stage = 0
    retry_count = 0
    status = RagGenerationStatusEnum.PENDING
    job_type = "rag_generation_job"


class GrantTemplateGenerationJobFactory(SQLAlchemyFactory[GrantTemplateGenerationJob]):
    __model__ = GrantTemplateGenerationJob
    total_stages = 4
    current_stage = 0
    retry_count = 0
    status = RagGenerationStatusEnum.PENDING
    job_type = GRANT_TEMPLATE_GENERATION


class GrantApplicationGenerationJobFactory(SQLAlchemyFactory[GrantApplicationGenerationJob]):
    __model__ = GrantApplicationGenerationJob
    total_stages = 5
    current_stage = 0
    retry_count = 0
    status = RagGenerationStatusEnum.PENDING
    job_type = GRANT_APPLICATION_GENERATION


class RagGenerationNotificationFactory(SQLAlchemyFactory[RagGenerationNotification]):
    __model__ = RagGenerationNotification
    event = faker.word()
    message = faker.sentence()
    notification_type = "info"


class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication
    rag_job_id = None


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
