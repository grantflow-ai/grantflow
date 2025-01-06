from typing import Final

from src.db.enums import ContentTopicEnum, GrantSectionEnum

IMPLICIT_QUESTIONS_MAPPING: Final[dict[GrantSectionEnum, str]] = {}

CRITERIA_MAPPING: Final[dict[ContentTopicEnum, list[str]]] = {
    ContentTopicEnum.BACKGROUND_CONTEXT: [
        "Broader scientific context and importance",
        "Current state of knowledge in the specified field",
        "Historical development of key concepts",
        "Identified gaps in current understanding or technological capabilities",
        "Recent developments and breakthroughs establishing timeliness",
        "Relationship to existing published research",
    ],
    ContentTopicEnum.RATIONALE: [
        "Comparative advantages over alternative solutions",
        "Expected return on research investment",
        "Justification for the research direction's current priority",
        "Methodology for overcoming existing limitations",
        "Problems or limitations in current approaches being addressed",
        "Supporting evidence for the proposed approach",
    ],
    ContentTopicEnum.HYPOTHESIS: [
        "Alternative hypothesis considerations",
        "Central research hypothesis statement",
        "Evidence-based hypothesis development process",
        "Potential field advancement through hypothesis testing",
        "Specific testable predictions",
        "Supporting theoretical framework",
    ],
    ContentTopicEnum.NOVELTY_AND_INNOVATION: [
        "Challenges to existing paradigms",
        "Differentiation from current standard practices",
        "Innovative aspects of the proposed approach",
        "New methodological or technological developments",
        "Potential for creating new research directions",
        "Unique perspectives and insights in the approach",
    ],
    ContentTopicEnum.TEAM_EXCELLENCE: [
        "Collaborative and separate success track record",
        "Complementary background integration",
        "History of successful collaborations",
        "Project management experience",
        "Relevant preliminary work completion",
        "Team member expertise distribution",
    ],
    ContentTopicEnum.RESEARCH_FEASIBILITY: [
        "Alternative approach strategies",
        "Available resources and facilities",
        "Contingency planning",
        "Required technical expertise and capabilities",
        "Risk mitigation strategies",
        "Timeline for major objective completion",
    ],
    ContentTopicEnum.IMPACT: [
        "Advancement to scientific understanding",
        "Beneficiary identification and reach",
        "Broader societal benefit implications",
        "Economic impact potential",
        "Knowledge transfer mechanisms",
        "Practical application translation potential",
        "Specific problem resolution outcomes",
    ],
    ContentTopicEnum.PRELIMINARY_DATA: [
        "Demonstrated technical capabilities",
        "Feasibility demonstration through results",
        "Hypothesis support from preliminary data",
        "Preliminary findings influence on approach",
        "Supporting pilot studies",
        "Validation of key methods",
    ],
    ContentTopicEnum.MILESTONES_AND_TIMELINE: [
        "Critical path and major milestone identification",
        "Decision gates and completion criteria",
        "Integration points between workstreams",
        "Resource allocation timeline",
        "Risk assessment points",
        "Specific deliverables for each phase",
    ],
    ContentTopicEnum.SCIENTIFIC_INFRASTRUCTURE: [
        "Access to specialized scientific instruments",
        "Available laboratory facilities and equipment",
        "Computational resources and capabilities",
        "Data storage and management systems",
        "Infrastructure maintenance/support",
        "Quality control mechanisms",
        "Required core facilities and services",
    ],
}
