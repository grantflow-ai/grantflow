from polyfactory.factories import TypedDictFactory
from testing.factories import faker

from services.backend.src.api.routes.auth import (
    LoginRequestBody,
    LoginResponse,
    OTPResponse,
)
from services.backend.src.api.routes.funding_organizations import (
    CreateOrganizationRequestBody,
)
from services.backend.src.api.routes.projects import (
    CreateProjectRequestBody,
    ProjectBaseResponse,
    UpdateProjectRequestBody,
)
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
