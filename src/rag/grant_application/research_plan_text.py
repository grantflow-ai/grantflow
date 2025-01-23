from asyncio import gather
from collections import defaultdict
from typing import Final, TypedDict

from src.db.json_objects import ResearchObjective, ResearchTask
from src.rag.retrieval import retrieve_documents
from src.rag.segmented_tool_generation import handle_segmented_text_generation
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

DETERMINE_RESEARCH_OBJECTIVE_RELATIONSHIPS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="determine_objective_relationships",
    template="""
Analyze research objectives and tasks to identify dependencies and relationships between them.

Research objectives and tasks:
<objectives>
${objectives}
</objectives>

Before constructing the output, analyze the data:
<planning>
1. Extract objective and task identifiers and titles
2. Map potential dependencies between objectives
3. Map dependencies between tasks within and across objectives
4. Validate relationships align with research progression
</planning>

Generate output in this format:
{
    "relations": [
        ["objective_id", "relationship_description"],
        ["task_id", "relationship_description"]
    ]
}

Guidelines:
- Use objective numbers (e.g., "2") for objective relations
- Use task numbers (e.g., "2.1") for task relations
- Relationship descriptions must:
  - Reference specific objective/task numbers
  - Describe dependency or progression
  - Be concrete and specific
""",
)

RESEARCH_TASK_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_task_generation",
    template="""
Generate a detailed research task description using:

Task data:
<research_task_data>
${research_task}
</research_task_data>

RAG context:
<rag_retrieval_results>
${rag_results}
</rag_retrieval_results>

<planning>
1. Methodology Analysis
   - Extract methodologies from task data and RAG results
   - Map specific techniques to research goals
   - Identify equipment and resource requirements

2. Data Collection & Analysis
   - Define data collection methods
   - Specify analysis frameworks
   - Note statistical approaches

3. Clinical Assessment (if >75% certainty of clinical work)
   - Sample size and groups
   - Biological variables
   - Safety protocols
   - Required registrations

4. Dependencies
   - Map task relationships from relations array
   - Note prerequisite work
   - Identify downstream dependencies

5. Gaps & Challenges
   - List missing critical information
   - Note technical challenges
   - Define mitigation approaches
</planning>

Guidelines:
- Write 300-400 words continuous text
- No headers/lists
- No task title inclusion
- Technical language for expert audience
- Include all concrete methodologies
""",
)


RESEARCH_OBJECTIVE_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_objective_generation",
    template="""
Generate research objective description using:

Context:
<rag_results>
${rag_results}
</rag_results>

Objective data:
<research_objective_data>
${research_objective}
</research_objective_data>

Task titles:
<research_task_titles>
${research_task_titles}
</research_task_titles>

<planning>
1. Hypothesis & Goals
   - Extract working hypothesis
   - Map objective goals to tasks
   - Validate SMART criteria alignment

2. Methodology Integration
   - Identify common methods across tasks
   - Note technique variations
   - Map equipment/resource needs

3. Expected Results
   - Define measurable outcomes
   - Link to hypothesis validation
   - Note potential impacts

4. Dependencies
   - Map relationships to other objectives
   - Note prerequisite work
   - Identify downstream impacts
</planning>

Guidelines:
- Write 300-400 words continuous text
- Technical language for expert audience
- Include concrete methodologies
""",
)

PRELIMINARY_RESULTS_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="preliminary_results_generation",
    template="""
Generate preliminary results section using:

Research objective:
<research_objective>
${research_objective_description}
</research_objective>

Preliminary data:
<preliminary_data>
${preliminary_data}
</preliminary_data>

RAG context:
<rag_results>
${rag_results}
</rag_results>

<planning>
1. Data Analysis
   - Extract key experimental findings
   - Map methods to results
   - Note statistical significance
   - Identify quantitative measures

2. Feasibility Assessment
   - Link findings to objectives
   - Map technical capabilities
   - Note resource validation
   - Identify methodology proof

3. Gaps & Progression
   - Note investigation gaps
   - Map to proposed work
   - Identify next steps
   - List technical challenges
</planning>

Guidelines:
- Write 200-800 words continuous text
- Follow objective section directly
- Include concrete data points
""",
)

RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="risks_and_alternatives_generation",
    template="""
Generate risks and alternatives section using:

Research objective:
<research_objective>
${research_objective_description}
</research_objective>

Risk data:
<risks_and_mitigations>
${risks_and_mitigations}
</risks_and_mitigations>

RAG context:
<rag_results>
${rag_results}
</rag_results>

<planning>
1. Risk Assessment
   - Map technical risks
   - Identify methodological challenges
   - Note resource dependencies
   - List external factors

2. Impact Analysis
   - Rate risk severity (H/M/L)
   - Map impact on timeline
   - Note resource implications
   - Identify cascade effects

3. Mitigation Strategies
   - Define primary mitigations
   - List alternative approaches
   - Map resource requirements
   - Note validation methods
</planning>

Guidelines:
- Write 150-300 words continuous text
- Focus on concrete risks and solutions
- Include specific mitigation steps
""",
)

RESEARCH_TASK_TEMPLATE: Final[PromptTemplate] = PromptTemplate(
    name="research_task_markdown",
    template="""
###### Task ${task_number}: ${title}

${content}
""",
)

RESEARCH_OBJECTIVE_TEMPLATE: Final[PromptTemplate] = PromptTemplate(
    name="research_objective_markdown",
    template="""
#### Objective ${objective_number}: ${title}

${research_objective_description_text}

##### Preliminary Results

${preliminary_data_text}

##### Research Tasks

${research_tasks_texts}

##### Risks and Alternatives

${risks_and_mitigations_text}
""",
)

RESEARCH_PLAN_SECTION_TEMPLATE: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_markdown",
    template="""
## Research Plan

### Research Objectives

${research_objectives_text}
""",
)


class SetRelationsToolResponse(TypedDict):
    """The response from the tool call."""

    relations: list[tuple[str, str]]
    """The relations between research objectives and tasks as a list of [identifier, description] pairs."""


response_schema = {
    "type": "object",
    "properties": {
        "relations": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 2,
                "maxItems": 2,
            },
        },
    },
    "required": ["relations"],
}


async def set_relation_data(research_objectives: list[ResearchObjective]) -> list[ResearchObjective]:
    """Enrich the research objectives and tasks with relationship information.

    Args:
        research_objectives: The research objectives to enrich.

    Returns:
        The enriched research objectives and tasks.
    """
    response = await handle_completions_request(
        prompt_identifier="identify_relations",
        messages=DETERMINE_RESEARCH_OBJECTIVE_RELATIONSHIPS_USER_PROMPT.to_string(
            objectives=[
                {
                    "title": research_objective["title"],
                    "description": research_objective.get("description"),
                    "objective_number": research_objective["number"],
                    "tasks": [
                        {
                            "title": research_task["title"],
                            "description": research_task.get("description"),
                            "task_number": f"{research_objective['number']}.{research_task['number']}",
                        }
                        for research_task in research_objective["research_tasks"]
                    ],
                }
                for research_objective in sorted(research_objectives, key=lambda x: x["number"])
            ]
        ),
        response_type=SetRelationsToolResponse,
        response_schema=response_schema,
    )
    logger.info("Generated relations for research objectives and tasks")

    relations = defaultdict[str, list[str]](list)
    for identifier, relations_list in response["relations"]:
        relations[identifier].append(relations_list)

    for research_objective in research_objectives:
        research_objective["relationships"] = relations.get(str(research_objective["number"]), [])
        for research_task in research_objective["research_tasks"]:
            research_task["relationships"] = relations.get(
                f"{research_objective['number']}.{research_task['number']}", []
            )

    return research_objectives


async def handle_research_task_text_generation(
    *,
    application_id: str,
    research_task: ResearchTask,
    task_number: str,
) -> str:
    """Generate the text for a research task.

    Args:
        application_id: The application ID.
        research_task: The research task to generate text for.
        task_number: The task number.

    Returns:
        The generated section text.
    """
    user_prompt = RESEARCH_TASK_GENERATION_USER_PROMPT.substitute(
        research_task=research_task,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )

    logger.info("Successfully generated research task.", task_number=task_number)

    return RESEARCH_TASK_TEMPLATE.to_string(task_number=task_number, title=research_task["title"], content=result)


async def handle_research_objective_description_generation(
    *,
    application_id: str,
    research_objective: ResearchObjective,
) -> str:
    """Generate the description for a research objective.

    Args:
        application_id: The application ID.
        research_objective: The research objective to generate text for.

    Returns:
        The generated section text.
    """
    research_task_titles = [research_task["title"] for research_task in research_objective["research_tasks"]]

    user_prompt = RESEARCH_OBJECTIVE_GENERATION_USER_PROMPT.substitute(
        research_objective={
            "title": research_objective["title"],
            "objective_number": research_objective["number"],
            "description": research_objective.get("description"),
            "relationships": research_objective.get("relationships"),
        },
        research_task_titles=research_task_titles,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="research-objective",
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )
    logger.info("Successfully generated research objective", number=research_objective["number"])

    return result


async def handle_preliminary_data_text_generation(
    *,
    application_details: dict[str, str],
    application_id: str,
    research_objective: ResearchObjective,
    research_objective_description: str,
) -> str:
    """Generate the text for preliminary results of a research aim.

    Args:
        application_details: The application details.
        application_id: The ID of the application.
        research_objective: The research objective.
        research_objective_description: The text of the research objective.

    Returns:
        The generated section text.
    """
    user_prompt = PRELIMINARY_RESULTS_GENERATION_USER_PROMPT.substitute(
        research_objective_description=research_objective_description,
        preliminary_data=application_details.get("preliminary_data", ""),
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="preliminary-results",
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )
    logger.info("Successfully generated preliminary results.", number=research_objective["number"])
    return result


async def handle_risks_and_mitigations_text_generation(
    *,
    application_details: dict[str, str],
    application_id: str,
    research_objective: ResearchObjective,
    research_objective_description: str,
) -> str:
    """Generate the text for risks and alternatives of a research aim.

    Args:
        application_details: The application details.
        application_id: The ID of the application.
        research_objective: The research objective.
        research_objective_description: The text of the research objective.

    Returns:
        The generated section text.

    """
    user_prompt = RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT.substitute(
        research_objective_description=research_objective_description,
        risks_and_mitigations=application_details.get("risks_and_mitigations", ""),
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="risks-and-alternatives",
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )
    logger.info("Successfully generated risks and alternatives.", number=research_objective["number"])

    return result


async def handle_research_objective_components_generation(
    *,
    application_details: dict[str, str],
    application_id: str,
    research_objective: ResearchObjective,
) -> str:
    """Generate the text for the research objective and its components.

    Args:
        application_details: The application details.
        application_id: The application ID.
        research_objective: The research objective to generate text for.

    Returns:
        The generated research objective text.
    """
    logger.debug("Generating research object", application_id=application_id, research_objective=research_objective)

    research_objective_description_text = await handle_research_objective_description_generation(
        application_id=application_id,
        research_objective=research_objective,
    )

    research_tasks_texts = await gather(
        *[
            handle_research_task_text_generation(
                application_id=application_id,
                research_task=research_task,
                task_number=f"{research_objective['number']}.{research_task['number']}",
            )
            for research_task in sorted(research_objective["research_tasks"], key=lambda x: x["number"])
        ]
    )

    preliminary_data_text, risks_and_mitigations_text = tuple(
        await gather(
            *[
                handle_preliminary_data_text_generation(
                    application_details=application_details,
                    application_id=application_id,
                    research_objective=research_objective,
                    research_objective_description=research_objective_description_text,
                ),
                handle_risks_and_mitigations_text_generation(
                    application_details=application_details,
                    application_id=application_id,
                    research_objective=research_objective,
                    research_objective_description=research_objective_description_text,
                ),
            ]
        )
    )

    return RESEARCH_OBJECTIVE_TEMPLATE.to_string(
        objective_number=research_objective["number"],
        title=research_objective["title"],
        research_objective_description_text=research_objective_description_text,
        preliminary_data_text=preliminary_data_text,
        research_tasks_texts="\n\n".join(research_tasks_texts),
        risks_and_mitigations_text=risks_and_mitigations_text,
    )


async def handle_research_plan_text_generation(
    *,
    application_details: dict[str, str],
    application_id: str,
    research_objectives: list[ResearchObjective],
) -> str:
    """Generate the text for the research objectives and tasks.

    Args:
        application_details: The application details.
        application_id: GrantApplication,
        research_objectives: The research objectives to generate text for.

    Returns:
        The generated research plan text.
    """
    logger.info("Entering research plan generation phase", application_id=application_id)
    research_objective_dtos = await set_relation_data(research_objectives)

    research_objective_descriptions: list[str] = [
        await handle_research_objective_components_generation(
            application_details=application_details,
            application_id=application_id,
            research_objective=research_objective,
        )
        for research_objective in sorted(research_objective_dtos, key=lambda x: x["number"])
    ]

    logger.info("Successfully generated research objectives and tasks", application_id=application_id)

    return RESEARCH_PLAN_SECTION_TEMPLATE.to_string(
        research_objectives_text="\n\n".join(research_objective_descriptions)
    )
