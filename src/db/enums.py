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
    """Enumeration of grant document sections covering 99.9% of STEM grant formats.

    Design principles:
    1. Minimal overlap between sections
    2. Sufficient granularity for control
    3. Covers all major funding agencies
    4. Allows for section combining in templates
    """

    # Project Overview (Required by virtually all grants)
    FRONT_MATTER = "FRONT_MATTER"  # Project title & identifiers
    ABSTRACT = "ABSTRACT"  # Technical abstract
    LAY_SUMMARY = "LAY_SUMMARY"  # Non-technical summary
    PROJECT_NARRATIVE = "PROJECT_NARRATIVE"  # Broader context description

    # Core Research Description
    SPECIFIC_AIMS = "SPECIFIC_AIMS"  # Core objectives and hypotheses
    SIGNIFICANCE = "SIGNIFICANCE"  # Problem importance and impact
    INNOVATION = "INNOVATION"  # Novel aspects and advances

    # Research Plan
    APPROACH = "APPROACH"  # High-level research strategy
    METHODS = "METHODS"  # Detailed methodology
    TIMELINE = "TIMELINE"  # Project schedule and milestones
    PRIOR_RESULTS = "PRIOR_RESULTS"  # Preliminary/pilot data

    # Risk and Feasibility
    FEASIBILITY = "FEASIBILITY"  # Evidence of likely success
    LIMITATIONS = "LIMITATIONS"  # Potential problems & alternatives

    # Resources
    FACILITIES = "FACILITIES"  # Available facilities
    EQUIPMENT = "EQUIPMENT"  # Major equipment and tools
    ENVIRONMENT = "ENVIRONMENT"  # Research environment & support

    # Data and Materials
    DATA_MANAGEMENT = "DATA_MANAGEMENT"  # Data handling and sharing
    RESOURCE_SHARING = "RESOURCE_SHARING"  # Sharing model organisms/tools

    # Team
    PERSONNEL = "PERSONNEL"  # Team structure and roles
    BIOGRAPHICAL = "BIOGRAPHICAL"  # CV/Biosketch information
    EXPERTISE = "EXPERTISE"  # Team capabilities

    # Administrative
    BUDGET = "BUDGET"  # Budget details
    BUDGET_JUSTIFICATION = "BUDGET_JUSTIFICATION"  # Budget explanation
    CURRENT_PENDING = "CURRENT_PENDING"  # Other support documentation

    # Impact
    OUTCOMES = "OUTCOMES"  # Expected results
    BROADER_IMPACTS = "BROADER_IMPACTS"  # Societal benefits
    DISSEMINATION = "DISSEMINATION"  # Publication/sharing plans

    # Compliance
    HUMAN_SUBJECTS = "HUMAN_SUBJECTS"  # Human subjects research details
    VERTEBRATE_ANIMALS = "VERTEBRATE_ANIMALS"  # Animal research details
    SAFETY = "SAFETY"  # Safety protocols & hazards
    ETHICS = "ETHICS"  # Ethical considerations

    # References
    REFERENCES = "REFERENCES"  # Bibliography/citations
    LETTERS_OF_SUPPORT = "LETTERS_OF_SUPPORT"  # Support documentation

    # Project Management
    EVALUATION_PLAN = "EVALUATION_PLAN"  # Success metrics & evaluation
    SUSTAINABILITY = "SUSTAINABILITY"  # Long-term viability plans

    # Training (for fellowships/training grants)
    TRAINING_PLAN = "TRAINING_PLAN"  # Educational/training activities
    MENTORING_PLAN = "MENTORING_PLAN"  # Mentorship approach


class ContentTopicEnum(StrEnum):
    """Enumeration of fundamental content topics that compose document sections.

    Design principles:
    1. Universal applicability across funding schemes
    2. Clear separation of concepts
    3. Comprehensive coverage of evaluation criteria
    4. Minimal overlap between topics
    """

    # Context
    STATE_OF_ART = "STATE_OF_ART"  # Current knowledge/practice
    PROBLEM = "PROBLEM"  # Challenge being addressed
    MOTIVATION = "MOTIVATION"  # Why this research matters

    # Innovation
    NOVELTY = "NOVELTY"  # New elements/approaches
    ADVANCEMENT = "ADVANCEMENT"  # Improvements over current state
    DISRUPTION = "DISRUPTION"  # Paradigm-shifting aspects

    # Technical Merit
    METHODOLOGY = "METHODOLOGY"  # Methods and approaches
    DESIGN = "DESIGN"  # Research/experimental design
    VALIDATION = "VALIDATION"  # Verification approaches
    ANALYSIS = "ANALYSIS"  # Data analysis methods

    # Feasibility
    EXPERTISE = "EXPERTISE"  # Team capabilities
    RESOURCES = "RESOURCES"  # Available support/infrastructure
    TRACK_RECORD = "TRACK_RECORD"  # Previous achievements
    PRELIMINARY = "PRELIMINARY"  # Initial results/evidence

    # Implementation
    WORKPLAN = "WORKPLAN"  # Execution strategy
    TIMELINE = "TIMELINE"  # Time management
    MILESTONES = "MILESTONES"  # Key deliverables
    COORDINATION = "COORDINATION"  # Team/collaboration management

    # Risk Management
    CHALLENGES = "CHALLENGES"  # Potential obstacles
    MITIGATION = "MITIGATION"  # Risk handling strategies
    ALTERNATIVES = "ALTERNATIVES"  # Backup approaches

    # Impact
    OUTCOMES = "OUTCOMES"  # Expected results
    DELIVERABLES = "DELIVERABLES"  # Concrete outputs
    BENEFITS = "BENEFITS"  # Value proposition
    DISSEMINATION = "DISSEMINATION"  # Knowledge sharing

    # Sustainability
    LONGEVITY = "LONGEVITY"  # Long-term viability
    SCALABILITY = "SCALABILITY"  # Growth potential
    ADOPTION = "ADOPTION"  # Uptake strategy

    # Compliance
    ETHICS = "ETHICS"  # Ethical considerations
    SAFETY = "SAFETY"  # Safety measures
    STANDARDS = "STANDARDS"  # Regulatory compliance

    # Resources
    FINANCIAL = "FINANCIAL"  # Budget/cost aspects
    EQUIPMENT = "EQUIPMENT"  # Required tools/infrastructure
    DATA = "DATA"  # Data management aspects

    # Quality
    MONITORING = "MONITORING"  # Progress tracking
    EVALUATION = "EVALUATION"  # Success assessment
    REPORTING = "REPORTING"  # Documentation/communication
