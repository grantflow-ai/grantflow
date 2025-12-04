from asyncio import timeout
from datetime import UTC, datetime
from textwrap import dedent
from typing import Any, Final, TypedDict, TypeVar, cast

from google import genai
from packages.db.src.json_objects import (
    AnalysisMetadata,
    ArgumentElement,
    ConclusionElement,
    EvidenceElement,
    ExperimentResultElement,
    HypothesisElement,
    ObjectiveElement,
    ScientificAnalysisResult,
    SourceElement,
    TaskElement,
)
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL, get_google_ai_client
from packages.shared_utils.src.constants import CONTENT_TYPE_JSON
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

logger = get_logger(__name__)

THINKING_BUDGET: Final[int] = 4000

CORE_SYSTEM_PROMPT: Final[str] = dedent(
    """
You are a scientific article analysis expert. Read the article and extract factual elements only.

## Elements
- Arguments: every claim/position with context
- Evidence: data/observations/citations supporting claims
- Hypotheses: proposed explanations or predictions
- Conclusions: final or intermediate takeaways
- Experiment results: reported outcomes and measurements

## Rules
- Preserve wording from the article
- Use ids as given; keep ordering stable
- Source: writers vs non_writers
- temporal_context: problem (start), past (citations), experiment (work in this article), future (implications)
- temporal_order: problem=0, past=-0.99..-0.01, experiment=0.1..0.99 in sequence, future=1.0..2.0
- Pivots are rare; set pivot=true only for major shifts
- Fill type-specific fields when present (supports, based_on, testable, experiment)
"""
)

PLAN_SYSTEM_PROMPT: Final[str] = dedent(
    """
You are a scientific article analysis expert. Read the article and extract planned work plus citations.

## Elements
- Objectives: research goals; future-only
- Tasks: concrete steps with dependencies; future-only
- Sources: citations/datasets/methods with relevance
- Metadata: simple counts and article type

## Rules
- Preserve wording from the article
- Keep ids stable; link tasks to objectives via ids
- depends_on contains task ids; can be empty
- temporal_context for objectives/tasks is future; temporal_order 1.0-1.5 (near), 1.5-2.0 (later)
- Provide counts in metadata (arguments, evidence, hypotheses, conclusions, results, sources, objectives, tasks) and article_type
"""
)

CORE_USER_PROMPT: Final[str] = dedent(
    """Analyze the article and extract arguments, evidence, hypotheses, conclusions, and experiment results.

<article>
{article_content}
</article>
"""
)

PLAN_USER_PROMPT: Final[str] = dedent(
    """Analyze the article and extract objectives, tasks, sources, and summary metadata.

<article>
{article_content}
</article>
"""
)


class CorePayload(TypedDict):
    arguments: list[ArgumentElement]
    evidence: list[EvidenceElement]
    hypotheses: list[HypothesisElement]
    conclusions: list[ConclusionElement]
    results: list[ExperimentResultElement]


class PlanPayload(TypedDict):
    objectives: list[ObjectiveElement]
    tasks: list[TaskElement]
    sources: list[SourceElement]
    meta: AnalysisMetadata


T = TypeVar("T")
E = TypeVar("E", bound=dict[str, Any])


def _offset_elements(elements: list[E], id_offset: int) -> tuple[list[E], int]:
    result: list[E] = []
    max_id = 0
    for elem in elements:
        new_elem = cast(E, {**elem, "id": elem["id"] + id_offset})
        result.append(new_elem)
        max_id = max(max_id, elem["id"])
    return result, max_id


async def _generate_structured_response(
    *,
    prompt_identifier: str,
    system_prompt: str,
    user_prompt: str,
    response_schema: dict[str, Any],
    response_type: type[T],
    trace_id: str,
    timeout_seconds: float = 300,
) -> T:
    client = get_google_ai_client()

    config = genai.types.GenerateContentConfig(
        response_mime_type=CONTENT_TYPE_JSON,
        response_schema=response_schema,
        temperature=0,
        system_instruction=system_prompt,
        safety_settings=[
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
        ],
        thinking_config=genai.types.ThinkingConfig(thinking_budget=THINKING_BUDGET),
    )

    start_time = datetime.now(UTC)

    async with timeout(timeout_seconds):
        response = await client._aio.models.generate_content(  # noqa: SLF001
            model=GEMINI_FLASH_MODEL,
            contents=user_prompt,
            config=config,
        )

    elapsed_ms = (datetime.now(UTC) - start_time).total_seconds() * 1000

    usage_metadata = getattr(response, "usage_metadata", None)
    logger.info(
        "Scientific analysis call completed",
        prompt_identifier=prompt_identifier,
        source_id=trace_id,
        elapsed_ms=round(elapsed_ms, 2),
        prompt_tokens=getattr(usage_metadata, "prompt_token_count", None)
        if usage_metadata
        else None,
        completion_tokens=getattr(usage_metadata, "candidates_token_count", None)
        if usage_metadata
        else None,
        total_tokens=getattr(usage_metadata, "total_token_count", None)
        if usage_metadata
        else None,
        thinking_budget=THINKING_BUDGET,
    )

    return deserialize(response.text or "", response_type)


core_schema: Final[dict[str, Any]] = {
    "type": "object",
    "properties": {
        "arguments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "source": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                    "pivot": {"type": "boolean"},
                },
                "required": ["id", "text", "type", "source"],
            },
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "supports": {"type": "string"},
                    "source": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                    "pivot": {"type": "boolean"},
                },
                "required": ["id", "text", "type", "source"],
            },
        },
        "hypotheses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "testable": {"type": "string"},
                    "source": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                    "pivot": {"type": "boolean"},
                },
                "required": ["id", "text", "type", "source"],
            },
        },
        "conclusions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "based_on": {"type": "string"},
                    "source": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                    "pivot": {"type": "boolean"},
                },
                "required": ["id", "text", "type", "source"],
            },
        },
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "experiment": {"type": "string"},
                    "outcome": {"type": "string"},
                    "source": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                    "pivot": {"type": "boolean"},
                },
                "required": ["id", "text", "experiment", "source"],
            },
        },
    },
    "required": ["arguments", "evidence", "hypotheses", "conclusions", "results"],
}

plan_schema: Final[dict[str, Any]] = {
    "type": "object",
    "properties": {
        "objectives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "hierarchy": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                },
                "required": ["id", "text", "type", "hierarchy"],
            },
        },
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "supports_objective": {"type": "integer"},
                    "depends_on": {"type": "array", "items": {"type": "integer"}},
                    "hierarchy": {"type": "string"},
                    "temporal_context": {"type": "string"},
                    "temporal_order": {"type": "number"},
                },
                "required": ["id", "text", "supports_objective", "hierarchy"],
            },
        },
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {"type": "string"},
                    "type": {"type": "string"},
                    "relevance": {"type": "string"},
                },
                "required": ["id", "text", "type"],
            },
        },
        "meta": {
            "type": "object",
            "properties": {
                "total_arguments": {"type": "integer"},
                "total_evidence": {"type": "integer"},
                "total_hypotheses": {"type": "integer"},
                "total_conclusions": {"type": "integer"},
                "total_results": {"type": "integer"},
                "total_sources": {"type": "integer"},
                "total_objectives": {"type": "integer"},
                "total_tasks": {"type": "integer"},
                "article_type": {"type": "string"},
            },
            "required": [
                "total_arguments",
                "total_evidence",
                "total_hypotheses",
                "total_conclusions",
                "total_results",
                "total_sources",
                "total_objectives",
                "total_tasks",
                "article_type",
            ],
        },
    },
    "required": ["objectives", "tasks", "sources", "meta"],
}


async def _run_core_extraction(article_content: str, trace_id: str) -> CorePayload:
    prompt = CORE_USER_PROMPT.format(article_content=article_content)
    return await _generate_structured_response(
        prompt_identifier="scientific_analysis_core",
        system_prompt=CORE_SYSTEM_PROMPT,
        user_prompt=prompt,
        response_schema=core_schema,
        response_type=CorePayload,
        trace_id=trace_id,
    )


async def _run_plan_extraction(article_content: str, trace_id: str) -> PlanPayload:
    prompt = PLAN_USER_PROMPT.format(article_content=article_content)
    return await _generate_structured_response(
        prompt_identifier="scientific_analysis_plan",
        system_prompt=PLAN_SYSTEM_PROMPT,
        user_prompt=prompt,
        response_schema=plan_schema,
        response_type=PlanPayload,
        trace_id=trace_id,
    )


def validate_scientific_analysis(result: ScientificAnalysisResult) -> None:
    task_ids = {task["id"] for task in result["tasks"]}
    for task in result["tasks"]:
        for dep_id in task.get("depends_on", []):
            if dep_id not in task_ids:
                raise ValidationError(
                    f"Task {task['id']} depends on non-existent task {dep_id}",
                    context={
                        "task_id": task["id"],
                        "invalid_dependency": dep_id,
                        "valid_task_ids": sorted(task_ids),
                    },
                )

    objective_ids = {obj["id"] for obj in result["objectives"]}
    for task in result["tasks"]:
        if task["supports_objective"] not in objective_ids:
            raise ValidationError(
                f"Task {task['id']} supports non-existent objective {task['supports_objective']}",
                context={
                    "task_id": task["id"],
                    "invalid_objective": task["supports_objective"],
                    "valid_objective_ids": sorted(objective_ids),
                },
            )


def aggregate_analyses(
    analyses: list[ScientificAnalysisResult],
) -> ScientificAnalysisResult:
    if not analyses:
        return ScientificAnalysisResult(
            arguments=[],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[],
            tasks=[],
            metadata=AnalysisMetadata(
                total_arguments=0,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=0,
                total_tasks=0,
                article_type="other",
            ),
        )

    all_arguments: list[ArgumentElement] = []
    all_evidence: list[EvidenceElement] = []
    all_hypotheses: list[HypothesisElement] = []
    all_conclusions: list[ConclusionElement] = []
    all_experiment_results: list[ExperimentResultElement] = []
    all_sources: list[SourceElement] = []
    all_objectives: list[ObjectiveElement] = []
    all_tasks: list[TaskElement] = []

    id_offset = 0
    for analysis in analyses:
        max_id = 0

        new_args, arg_max = _offset_elements(analysis["arguments"], id_offset)
        all_arguments.extend(new_args)
        max_id = max(max_id, arg_max)

        new_evs, ev_max = _offset_elements(analysis["evidence"], id_offset)
        all_evidence.extend(new_evs)
        max_id = max(max_id, ev_max)

        new_hyps, hyp_max = _offset_elements(analysis["hypotheses"], id_offset)
        all_hypotheses.extend(new_hyps)
        max_id = max(max_id, hyp_max)

        new_concs, conc_max = _offset_elements(analysis["conclusions"], id_offset)
        all_conclusions.extend(new_concs)
        max_id = max(max_id, conc_max)

        new_results, res_max = _offset_elements(
            analysis["experiment_results"], id_offset
        )
        all_experiment_results.extend(new_results)
        max_id = max(max_id, res_max)

        new_srcs, src_max = _offset_elements(analysis["sources"], id_offset)
        all_sources.extend(new_srcs)
        max_id = max(max_id, src_max)

        new_objs, obj_max = _offset_elements(analysis["objectives"], id_offset)
        all_objectives.extend(new_objs)
        max_id = max(max_id, obj_max)

        for task in analysis["tasks"]:
            new_task = cast(
                "TaskElement",
                {
                    **task,
                    "id": task["id"] + id_offset,
                    "supports_objective": task["supports_objective"] + id_offset,
                    "depends_on": [
                        dep + id_offset for dep in task.get("depends_on", [])
                    ],
                },
            )
            all_tasks.append(new_task)
            max_id = max(max_id, task["id"])

        id_offset += max_id + 1

    return ScientificAnalysisResult(
        arguments=all_arguments,
        evidence=all_evidence,
        hypotheses=all_hypotheses,
        conclusions=all_conclusions,
        experiment_results=all_experiment_results,
        sources=all_sources,
        objectives=all_objectives,
        tasks=all_tasks,
        metadata=AnalysisMetadata(
            total_arguments=len(all_arguments),
            total_evidence=len(all_evidence),
            total_hypotheses=len(all_hypotheses),
            total_conclusions=len(all_conclusions),
            total_results=len(all_experiment_results),
            total_sources=len(all_sources),
            total_objectives=len(all_objectives),
            total_tasks=len(all_tasks),
            article_type=analyses[0]["metadata"]["article_type"]
            if analyses
            else "other",
        ),
    )


async def analyze_scientific_content(
    article_content: str,
    *,
    source_id: str,
) -> ScientificAnalysisResult:
    core = await _run_core_extraction(
        article_content=article_content, trace_id=source_id
    )
    plan = await _run_plan_extraction(
        article_content=article_content, trace_id=source_id
    )

    result = ScientificAnalysisResult(
        arguments=core["arguments"],
        evidence=core["evidence"],
        hypotheses=core["hypotheses"],
        conclusions=core["conclusions"],
        experiment_results=core["results"],
        sources=plan["sources"],
        objectives=plan["objectives"],
        tasks=plan["tasks"],
        metadata=plan["meta"],
    )

    validate_scientific_analysis(result)

    logger.info(
        "Scientific analysis completed",
        source_id=source_id,
        arguments=len(result["arguments"]),
        evidence=len(result["evidence"]),
        hypotheses=len(result["hypotheses"]),
        conclusions=len(result["conclusions"]),
        experiment_results=len(result["experiment_results"]),
        sources=len(result["sources"]),
        objectives=len(result["objectives"]),
        tasks=len(result["tasks"]),
        article_type=result["metadata"]["article_type"],
    )

    return result
