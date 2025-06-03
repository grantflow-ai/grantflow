from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, NotRequired, TypedDict

from litestar.exceptions import ValidationException
from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchDeepDive, ResearchObjective


class ApplicationUpdateDTO(TypedDict):
    title: NotRequired[str]
    status: NotRequired[ApplicationStatusEnum]
    research_objectives: NotRequired[list[ResearchObjective]]


class FundingOrganizationDTO(TypedDict):
    id: str
    full_name: str
    abbreviation: str | None


class GrantTemplateDTO(TypedDict):
    id: str
    grant_sections: list[GrantElement | GrantLongFormSection]
    funding_organization: NotRequired[FundingOrganizationDTO | None]
    grant_application_id: str


class ApplicationResponseDTO(TypedDict):
    id: str
    title: str
    status: ApplicationStatusEnum
    research_objectives: list[ResearchObjective] | None
    form_inputs: ResearchDeepDive | None
    text: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    grant_template: NotRequired[GrantTemplateDTO | None]


class ApplicationWizardResponseDTO(TypedDict):
    data: ApplicationResponseDTO
    completed_steps: NotRequired[list[str]]


@dataclass
class ApplicationSetupInput:
    title: str

    def __post_init__(self) -> None:
        if not self.title:
            raise ValidationException("Application title is required")


@dataclass
class ResearchTask:
    title: str
    description: str | None = None

    def __post_init__(self) -> None:
        if not self.title or len(self.title) < 10:
            raise ValidationException("Each task must have a title of at least 10 characters")


@dataclass
class ResearchObjectiveInput:
    title: str
    description: str | None = None
    research_tasks: list[ResearchTask] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.title or len(self.title) < 10:
            raise ValidationException("Each objective must have a title of at least 10 characters")

        if not self.research_tasks or len(self.research_tasks) == 0:
            raise ValidationException("Each objective must have at least one research task")


@dataclass
class ResearchPlanInput:
    research_objectives: list[ResearchObjectiveInput]

    def __post_init__(self) -> None:
        if not self.research_objectives or len(self.research_objectives) == 0:
            raise ValidationException("At least one research objective is required")


@dataclass
class TemplateReviewInput:
    grant_template: dict[str, Any]
    funding_organization_id: str | None = None

    def __post_init__(self) -> None:
        if not self.grant_template:
            raise ValidationException("Grant template data is required")


@dataclass
class ResearchDeepDiveInput:
    research_deep_dive: dict[str, str] = field(default_factory=dict)
