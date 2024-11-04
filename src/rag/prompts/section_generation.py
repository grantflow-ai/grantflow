import logging
from json import dumps
from textwrap import dedent
from typing import Final, Literal

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag.dto import DocumentDTO, SectionGenerationResult
from src.utils.exceptions import OperationError
from src.utils.llm import get_azure_openai
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)

SectionName = Literal["executive-summary", "significance", "innovation", "research-plan"]

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

USER_PROMPT: Final[str] = """
## Task

Your task is to write {part_number_description} of the {section_name} section of the grant application.

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
) -> SectionGenerationResult:
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
        section_name=section_name,
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
        return deserialize(content, SectionGenerationResult)

    raise OperationError(message="Response content is empty", context=response.model_dump_json())
