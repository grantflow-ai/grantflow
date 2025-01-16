from typing import Final

from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.db.json_objects import ApplicationDetails, GrantSection
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


CRITERIA_MAPPING: Final[dict[ContentTopicEnum, list[str]]] = {
    ContentTopicEnum.BACKGROUND_CONTEXT: [
        "Current knowledge state and gaps",
        "Recent breakthrough developments",
        "Field-specific challenges",
        "Historical progress trajectory",
        "Competing methodologies",
        "Key research barriers",
    ],
    ContentTopicEnum.RATIONALE: [
        "Technical advantages",
        "Methodological improvements",
        "Resource optimization",
        "Validation approach",
        "Success metrics",
        "Risk/benefit analysis",
    ],
    ContentTopicEnum.HYPOTHESIS: [
        "Central hypothesis statement",
        "Supporting evidence chain",
        "Testable predictions",
        "Alternative hypotheses",
        "Validation criteria",
        "Expected outcomes",
    ],
    ContentTopicEnum.NOVELTY_AND_INNOVATION: [
        "Technical innovations",
        "Methodological advances",
        "Paradigm challenges",
        "Technology integration",
        "Process improvements",
        "Capability enhancements",
    ],
    ContentTopicEnum.TEAM_EXCELLENCE: [
        "Technical expertise distribution",
        "Prior breakthrough achievements",
        "Infrastructure access",
        "Collaboration synergies",
        "Resource management",
        "Track record evidence",
    ],
    ContentTopicEnum.RESEARCH_FEASIBILITY: [
        "Technical capabilities",
        "Resource availability",
        "Timeline feasibility",
        "Risk mitigation",
        "Method validation",
        "Success probability",
    ],
    ContentTopicEnum.IMPACT: [
        "Field advancement metrics",
        "Technical applications",
        "Knowledge expansion",
        "Capability enhancement",
        "Broader implications",
        "Success indicators",
    ],
    ContentTopicEnum.PRELIMINARY_DATA: [
        "Method validation results",
        "Technical demonstrations",
        "Capability proofs",
        "Initial findings",
        "Performance metrics",
        "Success indicators",
    ],
    ContentTopicEnum.MILESTONES_AND_TIMELINE: [
        "Critical path markers",
        "Decision checkpoints",
        "Deliverable timelines",
        "Resource scheduling",
        "Progress metrics",
        "Completion criteria",
    ],
    ContentTopicEnum.SCIENTIFIC_INFRASTRUCTURE: [
        "Technical equipment access",
        "Computational resources",
        "Specialized facilities",
        "Data management systems",
        "Quality control processes",
        "Support infrastructure",
    ],
    ContentTopicEnum.RISKS_AND_MITIGATIONS: [
        "Technical challenges",
        "Mitigation strategies",
        "Alternative approaches",
        "Risk assessment",
        "Contingency plans",
        "Success probability",
    ],
}

HUMANIZED_SECTION_NAME_MAPPING: Final[dict[GrantSectionEnum, str]] = {
    GrantSectionEnum.EXECUTIVE_SUMMARY: "Executive Summary",
    GrantSectionEnum.RESEARCH_SIGNIFICANCE: "Research Significance",
    GrantSectionEnum.RESEARCH_INNOVATION: "Research Innovation",
    GrantSectionEnum.RESEARCH_OBJECTIVES: "Research Objectives",
    GrantSectionEnum.RESOURCES: "Resources",
    GrantSectionEnum.EXPECTED_OUTCOMES: "Expected Outcomes",
}

SECTION_DESCRIPTION_MAPPING: Final[dict[GrantSectionEnum, str]] = {
    GrantSectionEnum.EXECUTIVE_SUMMARY: """
    A concise overview of the entire research proposal.

    Address:
    - What is the central research problem?
    - Why is this research important now?
    - What is your approach to solving it?
    - What are the expected outcomes?
    - What is the potential impact?
    """,
    GrantSectionEnum.RESEARCH_SIGNIFICANCE: """
    Articulation of the research's importance and potential contributions.

    Address:
    - What gap in knowledge or capability does this research fill?
    - How does this advance the current state of the field?
    - Why is addressing this problem critical now?
    - What are the broader implications for the field?
    - How does this align with funding priorities?
    """,
    GrantSectionEnum.RESEARCH_INNOVATION: """
    Description of novel aspects and innovative approaches in the research.

    Address:
    - What makes this approach innovative?
    - How does it differ from current methods?
    - What new concepts or techniques are being introduced?
    - How will this advance current capabilities?
    - What technical barriers will be overcome?
    """,
    GrantSectionEnum.RESEARCH_OBJECTIVES: """
    Clear statement of research goals and specific objectives.

    Address:
    - What are the specific aims of the research?
    - How are the objectives measurable and achievable?
    - What hypotheses will be tested?
    - How do the objectives build on each other?
    - What is the timeline for achieving these objectives?
    """,
    GrantSectionEnum.RESOURCES: """
    Overview of available infrastructure, equipment, and expertise.

    Address:
    - What facilities and equipment are available?
    - What specialized expertise exists in the team?
    - How will resources be allocated?
    - What technical capabilities are in place?
    - How do these resources enable the research?
    """,
    GrantSectionEnum.EXPECTED_OUTCOMES: """
    Description of anticipated results and their implications.

    Address:
    - What specific deliverables will be produced?
    - How will success be measured?
    - What are the expected impacts on the field?
    - How will results be disseminated?
    - What are the potential applications?
    """,
}

SECTION_LENGTH_DEFAULTS: Final[dict[GrantSectionEnum, tuple[int, int]]] = {
    GrantSectionEnum.EXECUTIVE_SUMMARY: (250, 500),
    GrantSectionEnum.RESEARCH_SIGNIFICANCE: (500, 1000),
    GrantSectionEnum.RESEARCH_INNOVATION: (500, 1000),
    GrantSectionEnum.RESEARCH_OBJECTIVES: (750, 1500),
    GrantSectionEnum.RESEARCH_PLAN: (2000, 4000),
    GrantSectionEnum.RESOURCES: (500, 1000),
    GrantSectionEnum.EXPECTED_OUTCOMES: (500, 1000),
}

GENERATE_SECTION_TEXT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_text_generation",
    template="""
    Generate the ${humanized_section_name} section text using:

    Source data:
    <application_details>
    ${application_details}
    </application_details>

    RAG context:
    <rag_results>
    ${rag_results}
    </rag_results>

    Research plan:
    <research_plan>
    ${research_plan_text}
    </research_plan>

    Prior sections:
    <previous_sections>
    ${previous_sections}
    </previous_sections>

    Section requirements:
    <section_requirements>
    ${section_description}

    Topics and weights:
    ${topics}

    Topic weight interpretations:
    - Primary (0.7-1.0): Core section focus, essential content
    - Supporting (0.4-0.6): Required elements but not dominant
    - Minor (0.1-0.3): Contextual or supplementary content

    Word limits:
    - Min words: ${min_words}
    - Max words: ${max_words}
    </section_requirements>

    <planning>
    1. Topic Analysis
    - Map each topic's weight to content requirements
    - Extract key technical details from RAG results
    - Identify critical methodologies and approaches
    - Link topic criteria to available content

    2. Technical Integration
    - Map methodologies to research objectives
    - Link preliminary data points
    - Extract equipment specifications
    - Note technical dependencies

    3. Content Structure
    - Ensure logical flow with research plan
    - Maintain narrative consistency
    - Balance topic coverage by weights
    - Link to previous section content

    4. Validation
    - Verify coverage of all topics
    - Check technical precision
    - Mark missing data points
    - Monitor word count compliance
    </planning>

    Guidelines:
    - Generate continuous technical text
    - No headers or lists
    - Match existing style and tone
    - Mark gaps: **MISSING INFORMATION: <description>**
""",
)


async def handle_section_text_generation(
    *,
    application_details: ApplicationDetails,
    application_id: str,
    grant_section: GrantSection,
    previous_sections: str,
    research_plan_text: str,
) -> str:
    """Generate the text for a given grant section.

    Args:
        application_details: The application details.
        application_id: The ID of the application.
        grant_section: The grant section for which to generate text.
        previous_sections: The text of the previous sections
        research_plan_text: The research plan text.

    Returns:
        The generated section text.
    """
    logger.debug("Generating section text.", grant_section=grant_section)

    topics = [{**topic, "criteria": CRITERIA_MAPPING[topic["type"]]} for topic in grant_section["topics"]]

    max_words = grant_section.get("max_words", SECTION_LENGTH_DEFAULTS[grant_section["type"]][1])
    min_words = min(grant_section.get("min_words", SECTION_LENGTH_DEFAULTS[grant_section["type"]][0]), max_words)

    user_prompt = GENERATE_SECTION_TEXT_USER_PROMPT.substitute(
        application_details=application_details,
        humanized_section_name=HUMANIZED_SECTION_NAME_MAPPING[grant_section["type"]],
        research_plan_text=research_plan_text,
        previous_sections=previous_sections,
        section_description=SECTION_DESCRIPTION_MAPPING[grant_section["type"]],
        topics=topics,
        min_words=min_words,
        max_words=max_words,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="generate_section_text",
        messages=user_prompt.to_string(rag_results=rag_results),
    )
    logger.debug("Successfully generated section text.", grant_section=grant_section, text=result)
    return result
