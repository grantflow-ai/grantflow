import logging
from json import dumps
from typing import Final

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag.dto import DocumentDTO, ResearchAimDTO, SectionGenerationResult
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
            "description": "The output text that was generated for the research aim",
        },
        "is_complete": {
            "type": "boolean",
            "description": "Whether the research aim text is complete or not",
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
You are a part of a RAG pipeline, tasked with composing a part of STEM research grant application. You are an expert
in grant writing.

You will be given a user prompt that outlines a specific research aim. A research aim that is planned to test a hypothesis and
the specific research tasks that constitute it. This input will be provided as a JSON object with the following structure:

```jsonc
{
    "title": "The title of the research aim",
    "description": "The description of the research aim",
    "requires_clinical_trials": false, // Whether the research aim requires clinical trials,
    "tasks": [
        {
            "title": "The title of the research task",
            "description": "The description of the research task"
        }
        // ... can contain more tasks
    ]
}
```

Additionally, you will receive any results from the RAG retrieval as a JSON array of documents with the following format:

```jsonc
[
    {
        "filename": "somefile.pdf",
        "text": "The text content of the document",
        "page_number": 5 // The page number of the document, this key will be omitted if the page number is not available.
    }
]
```

{part_generation_instructions}
When generating output strictly follow these guidelines:

- Use markdown.
- Do not use unnecessary superlatives.
- Be precise and concise.
- Be consistent in tone and style.
- Follow the scientific terminology provided in the inputs.
- Cite facts and findings as required.
- Include precise references to sources when citing and quoting.
- Use page numbers in references when page numbers are provided as inputs for a source.

Respond using the provided tools with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```json
{
    "text": "The generated text",
    "is_complete": true
}
```
"""

USER_PROMPT: Final[str] = """
Here is the research aim data as JSON:

```json
{research_aim}
```

These are the results of the RAG retrieval provided as a JSON array:

```json
{rag_results}
```
{previous_part_text}

Instructions:
- The research aim description should include a section called "Risks and Alternative Approaches" which identifies any
    potential risks and outlines alternative strategies to achieve the research aim in case of unexpected challenges.
- For each research task, provide the following details:
    * What is the goal of the task?
    * What is the experimental design that will be used in the task?
    * What methods will be used to collect data?
    * How will the data be analyzed?
    * How will the results be interpreted?
    * If the task is dependent on outputs of previous tasks, explain this relation.
    * If the task includes randomized groups or interventions, describe the sample size and method of sample analysis.
    * If the task includes the study of vertebrate animals or humans, describe how it will factor all relevant
        biological variables — especially the sex of the subjects/tested animals — into the study design.
    * If the task includes any procedures, situations, or materials that may be hazardous to personnel, describe them
        and the measures and precautions that are planned.
    * If the task includes the use of Human Embryonic Stem Cells (hESCs) not included in the NIH hESC Registry,
        describe why the use of such hESCs is necessary.
    * If the task includes the use of Human Fetal Tissue (HFT), explain why the research goals cannot be accomplished
        using an alternative to HFT and what methods were used (e.g., literature review, preliminary data) to determine
        that alternatives could not be used.
"""

CONSECUTIVE_PART_GENERATION_INSTRUCTIONS: Final[str] = """
Since the text being generated is long, the generation is done in segments. You will also receive the previous text that
was generated. You should continue the generation from the point it left off. Make sure to be consistent in tone, style
and scientific vocabulary.
"""


@exponential_backoff_retry(OpenAIError, OperationError)
async def generate_research_aim_text(
    *,
    previous_part_text: str | None,
    research_aim: ResearchAimDTO,
    retrieval_results: list[DocumentDTO],
) -> SectionGenerationResult:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim: The research aim to generate text for.
        retrieval_results: The results of the RAG retrieval.

    Raises:
        OperationError: If the response does not contain the expected tool call.

    Returns:
        SectionGenerationResult: The generated text for the research aim.
    """
    client = get_azure_openai()

    system_prompt = SYSTEM_PROMPT.format(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = USER_PROMPT.format(
        research_aim=dumps(research_aim),
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
    ).strip()

    response = await client.chat.completions.create(
        model=GENERATION_MODEL,
        response_format=ResponseFormatJSONObject(type="json_object"),
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=system_prompt),
            ChatCompletionUserMessageParam(role="user", content=user_prompt),
        ],
        temperature=0.5,
        tools=tools,
    )
    if response.choices[0].message.tool_calls and (
        content := response.choices[0].message.tool_calls[0].function.arguments
    ):
        return deserialize(content, SectionGenerationResult)

    raise OperationError(message="Response content is empty", context=response.model_dump_json())
