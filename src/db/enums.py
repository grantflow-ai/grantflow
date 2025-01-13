from enum import StrEnum


class UserRoleEnum(StrEnum):
    """Enumeration of user roles."""

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class FileIndexingStatusEnum(StrEnum):
    """Enumeration of standard grant document sections."""

    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class GrantSectionEnum(StrEnum):
    """Enumeration of grant document sections covering 99.9% of STEM grant formats."""

    EXECUTIVE_SUMMARY = "EXECUTIVE_SUMMARY"
    RESEARCH_SIGNIFICANCE = "RESEARCH_SIGNIFICANCE"
    RESEARCH_INNOVATION = "RESEARCH_INNOVATION"
    RESEARCH_OBJECTIVES = "RESEARCH_OBJECTIVES"
    RESEARCH_PLAN = "RESEARCH_PLAN"
    RESOURCES = "RESOURCES"
    EXPECTED_OUTCOMES = "EXPECTED_OUTCOMES"


class ContentTopicEnum(StrEnum):
    """Enumeration of fundamental content topics that compose document sections."""

    BACKGROUND_CONTEXT = "BACKGROUND_CONTEXT"
    RESEARCH_FEASIBILITY = "RESEARCH_FEASIBILITY"
    HYPOTHESIS = "HYPOTHESIS"
    IMPACT = "IMPACT"
    MILESTONES_AND_TIMELINE = "MILESTONES_AND_TIMELINE"
    NOVELTY_AND_INNOVATION = "NOVELTY_AND_INNOVATION"
    RISKS_AND_MITIGATIONS = "RISKS_AND_MITIGATIONS"
    PRELIMINARY_DATA = "PRELIMINARY_DATA"
    RATIONALE = "RATIONALE"
    SCIENTIFIC_INFRASTRUCTURE = "SCIENTIFIC_INFRASTRUCTURE"
    TEAM_EXCELLENCE = "TEAM_EXCELLENCE"
