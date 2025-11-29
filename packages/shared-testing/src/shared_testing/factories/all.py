from random import choice
from typing import Any, cast

from faker import Faker
from numpy.random import default_rng
from packages.db.src.constants import (
    EMBEDDING_DIMENSIONS,
    RAG_FILE,
    RAG_URL,
)
from packages.db.src.enums import GrantType, RagGenerationStatusEnum, UserRoleEnum
from packages.db.src.json_objects import (
    Chunk,
    GrantElement,
    GrantLongFormSection,
    LengthConstraint,
    ResearchObjective,
    ResearchTask,
)
from packages.db.src.tables import (
    BackofficeAdmin,
    GenerationNotification,
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Organization,
    OrganizationInvitation,
    OrganizationUser,
    PredefinedGrantTemplate,
    Project,
    ProjectAccess,
    RagFile,
    RagGenerationJob,
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
    length_constraint = Use(
        lambda: cast(
            "LengthConstraint",
            {"type": "words", "value": 3000, "source": "Factory default"},
        )
    )
    search_queries = Use(lambda: ["query1", "query2", "query3"])
    depends_on: list[str] = Use(list)  # type: ignore[assignment]


class GrantTemplateFactory(SQLAlchemyFactory[GrantTemplate]):
    __model__ = GrantTemplate

    __set_relationships__ = False
    __set_association_proxy__ = False
    rag_job_id = None
    deleted_at = None
    grant_type = GrantType.RESEARCH
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
    predefined_template_id = None


class RagSourceFactory(SQLAlchemyFactory[RagSource]):
    __model__ = RagSource

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = choice([RAG_FILE, RAG_URL])
    deleted_at = None
    parent_id = None


class RagFileFactory(SQLAlchemyFactory[RagFile]):
    __model__ = RagFile

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = RAG_FILE
    deleted_at = None
    parent_id = None


class RagUrlFactory(SQLAlchemyFactory[RagUrl]):
    __model__ = RagUrl

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = RAG_URL
    deleted_at = None
    parent_id = None


class GrantTemplateSourceFactory(SQLAlchemyFactory[GrantTemplateSource]):
    __model__ = GrantTemplateSource

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = choice([RAG_FILE, RAG_URL])
    deleted_at = None
    parent_id = None


class TextVectorFactory(SQLAlchemyFactory[TextVector]):
    __model__ = TextVector

    __set_relationships__ = False
    __set_association_proxy__ = False
    embedding = rng.random(EMBEDDING_DIMENSIONS).tolist()

    @classmethod
    def get_type_from_column(cls, column: Column[Any]) -> type:
        if column.name == "embedding":
            return cast("type", Vector)
        return super().get_type_from_column(column)


class GrantingInstitutionFactory(SQLAlchemyFactory[GrantingInstitution]):
    __model__ = GrantingInstitution

    __set_relationships__ = False
    __set_association_proxy__ = False


class GrantingInstitutionSourceFactory(SQLAlchemyFactory[GrantingInstitutionSource]):
    __model__ = GrantingInstitutionSource

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = choice([RAG_FILE, RAG_URL])
    deleted_at = None


class PredefinedGrantTemplateFactory(SQLAlchemyFactory[PredefinedGrantTemplate]):
    __model__ = PredefinedGrantTemplate

    __set_relationships__ = False
    __set_association_proxy__ = False
    grant_type = GrantType.RESEARCH
    grant_sections = GrantTemplateFactory.grant_sections  # reuse default sections
    guideline_source = "testing/test_data/sources/guidelines/nih/NIH- Instructions for Research (R).pdf"
    guideline_version = "Forms-H"
    activity_code = "R01"
    deleted_at = None


class BackofficeAdminFactory(SQLAlchemyFactory[BackofficeAdmin]):
    __model__ = BackofficeAdmin

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None

    firebase_uid = Use(lambda: faker.uuid4()[:128])
    email = Use(lambda: faker.email())
    granted_by_firebase_uid = None


class OrganizationFactory(SQLAlchemyFactory[Organization]):
    __model__ = Organization

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None


class ProjectFactory(SQLAlchemyFactory[Project]):
    __model__ = Project

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None

    organization_id = Use(lambda: faker.uuid4())


class ProjectAccessFactory(SQLAlchemyFactory[ProjectAccess]):
    __model__ = ProjectAccess

    __set_relationships__ = False
    __set_association_proxy__ = False

    firebase_uid = Use(lambda: faker.uuid4()[:128])
    project_id = Use(lambda: faker.uuid4())
    organization_id = Use(lambda: faker.uuid4())


class OrganizationUserFactory(SQLAlchemyFactory[OrganizationUser]):
    __model__ = OrganizationUser

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None

    firebase_uid = Use(lambda: faker.uuid4()[:128])
    organization_id = Use(lambda: faker.uuid4())
    role = Use(lambda: choice(list(UserRoleEnum)))
    has_all_projects_access = False


ProjectUserFactory = OrganizationUserFactory


class OrganizationInvitationFactory(SQLAlchemyFactory[OrganizationInvitation]):
    __model__ = OrganizationInvitation

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None

    organization_id = Use(lambda: faker.uuid4())
    email = Use(lambda: faker.email())
    role = Use(lambda: choice(list(UserRoleEnum)))
    invitation_sent_at = Use(lambda: faker.date_time())


class RagGenerationJobFactory(SQLAlchemyFactory[RagGenerationJob]):
    __model__ = RagGenerationJob

    __set_relationships__ = False
    __set_association_proxy__ = False
    retry_count = 0
    status = RagGenerationStatusEnum.PENDING
    checkpoint_data = None
    parent_job_id = None


class GenerationNotificationFactory(SQLAlchemyFactory[GenerationNotification]):
    __model__ = GenerationNotification

    __set_relationships__ = False
    __set_association_proxy__ = False
    event = faker.word()
    message = faker.sentence()
    notification_type = "info"


class ResearchTaskFactory(TypedDictFactory[ResearchTask]):
    __model__ = ResearchTask


class ResearchObjectiveFactory(TypedDictFactory[ResearchObjective]):
    __model__ = ResearchObjective


class GrantApplicationFactory(SQLAlchemyFactory[GrantApplication]):
    __model__ = GrantApplication

    __set_relationships__ = False
    __set_association_proxy__ = False
    deleted_at = None
    parent_id = None
    research_objectives = Use(
        lambda: [
            ResearchObjectiveFactory.build(
                number=1,
                title="Research Objective 1",
                research_tasks=[
                    ResearchTaskFactory.build(number=1, title="Task 1.1"),
                    ResearchTaskFactory.build(number=2, title="Task 1.2"),
                ],
            ),
            ResearchObjectiveFactory.build(
                number=2,
                title="Research Objective 2",
                research_tasks=[
                    ResearchTaskFactory.build(number=1, title="Task 2.1"),
                ],
            ),
        ]
    )


class GrantApplicationSourceFactory(SQLAlchemyFactory[GrantApplicationSource]):
    __model__ = GrantApplicationSource

    __set_relationships__ = False
    __set_association_proxy__ = False
    source_type = choice([RAG_FILE, RAG_URL])
    deleted_at = None


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
