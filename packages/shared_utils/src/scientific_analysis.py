"""Scientific article analysis for extracting structured metadata vectors.

This module provides LLM-based extraction of scientific elements (arguments, evidence,
hypotheses, conclusions, experiment results, and sources) from documents to create
rich metadata vectors for enhanced retrieval.
"""

import asyncio
from datetime import UTC, datetime
from typing import Final, NotRequired, TypedDict, cast

from google import genai
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL, get_google_ai_client
from packages.shared_utils.src.constants import CONTENT_TYPE_JSON
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

logger = get_logger(__name__)

# Thinking budget for scientific analysis - needs deep reasoning
SCIENTIFIC_ANALYSIS_THINKING_BUDGET: Final[int] = 6000


SCIENTIFIC_ANALYSIS_SYSTEM_PROMPT: Final[str] = """
You are a scientific article analysis expert. Your task is to carefully read the provided scientific article and extract ALL key elements with complete information.

Extract the following elements from the article. Each element can appear multiple times throughout the article, so create a separate item for each occurrence:

1. **Arguments**: All arguments made in the article. An argument is a claim or position that the authors propose or defend. Extract each argument separately with its full context.

2. **Evidence**: All pieces of evidence presented. This includes data, observations, citations, examples, or any supporting information used to back up claims. Extract each piece of evidence separately.

3. **Hypotheses**: All hypotheses stated in the article. A hypothesis is a proposed explanation or prediction that can be tested. Extract each hypothesis with its full formulation.

4. **Conclusions**: All conclusions drawn in the article. This includes final conclusions, intermediate conclusions, and implications. Extract each conclusion separately.

5. **Experiment Results**: All experimental results, findings, or outcomes reported. Include quantitative data, qualitative observations, and any reported measurements or outcomes.

6. **Sources**: All sources, references, or citations mentioned in the article. Include author names, publication info, or any referenced work.

7. **Objectives**: Research objectives or goals stated in the article. These are high-level aims the research intends to achieve. Extract each objective with its scope and expected outcome.

8. **Tasks**: Specific tasks or steps required to achieve the objectives. These are concrete actions or work items. For each task, identify which objective it supports and any dependencies on other tasks.

## Extraction Guidelines
- Extract EVERYTHING - be comprehensive and thorough
- Each sentence can contain multiple items - extract them separately
- Preserve the exact wording from the article when extracting text
- If an element appears multiple times, create separate entries
- Fill in all fields for each item
- Do NOT omit any information
- Include full context and details for each extracted element

## Temporal Ordering Rules
- For "source": Determine if the argument/evidence/result is from the article's authors ("writers") or from cited work ("non_writers")
- For "temporal_context":
  - "problem" = the research gap, problem, or motivation being addressed (always at the beginning)
  - "past" = research/work cited from other publications
  - "experiment" = the main scientific work/experiments/methods presented in THIS article
  - "future" = proposed future work, implications, or recommendations
- For "temporal_order":
  - "problem" items: ALWAYS use 0 (the starting point)
  - "experiment" items: Use 0.1-0.99 based on experimental pipeline order
  - "future" items: Use 1.0-2.0 (immediate future work=1.0, long-term implications=2.0)
  - "past" items: Use negative numbers from -0.99 (oldest) to -0.01 (newest) based on citation date

## Objectives and Tasks Rules
- Objectives and Tasks are ALWAYS in "future" temporal_context (they represent planned/proposed work)
- For "temporal_order" of objectives and tasks:
  - Use 1.0-1.5 for near-term objectives/tasks (immediate next steps)
  - Use 1.5-2.0 for longer-term objectives/tasks (distant future goals)
  - Order objectives by their logical sequence (which objective comes first)
  - Order tasks by their execution sequence within their parent objective
- For task dependencies:
  - Identify which tasks must be completed before other tasks can begin
  - Use "depends_on" to list task IDs that must complete first
  - A task with no dependencies has an empty "depends_on" array
- For task-objective relationships:
  - Each task must specify which objective(s) it supports via "supports_objective"
  - Use the objective ID to reference the parent objective

## Pivot Identification Rules
- A "pivot" is a major conceptual shift in perspective, method, or approach - not just any new idea
- In most scientific articles, there are typically 2 major pivots:
  1. ABSTRACT PIVOT: Where the novel approach is first introduced/announced
  2. METHODOLOGY PIVOT: Where the major methodological shift is explained in detail
- Mark pivot=true ONLY for these major turning points
- Most items should have pivot=false - be selective
"""


SCIENTIFIC_ANALYSIS_USER_PROMPT: Final[str] = """
Analyze the following scientific article and extract all key elements.

## Article Content
<article>
{article_content}
</article>

Extract all arguments, evidence, hypotheses, conclusions, experiment results, and sources following the schema.
"""


# JSON Schema for Gemini structured output
scientific_analysis_schema: Final[dict[str, object]] = {
    "type": "object",
    "properties": {
        "arguments": {
            "type": "array",
            "description": "All arguments made in the article",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete argument as stated",
                    },
                    "context": {
                        "type": "string",
                        "description": "Brief context or section where this appears",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["main", "supporting", "counter"],
                    },
                    "source": {"type": "string", "enum": ["writers", "non_writers"]},
                    "temporal_context": {
                        "type": "string",
                        "enum": ["past", "future", "experiment", "problem"],
                    },
                    "temporal_order": {
                        "type": "number",
                        "description": "Temporal ordering value",
                    },
                    "action_type": {
                        "type": "string",
                        "enum": ["author_action", "reaction"],
                    },
                    "pivot": {"type": "boolean"},
                    "rhetorical_action": {
                        "type": "string",
                        "enum": [
                            "argue",
                            "support_by_evidence",
                            "support_by_citation",
                            "describe",
                            "bring_contra",
                            "dismiss_contra",
                            "conclude",
                            "describe_other_works",
                            "bring_hypothesis",
                            "bring_theory",
                            "underline",
                            "step_back",
                            "compare",
                            "critique",
                            "justify",
                            "clarify",
                            "synthesize",
                            "question",
                            "propose",
                        ],
                    },
                    "hierarchy": {
                        "type": "string",
                        "description": "Hierarchical notation (e.g., 1.0, 1.1, 1.1.1)",
                    },
                },
                "required": [
                    "id",
                    "text",
                    "context",
                    "type",
                    "source",
                    "temporal_context",
                    "temporal_order",
                    "action_type",
                    "pivot",
                    "rhetorical_action",
                    "hierarchy",
                ],
            },
        },
        "evidence": {
            "type": "array",
            "description": "All pieces of evidence presented",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete evidence as presented",
                    },
                    "type": {
                        "type": "string",
                        "enum": [
                            "experimental",
                            "observational",
                            "citation",
                            "statistical",
                            "other",
                        ],
                    },
                    "supports": {
                        "type": "string",
                        "description": "What argument or claim this evidence supports",
                    },
                    "source": {"type": "string", "enum": ["writers", "non_writers"]},
                    "temporal_context": {
                        "type": "string",
                        "enum": ["past", "future", "experiment", "problem"],
                    },
                    "temporal_order": {"type": "number"},
                    "action_type": {
                        "type": "string",
                        "enum": ["author_action", "reaction"],
                    },
                    "pivot": {"type": "boolean"},
                    "rhetorical_action": {
                        "type": "string",
                        "enum": [
                            "argue",
                            "support_by_evidence",
                            "support_by_citation",
                            "describe",
                            "bring_contra",
                            "dismiss_contra",
                            "conclude",
                            "describe_other_works",
                            "bring_hypothesis",
                            "bring_theory",
                            "underline",
                            "step_back",
                            "compare",
                            "critique",
                            "justify",
                            "clarify",
                            "synthesize",
                            "question",
                            "propose",
                        ],
                    },
                    "hierarchy": {"type": "string"},
                },
                "required": [
                    "id",
                    "text",
                    "type",
                    "supports",
                    "source",
                    "temporal_context",
                    "temporal_order",
                    "action_type",
                    "pivot",
                    "rhetorical_action",
                    "hierarchy",
                ],
            },
        },
        "hypotheses": {
            "type": "array",
            "description": "All hypotheses stated in the article",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete hypothesis statement",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["primary", "secondary", "alternative"],
                    },
                    "testable": {
                        "type": "string",
                        "description": "How this hypothesis can be or was tested",
                    },
                    "source": {"type": "string", "enum": ["writers", "non_writers"]},
                    "temporal_context": {
                        "type": "string",
                        "enum": ["past", "future", "experiment", "problem"],
                    },
                    "temporal_order": {"type": "number"},
                    "action_type": {
                        "type": "string",
                        "enum": ["author_action", "reaction"],
                    },
                    "pivot": {"type": "boolean"},
                    "rhetorical_action": {
                        "type": "string",
                        "enum": [
                            "argue",
                            "support_by_evidence",
                            "support_by_citation",
                            "describe",
                            "bring_contra",
                            "dismiss_contra",
                            "conclude",
                            "describe_other_works",
                            "bring_hypothesis",
                            "bring_theory",
                            "underline",
                            "step_back",
                            "compare",
                            "critique",
                            "justify",
                            "clarify",
                            "synthesize",
                            "question",
                            "propose",
                        ],
                    },
                    "hierarchy": {"type": "string"},
                },
                "required": [
                    "id",
                    "text",
                    "type",
                    "testable",
                    "source",
                    "temporal_context",
                    "temporal_order",
                    "action_type",
                    "pivot",
                    "rhetorical_action",
                    "hierarchy",
                ],
            },
        },
        "conclusions": {
            "type": "array",
            "description": "All conclusions drawn in the article",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete conclusion statement",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["main", "intermediate", "implication"],
                    },
                    "based_on": {
                        "type": "string",
                        "description": "What this conclusion is based on",
                    },
                    "source": {"type": "string", "enum": ["writers", "non_writers"]},
                    "temporal_context": {
                        "type": "string",
                        "enum": ["past", "future", "experiment", "problem"],
                    },
                    "temporal_order": {"type": "number"},
                    "action_type": {
                        "type": "string",
                        "enum": ["author_action", "reaction"],
                    },
                    "pivot": {"type": "boolean"},
                    "rhetorical_action": {
                        "type": "string",
                        "enum": [
                            "argue",
                            "support_by_evidence",
                            "support_by_citation",
                            "describe",
                            "bring_contra",
                            "dismiss_contra",
                            "conclude",
                            "describe_other_works",
                            "bring_hypothesis",
                            "bring_theory",
                            "underline",
                            "step_back",
                            "compare",
                            "critique",
                            "justify",
                            "clarify",
                            "synthesize",
                            "question",
                            "propose",
                        ],
                    },
                    "hierarchy": {"type": "string"},
                },
                "required": [
                    "id",
                    "text",
                    "type",
                    "based_on",
                    "source",
                    "temporal_context",
                    "temporal_order",
                    "action_type",
                    "pivot",
                    "rhetorical_action",
                    "hierarchy",
                ],
            },
        },
        "experiment_results": {
            "type": "array",
            "description": "All experimental results reported",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete result description",
                    },
                    "experiment": {
                        "type": "string",
                        "description": "What experiment produced this result",
                    },
                    "outcome": {
                        "type": "string",
                        "description": "The specific outcome or finding",
                    },
                    "significance": {
                        "type": "string",
                        "description": "Statistical significance if mentioned",
                    },
                    "source": {"type": "string", "enum": ["writers", "non_writers"]},
                    "temporal_context": {
                        "type": "string",
                        "enum": ["past", "future", "experiment", "problem"],
                    },
                    "temporal_order": {"type": "number"},
                    "action_type": {
                        "type": "string",
                        "enum": ["author_action", "reaction"],
                    },
                    "pivot": {"type": "boolean"},
                    "rhetorical_action": {
                        "type": "string",
                        "enum": [
                            "argue",
                            "support_by_evidence",
                            "support_by_citation",
                            "describe",
                            "bring_contra",
                            "dismiss_contra",
                            "conclude",
                            "describe_other_works",
                            "bring_hypothesis",
                            "bring_theory",
                            "underline",
                            "step_back",
                            "compare",
                            "critique",
                            "justify",
                            "clarify",
                            "synthesize",
                            "question",
                            "propose",
                        ],
                    },
                    "hierarchy": {"type": "string"},
                },
                "required": [
                    "id",
                    "text",
                    "experiment",
                    "outcome",
                    "source",
                    "temporal_context",
                    "temporal_order",
                    "action_type",
                    "pivot",
                    "rhetorical_action",
                    "hierarchy",
                ],
            },
        },
        "sources": {
            "type": "array",
            "description": "All sources and citations mentioned",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "Full reference or citation as mentioned",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["citation", "dataset", "method", "other"],
                    },
                    "relevance": {
                        "type": "string",
                        "description": "Why this source is referenced",
                    },
                },
                "required": ["id", "text", "type", "relevance"],
            },
        },
        "objectives": {
            "type": "array",
            "description": "Research objectives or goals stated in the article",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete objective statement",
                    },
                    "scope": {
                        "type": "string",
                        "description": "The scope or boundaries of this objective",
                    },
                    "expected_outcome": {
                        "type": "string",
                        "description": "What achieving this objective will produce",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["primary", "secondary", "enabling"],
                    },
                    "temporal_context": {
                        "type": "string",
                        "enum": ["future"],
                        "description": "Always future for objectives",
                    },
                    "temporal_order": {
                        "type": "number",
                        "description": "1.0-1.5 for near-term, 1.5-2.0 for long-term",
                    },
                    "hierarchy": {
                        "type": "string",
                        "description": "Hierarchical notation (e.g., O1, O2, O1.1)",
                    },
                },
                "required": [
                    "id",
                    "text",
                    "scope",
                    "expected_outcome",
                    "type",
                    "temporal_context",
                    "temporal_order",
                    "hierarchy",
                ],
            },
        },
        "tasks": {
            "type": "array",
            "description": "Specific tasks required to achieve objectives",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "text": {
                        "type": "string",
                        "description": "The complete task description",
                    },
                    "action": {
                        "type": "string",
                        "description": "The specific action to be performed",
                    },
                    "deliverable": {
                        "type": "string",
                        "description": "What this task will produce or deliver",
                    },
                    "supports_objective": {
                        "type": "integer",
                        "description": "ID of the objective this task supports",
                    },
                    "depends_on": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs of tasks that must complete before this task can begin",
                    },
                    "temporal_context": {
                        "type": "string",
                        "enum": ["future"],
                        "description": "Always future for tasks",
                    },
                    "temporal_order": {
                        "type": "number",
                        "description": "1.0-1.5 for near-term, 1.5-2.0 for long-term",
                    },
                    "hierarchy": {
                        "type": "string",
                        "description": "Hierarchical notation (e.g., T1, T2, T1.1)",
                    },
                },
                "required": [
                    "id",
                    "text",
                    "action",
                    "deliverable",
                    "supports_objective",
                    "depends_on",
                    "temporal_context",
                    "temporal_order",
                    "hierarchy",
                ],
            },
        },
        "metadata": {
            "type": "object",
            "description": "Summary metadata about the extraction",
            "properties": {
                "total_arguments": {"type": "integer"},
                "total_evidence": {"type": "integer"},
                "total_hypotheses": {"type": "integer"},
                "total_conclusions": {"type": "integer"},
                "total_results": {"type": "integer"},
                "total_sources": {"type": "integer"},
                "total_objectives": {"type": "integer"},
                "total_tasks": {"type": "integer"},
                "article_type": {
                    "type": "string",
                    "enum": [
                        "research",
                        "review",
                        "meta-analysis",
                        "case_study",
                        "other",
                    ],
                },
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
    "required": [
        "arguments",
        "evidence",
        "hypotheses",
        "conclusions",
        "experiment_results",
        "sources",
        "objectives",
        "tasks",
        "metadata",
    ],
}


# TypedDict definitions for type safety
class ArgumentElement(TypedDict):
    id: int
    text: str
    context: str
    type: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class EvidenceElement(TypedDict):
    id: int
    text: str
    type: str
    supports: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class HypothesisElement(TypedDict):
    id: int
    text: str
    type: str
    testable: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class ConclusionElement(TypedDict):
    id: int
    text: str
    type: str
    based_on: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class ExperimentResultElement(TypedDict):
    id: int
    text: str
    experiment: str
    outcome: str
    significance: NotRequired[str]
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class SourceElement(TypedDict):
    id: int
    text: str
    type: str
    relevance: str


class ObjectiveElement(TypedDict):
    id: int
    text: str
    scope: str
    expected_outcome: str
    type: str
    temporal_context: str
    temporal_order: float
    hierarchy: str


class TaskElement(TypedDict):
    id: int
    text: str
    action: str
    deliverable: str
    supports_objective: int
    depends_on: list[int]
    temporal_context: str
    temporal_order: float
    hierarchy: str


class AnalysisMetadata(TypedDict):
    total_arguments: int
    total_evidence: int
    total_hypotheses: int
    total_conclusions: int
    total_results: int
    total_sources: int
    total_objectives: int
    total_tasks: int
    article_type: str


class ScientificAnalysisResult(TypedDict):
    arguments: list[ArgumentElement]
    evidence: list[EvidenceElement]
    hypotheses: list[HypothesisElement]
    conclusions: list[ConclusionElement]
    experiment_results: list[ExperimentResultElement]
    sources: list[SourceElement]
    objectives: list[ObjectiveElement]
    tasks: list[TaskElement]
    metadata: AnalysisMetadata


def validate_scientific_analysis(result: ScientificAnalysisResult) -> None:
    """Validate the scientific analysis result for completeness and consistency."""
    required_keys = [
        "arguments",
        "evidence",
        "hypotheses",
        "conclusions",
        "experiment_results",
        "sources",
        "objectives",
        "tasks",
        "metadata",
    ]
    for key in required_keys:
        if key not in result:
            raise ValidationError(
                f"Missing required key: {key}",
                context={"result_keys": list(result.keys())},
            )

    metadata = result["metadata"]
    if metadata["total_arguments"] != len(result["arguments"]):
        raise ValidationError(
            "Metadata count mismatch for arguments",
            context={
                "metadata_count": metadata["total_arguments"],
                "actual_count": len(result["arguments"]),
            },
        )
    if metadata["total_evidence"] != len(result["evidence"]):
        raise ValidationError(
            "Metadata count mismatch for evidence",
            context={
                "metadata_count": metadata["total_evidence"],
                "actual_count": len(result["evidence"]),
            },
        )
    if metadata["total_hypotheses"] != len(result["hypotheses"]):
        raise ValidationError(
            "Metadata count mismatch for hypotheses",
            context={
                "metadata_count": metadata["total_hypotheses"],
                "actual_count": len(result["hypotheses"]),
            },
        )
    if metadata["total_conclusions"] != len(result["conclusions"]):
        raise ValidationError(
            "Metadata count mismatch for conclusions",
            context={
                "metadata_count": metadata["total_conclusions"],
                "actual_count": len(result["conclusions"]),
            },
        )
    if metadata["total_results"] != len(result["experiment_results"]):
        raise ValidationError(
            "Metadata count mismatch for experiment_results",
            context={
                "metadata_count": metadata["total_results"],
                "actual_count": len(result["experiment_results"]),
            },
        )
    if metadata["total_sources"] != len(result["sources"]):
        raise ValidationError(
            "Metadata count mismatch for sources",
            context={
                "metadata_count": metadata["total_sources"],
                "actual_count": len(result["sources"]),
            },
        )
    if metadata["total_objectives"] != len(result["objectives"]):
        raise ValidationError(
            "Metadata count mismatch for objectives",
            context={
                "metadata_count": metadata["total_objectives"],
                "actual_count": len(result["objectives"]),
            },
        )
    if metadata["total_tasks"] != len(result["tasks"]):
        raise ValidationError(
            "Metadata count mismatch for tasks",
            context={
                "metadata_count": metadata["total_tasks"],
                "actual_count": len(result["tasks"]),
            },
        )

    # Validate task dependencies reference valid task IDs
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

    # Validate task objective references
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

    # Validate pivot count - should typically have 0-3 pivots
    pivot_count = (
        sum(1 for item in result["arguments"] if item.get("pivot", False))
        + sum(1 for item in result["evidence"] if item.get("pivot", False))
        + sum(1 for item in result["hypotheses"] if item.get("pivot", False))
        + sum(1 for item in result["conclusions"] if item.get("pivot", False))
        + sum(1 for item in result["experiment_results"] if item.get("pivot", False))
    )

    if pivot_count > 5:
        logger.warning(
            "High pivot count detected - pivots should be rare",
            pivot_count=pivot_count,
        )


def aggregate_analyses(
    analyses: list[ScientificAnalysisResult],
) -> ScientificAnalysisResult:
    """Aggregate multiple scientific analyses into a single combined result.

    This function merges analyses from multiple source documents into one,
    combining all elements while maintaining unique IDs and recalculating totals.

    Args:
        analyses: List of ScientificAnalysisResult from individual documents

    Returns:
        A combined ScientificAnalysisResult with all elements merged
    """
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

    # Merge all elements with ID offsetting to avoid collisions
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

        for arg in analysis["arguments"]:
            new_arg = cast("ArgumentElement", {**arg, "id": arg["id"] + id_offset})
            all_arguments.append(new_arg)
            max_id = max(max_id, arg["id"])

        for ev in analysis["evidence"]:
            new_ev = cast("EvidenceElement", {**ev, "id": ev["id"] + id_offset})
            all_evidence.append(new_ev)
            max_id = max(max_id, ev["id"])

        for hyp in analysis["hypotheses"]:
            new_hyp = cast("HypothesisElement", {**hyp, "id": hyp["id"] + id_offset})
            all_hypotheses.append(new_hyp)
            max_id = max(max_id, hyp["id"])

        for conc in analysis["conclusions"]:
            new_conc = cast("ConclusionElement", {**conc, "id": conc["id"] + id_offset})
            all_conclusions.append(new_conc)
            max_id = max(max_id, conc["id"])

        for res in analysis["experiment_results"]:
            new_res = cast(
                "ExperimentResultElement", {**res, "id": res["id"] + id_offset}
            )
            all_experiment_results.append(new_res)
            max_id = max(max_id, res["id"])

        for src in analysis["sources"]:
            new_src = cast("SourceElement", {**src, "id": src["id"] + id_offset})
            all_sources.append(new_src)
            max_id = max(max_id, src["id"])

        for obj in analysis["objectives"]:
            new_obj = cast("ObjectiveElement", {**obj, "id": obj["id"] + id_offset})
            all_objectives.append(new_obj)
            max_id = max(max_id, obj["id"])

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
    timeout: float = 300,
) -> ScientificAnalysisResult:
    """Analyze scientific content and extract structured elements.

    Args:
        article_content: The full text content of the scientific article
        source_id: The source ID for logging/tracing
        timeout: Request timeout in seconds

    Returns:
        ScientificAnalysisResult with all extracted elements
    """
    client = get_google_ai_client()

    user_prompt = SCIENTIFIC_ANALYSIS_USER_PROMPT.format(
        article_content=article_content
    )

    safety_settings = [
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
    ]

    thinking_config = genai.types.ThinkingConfig(
        thinking_budget=SCIENTIFIC_ANALYSIS_THINKING_BUDGET
    )

    config = genai.types.GenerateContentConfig(
        response_mime_type=CONTENT_TYPE_JSON,
        response_schema=scientific_analysis_schema,
        temperature=0,
        max_output_tokens=65536,
        system_instruction=SCIENTIFIC_ANALYSIS_SYSTEM_PROMPT,
        safety_settings=safety_settings,
        thinking_config=thinking_config,
    )

    logger.info(
        "Starting scientific content analysis",
        source_id=source_id,
        content_length=len(article_content),
        thinking_budget=SCIENTIFIC_ANALYSIS_THINKING_BUDGET,
    )

    start_time = datetime.now(UTC)

    try:
        async with asyncio.timeout(timeout):
            response = await client._aio.models.generate_content(  # noqa: SLF001
                model=GEMINI_FLASH_MODEL,
                contents=user_prompt,
                config=config,
            )
    except TimeoutError:
        elapsed_ms = (datetime.now(UTC) - start_time).total_seconds() * 1000
        logger.error(
            "Scientific analysis timed out",
            source_id=source_id,
            timeout_seconds=timeout,
            elapsed_ms=elapsed_ms,
        )
        raise

    elapsed_ms = (datetime.now(UTC) - start_time).total_seconds() * 1000

    usage_metadata = getattr(response, "usage_metadata", None)
    if usage_metadata:
        logger.info(
            "Scientific analysis completed",
            source_id=source_id,
            elapsed_ms=round(elapsed_ms, 2),
            prompt_tokens=getattr(usage_metadata, "prompt_token_count", None),
            completion_tokens=getattr(usage_metadata, "candidates_token_count", None),
            total_tokens=getattr(usage_metadata, "total_token_count", None),
        )
    else:
        logger.info(
            "Scientific analysis completed",
            source_id=source_id,
            elapsed_ms=round(elapsed_ms, 2),
        )

    result = deserialize(response.text or "", ScientificAnalysisResult)

    validate_scientific_analysis(result)

    logger.info(
        "Scientific analysis extracted elements",
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
