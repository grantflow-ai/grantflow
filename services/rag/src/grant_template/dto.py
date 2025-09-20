from typing import NotRequired, TypedDict
from uuid import UUID


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]


class OrganizationNamespace(TypedDict):
    full_name: str
    abbreviation: str
    organization_id: UUID
