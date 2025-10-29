from __future__ import annotations

from typing import TypedDict


class RedTeamReviewDTO(TypedDict):
    review: str


class SentenceChangeDTO(TypedDict):
    original: str
    revised: str
    reason: str
    section: str


class SelectiveEditsDTO(TypedDict):
    changes: list[SentenceChangeDTO]
    rejected: int
    summary: str


class EditorialTimingDTO(TypedDict):
    elapsed_ms: int
    review_ms: int
    editing_ms: int
    apply_ms: int


class EditorialStatsDTO(TypedDict):
    review_words: int
    original_words: int
    edited_words: int
    word_change: int
    approved: int
    rejected: int
    total: int
    approval_rate: float


class EditorialMetadataDTO(TypedDict):
    review: str
    edits: SelectiveEditsDTO
    timing: EditorialTimingDTO
    stats: EditorialStatsDTO
