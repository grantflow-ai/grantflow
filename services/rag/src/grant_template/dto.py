from typing import NotRequired, TypedDict


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]
