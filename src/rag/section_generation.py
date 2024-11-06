import logging
from json import dumps
from textwrap import dedent
from typing import Final

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag.constants import SectionName
from src.rag.dto import DocumentDTO, GenerationResult
from src.utils.exceptions import OperationError
from src.utils.llm import get_azure_openai
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)


json_schema = {
    "type": "object",
    "properties": {
        "text": {
            "type": "string",
            "description": "The output text that was generated for the section",
        },
        "is_complete": {
            "type": "boolean",
            "description": "Whether the section text is complete or not",
        },
    },
    "required": ["text", "is_complete"],
    "additionalProperties": False,
}

tools = [
    ChatCompletionToolParam(
        type="function",
        function=FunctionDefinition(
            name="response_handler",
            parameters=json_schema,
        ),
    )
]

GENERATION_MODEL: Final[str] = "gpt-4o"

SYSTEM_PROMPT: Final[str] = """
You are an expert grant application writer specializing in STEM research.

## Guidelines:

- Respond using markdown.
- Do not use unnecessary superlatives.
- Be precise and concise.
- Be consistent in tone and style.
- Follow the scientific terminology provided in the inputs.
- Cite facts and findings as required.
- Include precise references to sources when citing and quoting.
- Use page numbers in references when page numbers are provided as inputs for a source.
"""

SIGNIFICANCE_PROMPT = """
explain the importance of the problem or critical barrier that the project addresses, and how it impacts human lives.
"""

INNOVATION_PROMPT = """
describe the novel aspects of the research project and how it challenges or shifts current research, practices or paradigms.
"""

RESEARCH_AIM_PROMPT = """
Define the specific objectives of the research project, outlining the aims that are planned to test the hypothesis and
the tasks that constitute each aim.

Add a section called "Preliminary Results" if any preliminary data is provided. If such data is provided, describe
any preliminary studies that have already been done to substantiate and support the feasibility of the aims.

For each research aim:
- Add a section called "Risks and Alternative Approaches" which identifies any potential risks and outline
    alternative strategies to achieve it case of unexpected challenges.
- Add a section
For each research task, provide the following details:
- What is the goal of this task?
- What is the experimental design that will be used in this task?
- What methods will you use to collect data?
- How will the data be analyzed?
- How will the results will be interpreted?
- If the task is dependent on outputs of previous tasks, explain the dependency.
- If the task includes randomized groups or interventions, describe the sample size, method of analysis, and how these the plans for the task.
- If the task includes the study of vertebrate animals or humans, describe how it will factor all relevant biological variables — especially the sex of the subjects/tested animals — into your study design.
- If the task includes any procedures, situations, or materials that may be hazardous to personnel, describe them and the measures and precautions that are planned.
- If the task includes the use of Human Embryonic Stem Cells (hESCs) not included in the NIH hESC Registry, describe why the use of such hESCs is necessary.
- If the task includes the use of Human Fetal Tissue (HFT), explain why the research goals cannot be accomplished using an alternative to HFT and what methods were used (e.g., literature review, preliminary data) to determine that alternatives could not be used.
"""

USER_PROMPT: Final[str] = """
## Task

Your task is to write a part of the {section_name} section of the grant application.

{section_guidelines}

Use the provided tools to respond to the user with a valid JSON object.
The JSON object should contain the generated text and a boolean value indicating whether the section text is complete or not.

## Inputs
This is the input provided by the user:

{user_input}

{rag_inputs}
"""

FIRST_PART_DESCRIPTION: Final[str] = "the first part"
LATER_PART_DESCRIPTION: Final[str] = "a part"

PART_GENERATION_INSTRUCTIONS: Final[str] = """
Here is the last part that was generated.

```markdown
{last_generation_result}
```

Continue the generation from the point it left off.

Be consistent in tone, style and scientific vocabulary.
"""


@exponential_backoff_retry(OpenAIError, OperationError)
async def generate_section_part(
    *,
    section_name: SectionName,
    last_generation_result: str | None,
    user_input: str,
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a section of the grant application.

    Args:
        section_name: The name of the section to generate.
        last_generation_result: The last part that was generated.
        user_input: The user input.
        retrieval_results: The results of the RAG retrieval.

    Raises:
        OperationError: If the response content is empty.

    Returns:
        The generated section.
    """
    client = get_azure_openai()

    rag_inputs = (
        dedent(f"""
    These are the results of the RAG retrieval provided as a JSON array:

    ```json
    {dumps(retrieval_results)}
    ```
    """).strip()
        if retrieval_results
        else ""
    )

    user_prompt = USER_PROMPT.format(
        user_input=user_input,
        rag_inputs=rag_inputs,
        part_number_description=FIRST_PART_DESCRIPTION if last_generation_result else LATER_PART_DESCRIPTION,
        section_name=section_name.value,
        part_generation_instructions=PART_GENERATION_INSTRUCTIONS.format(
            last_generation_result=last_generation_result
        ).strip()
        if last_generation_result
        else "",
    ).strip()

    response = await client.chat.completions.create(
        model=GENERATION_MODEL,
        response_format=ResponseFormatJSONObject(type="json_object"),
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=SYSTEM_PROMPT),
            ChatCompletionUserMessageParam(role="user", content=user_prompt),
        ],
        temperature=0.5,
        tools=tools,
    )
    if response.choices[0].message.tool_calls and (
        content := response.choices[0].message.tool_calls[0].function.arguments
    ):
        return deserialize(content, GenerationResult)

    raise OperationError(message="Response content is empty", context=response.model_dump_json())
