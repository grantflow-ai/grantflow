import logging
from functools import partial
from string import Template
from typing import Final

from src.rag.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag.dto import (
    DocumentDTO,
    GenerationResultDTO,
    ResearchTaskDTO,
)
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.serialization import serialize
from src.utils.ws import NotificationSender

logger = logging.getLogger(__name__)


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
${previous_part_text}

Use the following sources to write the text:

1. Research Task Data as a JSON object:
    <research_task>
    ${research_task}
    </research_task>

2. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

A research task is a specific task within a larger research aim.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
${clinical_trial_questions}

**Important Guidelines**:
- The research task JSON object includes an array of relations with other research tasks. If the array is not empty, make sure to include
a detailed description of these relations in the text.
- Do not use the title of the research task in the text - the title will be provided to the user above the text.
- Begin the description with a sentence such as 'The experimental design of task <task_number>...', 'Task <task_number> will build on the results of <other_task_number> by...' etc.
- Make sure to describe the specific research steps planned in the task in detail.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_TASK_QUERIES_PROMPT: Final[Template] = Template("""
A research task is a specific task within a larger research aim. The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
The description should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
${clinical_trial_questions}

Here is the research task data as a JSON object:
    <research_task>
    ${research_task}
    </research_task>
""")


async def generate_research_task_text(
    previous_part_text: str | None,
    *,
    requires_clinical_trials: bool,
    research_task: ResearchTaskDTO,
    retrieval_results: list[DocumentDTO],
) -> GenerationResultDTO:
    """Generate a part of the research task text.

    Args:
        previous_part_text: The previous part of the research task text, if any.
        requires_clinical_trials: Whether the research task includes clinical trials.
        research_task: The research task to generate text for.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResultDTO: The generated text for the research aim.
    """
    user_prompt = RESEARCH_TASK_GENERATION_USER_PROMPT.substitute(
        research_task=serialize(research_task),
        rag_results=serialize(retrieval_results),
        clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS if requires_clinical_trials else "",
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
    ).strip()

    return await handle_completions_request(
        prompt_identifier="research_tasks",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
    )


async def handle_research_task_text_generation(
    *,
    application_id: str,
    notification_sender: NotificationSender,
    requires_clinical_trials: bool,
    research_aim_number: int,
    research_task: ResearchTaskDTO,
) -> str:
    """Generate the text for a research task.

    Args:
        application_id: The application ID.
        notification_sender: The notification sender.
        requires_clinical_trials: Whether the research task includes clinical trials.
        research_aim_number: The number of the research aim the task belongs to.
        research_task: The research task to generate text for.

    Returns:
        The generated text for the research task.
    """
    search_queries = await create_search_queries(
        RESEARCH_TASK_QUERIES_PROMPT.substitute(
            research_task=serialize(research_task),
            clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS
            if requires_clinical_trials
            else "",
        ),
    )
    search_result = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries,
    )

    handler = partial(
        generate_research_task_text,
        requires_clinical_trials=requires_clinical_trials,
        research_task=research_task,
        retrieval_results=search_result,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_task",
        entity_identifier=f"research_task: {research_task.task_number}",
        prompt_handler=handler,
    )

    await notification_sender.info(
        f"Generated research task {research_aim_number}.{research_task.task_number}: {research_task.title} text."
    )
    return result
