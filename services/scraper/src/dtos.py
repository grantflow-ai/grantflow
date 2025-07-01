from __future__ import annotations

from typing import TypedDict


class GrantInfo(TypedDict):
    """A type representing a grant information row in the scrapped excel sheet."""

    title: str
    release_date: str
    expired_date: str
    activity_code: str
    organization: str
    parent_organization: str
    participating_orgs: str
    document_number: str
    document_type: str
    clinical_trials: str
    url: str
