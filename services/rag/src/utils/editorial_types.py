"""
Shared types for editorial workflow.

This module contains TypedDict definitions used across the editorial workflow
to avoid circular imports between modules.
"""

from typing import TypedDict


class RedTeamReview(TypedDict):
    """Complete editorial review output."""

    review_letter: str


class SentenceChange(TypedDict):
    """Single sentence change with justification."""

    original_sentence: str
    revised_sentence: str
    reason: str
    section: str


class SelectiveEdits(TypedDict):
    """Selective edits output - only approved minor changes."""

    changes: list[SentenceChange]
    rejected_count: int
    summary: str


class EditorialWorkflowTiming(TypedDict):
    """Timing breakdown for editorial workflow."""

    total_seconds: float
    review_seconds: float
    editing_seconds: float
    apply_seconds: float


class EditorialWorkflowStatistics(TypedDict):
    """Statistics for editorial workflow results."""

    review_words: int
    original_words: int
    edited_words: int
    word_change: int
    approved_count: int
    rejected_count: int
    total_suggestions: int
    approval_rate: float


class EditorialWorkflowMetadata(TypedDict):
    """Complete metadata for editorial workflow execution."""

    review_letter: str
    approved_edits: SelectiveEdits
    timing: EditorialWorkflowTiming
    statistics: EditorialWorkflowStatistics
