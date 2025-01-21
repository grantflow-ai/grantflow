from string import Template
from typing import TypedDict

from src.rag.utils import make_completions_request
from src.utils.logger import get_logger

logger = get_logger(__name__)

EVALUATION_SYSTEM_PROMPT = """
You are an expert evaluator of language model outputs. Provide detailed, objective assessments based solely on the given criteria.
"""

EVALUATION_PROMPT = Template("""Evaluate this language model output based on the following input prompt and model output pair:

<original_prompt>
${original_prompt}
</original_prompt>

<model_output>
${model_output}
</model_output>

Evaluation Criteria:

1. Relevance (0-100)
    - Direct correspondence to the prompt
    - Appropriate scope and focus
    - Meaningful connection to the requested task

2. Accuracy (0-100)
    - Factual correctness of statements
    - Proper use of any technical terms
    - Consistency with information given in the prompt

3. Completeness (0-100)
    - Coverage of all prompt requirements
    - Sufficient depth of response
    - No missing critical elements

4. Instruction Adherence (0-100)
    - Following explicit directions
    - Respecting stated constraints
    - Maintaining requested format/structure

5. Coherence and Clarity (0-100)
    - Logical flow and organization
    - Clear expression of ideas
    - Appropriate transitions and connections

6. Hallucination Assessment (0-100)
    - Sticking to available information
    - No unsupported claims
    - Appropriate qualification of uncertainties

Analysis Process:
    1. First read both prompt and output carefully
    2. Begin analysis in <scratchpad>
    3. Evaluate each criterion separately
    4. Cite specific examples for each score
    5. Synthesize overall assessment
    6. Score each criterion from 0-100, where 0 is worst and 100 is best

Based on your analysis, respond using the provided tool with a JSON object.

Example:

```jsonc
{
    "relevance": {
        "score": 91,
        "reasoning": "The output directly addresses all key aspects of the prompt, staying focused on the requested task with clear connections to requirements"
    },
    "accuracy": {
        "score": 83,
        "reasoning": "Technical terms are used correctly and statements align with given information, with minor imprecisions in domain-specific details"
    },
    "completeness": {
        "score": 100,
        "reasoning": "All prompt requirements are thoroughly addressed with appropriate depth and no missing elements"
    },
    "instruction_adherence": {
        "score": 70,
        "reasoning": "Follows all explicit directions and maintains requested format throughout, with careful attention to constraints"
    },
    "coherence_clarity": {
        "score": 80,
        "reasoning": "Well-organized response with clear logical flow and effective transitions between ideas"
    },
    "hallucination": {
        "score": 100,
        "reasoning": "Stays strictly within provided information, appropriately qualifies uncertainties, and makes no unsupported claims"
    }
}
```
""")


class EvaluationScore(TypedDict):
    """Structured score and reasoning for a single evaluation criterion."""

    score: int  # 0-100
    reasoning: str


class EvaluationToolResponse(TypedDict):
    """Comprehensive evaluation response."""

    relevance: EvaluationScore
    accuracy: EvaluationScore
    completeness: EvaluationScore
    instruction_adherence: EvaluationScore
    coherence_clarity: EvaluationScore
    hallucination: EvaluationScore


score_object_schema = {
    "type": "object",
    "properties": {"score": {"type": "integer", "minimum": 0, "maximum": 100}, "reasoning": {"type": "string"}},
    "required": ["score", "reasoning"],
}

json_schema = {
    "type": "object",
    "properties": {
        "relevance": score_object_schema,
        "accuracy": score_object_schema,
        "completeness": score_object_schema,
        "instruction_adherence": score_object_schema,
        "coherence_clarity": score_object_schema,
        "hallucination": score_object_schema,
    },
    "required": [
        "relevance",
        "accuracy",
        "completeness",
        "instruction_adherence",
        "coherence_clarity",
        "hallucination",
    ],
}


async def evaluation_prompt_output(*, original_prompt: str, model_output: str) -> EvaluationToolResponse:
    """Generate an evaluation prompt for assessing the quality of a language model output.

    Args:
        original_prompt: The prompt given to the language model.
        model_output: The generated output from the language model.

    Returns:
        The evaluation result object.
    """
    return await make_completions_request(
        prompt_identifier="evaluation_prompt_output",
        response_type=EvaluationToolResponse,
        response_schema=json_schema,
        system_prompt=EVALUATION_SYSTEM_PROMPT,
        messages=EVALUATION_PROMPT.substitute(original_prompt=original_prompt, model_output=model_output),
    )
