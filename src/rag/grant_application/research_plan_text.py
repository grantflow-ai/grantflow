from asyncio import gather
from collections import defaultdict
from typing import Final, TypedDict

from src.db.json_objects import ApplicationDetails, ResearchObjective, ResearchTask
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.template import Template

logger = get_logger(__name__)

DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_SYSTEM_PROMPT: Final[str] = """
You are an expert grant application writer integrated into a RAG system.
"""

DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_USER_PROMPT: Final[Template] = Template("""
Your task is to analyze research objectives and tasks for a grant application, identifying and describing relations between them.

Here are the research objectives and tasks you need to analyze:
    <objectives>
    ${objectives}
    </objectives>

Instructions:

1. Analyze the objectives and tasks to identify the following types of relations:
   - Between research objectives: Building upon, dependency, or continuity from a previous objective.
   - Between tasks within objectives: Building upon, dependency, or continuity from a previous task in the same or preceding objective.

2. For each identified relation:
   - Provide a detailed description.
   - Always include specific references to objective or task numbers.
   - Use phrases like "Building upon objective 1...", "Depending on the results of task 2.1...", etc.

3. Only include objectives and tasks that have identified relations in your response.

Before constructing the final JSON output, wrap your analysis in <relation_analysis> tags. In this analysis:
1. List all objectives and tasks with their numbers for easy reference.
2. Identify potential relations between objectives and tasks.
3. Describe each relation in detail, ensuring specific references are included.
This will ensure a thorough interpretation of the data.
""")

DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_OUTPUT_INSTRUCTIONS = """
Respond using the provided tool with a JSON response adhering to the following format:

```json
{
    "relations": [["2", "Building upon the first objective..."], ["2.2", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."]]
}
```

- The relations array is a matrix, where each sub-array has two elements.
- The first element is the objective or task number.
- The second element is a detailed description of the relation between the objective or task and its predecessor.
"""

RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS: Final[str] = """
5. If the task includes randomized groups/interventions, what is the sample size, group/intervention information, and method of sample analysis?
6. If the task involves vertebrate animals/humans, what are the pertinent biological variables (e.g. subject sex, age etc.)?
7. If the task involves hazardous elements, what are the detailed hazard descriptions and planned safety measures and precautions?
8. If the task uses Human Embryonic Stem Cells (hESCs) not in the NIH Registry, what is the justification for non-registered hESC usage?
9. If the task uses Human Fetal Tissue (HFT), what is the necessity of HFT, documentation of alternative evaluation methods, and evidence of alternatives consideration?x

Note that these sections should be added only if they apply to the given research task.
"""

RESEARCH_TASK_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write a research task description.
${last_generation_result}

Use the following sources to write the text:

1. Research Task Data as a JSON object:
    <research_task>
   {{research_task}}
    </research_task>

2. RAG Retrieval Results for additional context:
    <rag_results>
    {{rag_results}}
    </rag_results>

A research task is a specific task within a larger research objective.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?

If you determine that the research task involves clinical trials with a high degree of certainty (above 75%), address the following questions - conditionally:
5. If the task includes randomized groups/interventions, what is the sample size, group/intervention information, and method of sample analysis?
6. If the task involves vertebrate animals/humans, what are the pertinent biological variables (e.g. subject sex, age etc.)?
7. If the task involves hazardous elements, what are the detailed hazard descriptions and planned safety measures and precautions?
8. If the task uses Human Embryonic Stem Cells (hESCs) not in the NIH Registry, what is the justification for non-registered hESC usage?
9. If the task uses Human Fetal Tissue (HFT), what is the necessity of HFT, documentation of alternative evaluation methods, and evidence of alternatives consideration?

**Important Guidelines**:
- The research task JSON object includes an array of relations with other research tasks. If the array is not empty, make sure to include a detailed description of these relations in the text.
- Do not use the title of the research task in the text - the title will be provided to the user above the text.
- Describe the specific research steps planned in the task in detail.
- Include concrete facts where applicable, citing the relevant source documents when drawing from RAG results

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_TASK_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to write a description for a research task.
A research task is a specific task within a larger research objective. The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
The description should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
"""

RESEARCH_TASK_TEMPLATE: Final[Template] = Template("""
###### Task ${task_number}: ${title}

${content}
""")


RESEARCH_OBJECTIVE_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write a research objective description.
${last_generation_result}

Use the following sources to write the text:

1. Research Objective Data as a JSON object with fields:
    <research_objective>
    ${research_objective}
    </research_objective>

2. The titles of the research tasks that are included in this Objective:
    <research_tasks>
    ${research_task_titles}
    </research_tasks>

3. RAG Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

A research objective or research objective is an overarching goal that the research objectives to achieve.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

1. What is the working hypothesis?
2. What are the general goals of the objective?
3. What is the methodology employed?
4. What are the expected results?

__NOTE__: Methodology is an optional sub-section. It should be included only if a similar methodology is used in all research tasks

**Important Guidelines**:
- The research objective JSON object includes an array of relations with other research objectives. If the array is not empty, make sure to include a detailed description of these relations in the text.
- Do not use the title of the research objective in the text - the title will be provided to the user above the text.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_OBJECTIVE_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to write a description for a research objective.
A research objective or research objective is an overarching goal that the research seeks to achieve.
The description should address the following implicit questions:

1. What is the working hypothesis?
2. What are the general goals of the objective?
3. What is the methodology employed?
4. What are the expected results?
"""

PRELIMINARY_RESULTS_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to write the Preliminary Results section which forms a sub-section for the following research objective text:
    <research_objective_description>
    ${research_objective_description}
    </research_objective_description>

${last_generation_result}
Use the following sources to write the text:

1. User input on Preliminary Results:
    <preliminary_data>
    ${preliminary_data}
    </preliminary_data>

3. Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

Preliminary Results are detailed experimental findings and data analyses that demonstrate research feasibility.
This sub-section should address the following implicit questions:

1. What experiments/analyses have been conducted?
2. What methods and techniques were used?
3. How was the data analyzed and interpreted?
4. How do these findings support the proposed research?

**Important Guidelines**:
- Generate the text for the subsection preliminary results assuming it will come immediately after the research objective text provided above.
- Do not include the provided research objective text in the generated text.
- Do not use the title of the research objective in the text and do not add a title.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for a minimum of half a page, and a maximum of two pages in length (~200-800 words).
""")

PRELIMINARY_RESULTS_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to write a description for the Preliminary Results section.
Preliminary Results are detailed experimental findings and data analyses that demonstrate research feasibility for a specific research aim or objective.
The description should address the following implicit questions:

1. What experiments/analyses have been conducted?
2. What methods and techniques were used?
3. How was the data analyzed and interpreted?
4. How do these findings support the proposed research?
"""


RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to write the Risks and Alternatives which forms a for the following research objective text:
    <research_objective_description>
    ${research_objective_description}
    </research_objective_description>

${last_generation_result}
Use the following sources to write the text:

1. User input on Risks and Alternatives:
    <risks_and_mitigations>
    ${risks_and_mitigations}
    </risks_and_mitigations>

3. Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

Risks and Alternatives are potential challenges that may arise during the research process and possible solutions to mitigate them.
This section should address the following implicit questions:

1. What are the specific risks involved in this research, and how would you describe their severity (High/Medium/Low)?
2. What strategies can be implemented to mitigate each identified risk (if applicable/possible)?
3. What alternative approaches are available if these strategies fail (if any)?
4. How should these risks be prioritized based on both their severity and likelihood of occurrence?

**Important Guidelines**:
- Do not include the provided research objective text in the generated text.
- Do not use the title of the research objective in the text and do not add a title.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly two to three paragraphs with a maximum length of half a page (~150-300 words).
""")

RISKS_AND_ALTERNATIVES_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to write a description for the Risks and Alternatives section.
Risks and Alternatives are potential challenges that may arise during the research process and possible solutions to mitigate them.
The description should address the following implicit questions:

1. What are the specific risks involved in this research, and how would you describe their severity (High/Medium/Low)?
2. What strategies can be implemented to mitigate each identified risk?
3. What alternative approaches are available if these strategies fail?
4. How should these risks be prioritized based on both their severity and likelihood of occurrence?
"""


RESEARCH_PLAN_SECTION_TEMPLATE: Final[Template] = Template("""
## Research Plan

### Research Objectives

${research_objectives_text}
""")

RESEARCH_OBJECTIVE_TEMPLATE: Final[Template] = Template("""
#### Objective ${objective_number}: ${title}

${research_objective_description_text}

##### Preliminary Results

${preliminary_data_text}

##### Research Tasks

${research_tasks_texts}

##### Risks and Alternatives

${risks_and_mitigations_text}
""")


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
        system_prompt=DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_SYSTEM_PROMPT,
        user_prompt=DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_USER_PROMPT.substitute(
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
        output_instructions=DETERMINE_RESEARCH_OBECTIVE_RELATIONSHIPS_OUTPUT_INSTRUCTIONS,
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
    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=RESEARCH_TASK_TASK_DESCRIPTION,
        research_task=research_task,
    )

    result = await handle_segmented_text_generation(
        user_prompt_template=RESEARCH_TASK_GENERATION_USER_PROMPT.substitute_partial(
            research_task=research_task,
            rag_results=rag_results,
        )
    )

    logger.info("Successfully generated research task.", task_number=task_number)

    return RESEARCH_TASK_TEMPLATE.substitute(task_number=task_number, title=research_task["title"], content=result)


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

    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=RESEARCH_OBJECTIVE_TASK_DESCRIPTION,
        research_objective=research_objective,
    )

    result = await handle_segmented_text_generation(
        prompt_identifier="research-objective",
        user_prompt_template=RESEARCH_OBJECTIVE_GENERATION_USER_PROMPT.substitute_partial(
            research_objective={
                "title": research_objective["title"],
                "objective_number": research_objective["number"],
                "description": research_objective.get("description"),
                "relationships": research_objective.get("relationships"),
            },
            rag_results=rag_results,
            research_task_titles=research_task_titles,
        ),
    )
    logger.info("Successfully generated research objective", number=research_objective["number"])

    return result


async def handle_preliminary_data_text_generation(
    *,
    application_details: ApplicationDetails,
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
    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=PRELIMINARY_RESULTS_TASK_DESCRIPTION,
        preliminary_data=application_details.get("preliminary_data", ""),
        research_objective_description=research_objective_description,
    )

    result = await handle_segmented_text_generation(
        prompt_identifier="preliminary-results",
        user_prompt_template=PRELIMINARY_RESULTS_GENERATION_USER_PROMPT.substitute_partial(
            research_objective_description=research_objective_description,
            rag_results=rag_results,
            preliminary_data=application_details.get("preliminary_data", ""),
        ),
    )
    logger.info("Successfully generated preliminary results.", number=research_objective["number"])
    return result


async def handle_risks_and_mitigations_text_generation(
    *,
    application_details: ApplicationDetails,
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
    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=RISKS_AND_ALTERNATIVES_TASK_DESCRIPTION,
        risks_and_mitigations=application_details.get("risks_and_mitigations", ""),
        research_objective_description=research_objective_description,
    )

    result = await handle_segmented_text_generation(
        prompt_identifier="risks-and-alternatives",
        user_prompt_template=RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT.substitute_partial(
            research_objective_description=research_objective_description,
            rag_results=rag_results,
            risks_and_mitigations=application_details.get("risks_and_mitigations", ""),
        ),
    )
    logger.info("Successfully generated risks and alternatives.", number=research_objective["number"])

    return result


async def handle_research_objective_components_generation(
    *,
    application_details: ApplicationDetails,
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

    return RESEARCH_OBJECTIVE_TEMPLATE.substitute(
        objective_number=research_objective["number"],
        title=research_objective["title"],
        research_objective_description_text=research_objective_description_text,
        preliminary_data_text=preliminary_data_text,
        research_tasks_texts="\n\n".join(research_tasks_texts),
        risks_and_mitigations_text=risks_and_mitigations_text,
    )


async def handle_research_plan_text_generation(
    *,
    application_details: ApplicationDetails,
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

    return RESEARCH_PLAN_SECTION_TEMPLATE.substitute(
        research_objectives_text="\n\n".join(research_objective_descriptions)
    )
