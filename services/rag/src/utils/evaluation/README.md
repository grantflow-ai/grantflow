# Scientific Content Evaluation System

A unified evaluation system for grant application content generation that combines deterministic NLP-based metrics with optional LLM-based evaluation.

## Overview

The evaluation system assesses both **text content** (grant application sections) and **JSON outputs** (objectives, relationships, CFP analysis) using an intelligent two-phase approach:

**Phase 1 - NLP Evaluation**: Deterministic metrics using NLP techniques, domain vocabularies, and structural analysis (200-500ms, $0 cost)

**Phase 2 - LLM Evaluation**: Criteria-based scoring with iterative feedback loops (5-30s, ~$0.01-0.05 per evaluation)

The system automatically routes between phases based on confidence thresholds, minimizing LLM usage while maintaining quality standards.

## Entry Point

`with_evaluation()` is the single evaluation function used throughout the codebase:

```python
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.evaluation_criteria import get_evaluation_kwargs

result = await with_evaluation(
    prompt_identifier="section_generation",
    prompt_handler=generate_section_text,
    prompt=compressed_prompt,
    trace_id=trace_id,
    **get_evaluation_kwargs(
        "generate_section_text",
        job_manager,
        section_config=section,           # Enables NLP evaluation
        rag_context=rag_documents,        # Required for grounding checks
        research_objectives=objectives,   # For alignment scoring
        cfp_analysis=cfp_data,            # Optional CFP context
    ),
)
```

## How It Works

### Automatic Routing

1. **Generate content** via `prompt_handler`
2. **NLP Evaluation** (if `section_config` provided and enabled):
   - Run 5 parallel NLP metrics (structure, grounding, quality, coherence, scientific)
   - Calculate overall score (0-100) and confidence (0-1)
   - Decision logic:
     - **High confidence (≥0.8) + good score (≥85)** → Accept immediately, skip LLM
     - **Low score (<60)** → Generate feedback and retry
     - **Uncertain (60-85 score)** → Continue to LLM evaluation
3. **LLM Evaluation** (for borderline cases):
   - Score against evaluation criteria
   - If failing → Combine NLP + LLM feedback for targeted improvement
   - Retry with decreasing passing score threshold

### Configuration

```python
from services.rag.src.utils.evaluation.context_builder import (
    build_evaluation_context,
    build_evaluation_settings,
)

# Build context from available data
context = build_evaluation_context(
    section_config=section,
    rag_context=documents,
    research_objectives=objectives,
    cfp_analysis=cfp_analysis,
)

# Configure evaluation behavior
settings = build_evaluation_settings(
    enable_nlp_evaluation=True,           # Default: True
    force_llm_evaluation=False,           # Set True to skip NLP eval
    is_clinical_trial=True,               # Raises quality thresholds
    is_detailed_research_plan=True,       # Higher standards
    is_json_content=False,                # Different thresholds for JSON
)

result = await with_evaluation(
    prompt_identifier="section_generation",
    prompt_handler=generate_content,
    prompt=prompt,
    criteria=criteria,
    trace_id=trace_id,
    context=context,
    settings=settings,
)
```

##NLP Evaluation Components

### Text Content (Scientific Sections)

**Function**: `evaluate_scientific_content()` in `pipeline.py`

**Runs 5 parallel evaluations**:

1. **Structural Metrics** (`text/structure.py`)
   - Word count compliance with section requirements
   - Paragraph distribution and density
   - Section organization and logical flow
   - Academic formatting standards
   - Header hierarchy validation

2. **Source Grounding** (`text/grounding.py`)
   - ROUGE-L, ROUGE-2, ROUGE-3 scores vs RAG context
   - N-gram overlap (1-4 grams) with source documents
   - Keyword coverage from section configuration
   - Search query integration
   - Context citation density

3. **Scientific Quality** (`text/quality.py`)
   - Scientific term density (biomedical vocabulary)
   - Domain vocabulary accuracy
   - Methodology language detection
   - Academic register assessment
   - Technical precision
   - Evidence-based claims ratio
   - Hypothesis-methodology alignment

4. **Coherence** (`text/coherence.py`)
   - Local coherence (sentence-to-sentence transitions)
   - Global coherence (document-level argument flow)
   - Lexical diversity
   - Transition quality between ideas
   - Argument flow consistency
   - Paragraph unity
   - Repetition penalty

5. **Scientific Analysis** (`text/scientific.py`)
   - Domain similarity (concept overlap with reference corpus)
   - Methodology completeness
   - Innovation indicators
   - Field alignment
   - Concept sophistication

**Output**:
```python
EvaluationResult(
    overall_score=82.5,              # 0-100 weighted score
    confidence_score=0.87,           # 0-1 confidence in assessment
    recommendation="accept",         # "accept" | "llm_review" | "reject"
    detailed_feedback=[              # Specific improvement suggestions
        "Source Grounding: Strong performance (87/100)",
        "Scientific Quality: Excellent (92/100)",
    ],
    evaluation_path="nlp_only",      # Which path was taken
    # Detailed metrics for all 5 dimensions
    structural_metrics=...,
    grounding_metrics=...,
    quality_metrics=...,
    coherence_metrics=...,
    scientific_analysis=...,
)
```

### JSON Content (Structured Outputs)

**Function**: `evaluate_json_content()` in `json_evaluator.py`

**Auto-detects content type**:
- Research objectives → Check for `research_tasks` field
- Relationships → Check for dict of relationship tuples
- Enrichment → Check for `enriched_objective` or `core_scientific_terms`
- CFP analysis → Check for `cfp_analysis` or `required_sections`

**Specialized evaluators** (`json/*.py`):

1. **Objectives** - Scientific rigor, innovation, coherence, comprehensiveness, keyword alignment
2. **Relationships** - Validity, coverage, diversity, description quality, bidirectionality
3. **Enrichment** - Value added, term relevance, question utility, context depth, search query quality
4. **CFP Analysis** - Requirement clarity, quote accuracy, completeness, categorization

## Evaluation Settings

```python
class EvaluationSettings(TypedDict):
    enable_nlp_evaluation: bool        # Use NLP evaluation first (default: True)
    nlp_confidence_threshold: float    # Accept if confidence ≥ this (default: 0.8)
    nlp_accept_threshold: float        # Accept if score ≥ this (default: 85.0)
    nlp_review_threshold: float        # LLM review if score ≥ this (default: 70.0)
    force_llm_evaluation: bool         # Skip NLP, go straight to LLM (default: False)
    llm_timeout: float                 # Timeout for LLM calls (default: 60.0s)
    nlp_weight: float                  # Weight for NLP score if both used (default: 0.3)
    llm_weight: float                  # Weight for LLM score if both used (default: 0.7)
```

### Content-Specific Thresholds

**Clinical Trials** (highest standards):
```python
settings = build_evaluation_settings(is_clinical_trial=True)
# nlp_confidence_threshold=0.85, nlp_accept_threshold=90.0
```

**Detailed Research Plans**:
```python
settings = build_evaluation_settings(is_detailed_research_plan=True)
# nlp_confidence_threshold=0.8, nlp_accept_threshold=85.0
```

**JSON Content** (structural focus):
```python
settings = build_evaluation_settings(is_json_content=True)
# json_confidence_threshold=0.95, nlp_weight=0.5, llm_weight=0.5
```

## Quality Standards

### Component Requirements

Content must meet minimum scores for critical components:

```python
DEFAULT_THRESHOLDS = {
    "accept_threshold": 85.0,
    "llm_review_threshold": 65.0,
    "component_weights": {
        "structural": 0.15,
        "grounding": 0.25,      # Heavily weighted
        "quality": 0.30,        # Most important
        "coherence": 0.20,
        "scientific": 0.10,
    },
    "minimum_component_scores": {
        "quality": 70.0,        # Must exceed 70
        "grounding": 60.0,      # Must exceed 60
        "coherence": 65.0,      # Must exceed 65
        "structural": 60.0,     # Must exceed 60
    },
}
```

**Rejection logic**:
- If `quality` score < 70 → Reject (most critical)
- If 2+ components fail minimums → Reject
- If 1 component fails minimum → LLM review

### MISSING INFORMATION Handling

The system rewards proper use of `MISSING INFORMATION` format when data is unavailable (prevents hallucination):

```python
# Correct usage:
content = """
The methodology involves MISSING INFORMATION systematic analysis...
Clinical validation: MISSING INFORMATION demonstrates efficacy.
"""

# Bonus: Up to +5 points for proper usage
```

## Performance Characteristics

### NLP Evaluation

- **Latency**: 200-500ms (typical 500-1000 word section)
- **Parallelism**: 5 async tasks run concurrently
- **Cost**: $0 (CPU-only)
- **Deterministic**: Same input → same output
- **Decision Rate**: ~70-80% of content gets decided (accept/reject)

### LLM Evaluation

- **Latency**: 5-30s (varies by content length and criteria count)
- **Cost**: ~$0.01-0.05 per evaluation (varies by model)
- **Adaptive**: Learns from feedback
- **Stochastic**: May vary between runs
- **Usage Rate**: Only ~20-30% of content needs LLM review

### Cost Savings Example

**Before** (LLM-only):
- 100 sections × $0.03/eval = $3.00
- 100 sections × 15s = 25 minutes

**After** (NLP→LLM routing):
- 70 sections accepted by NLP = $0.00
- 10 sections rejected by NLP = $0.00
- 20 sections need LLM × $0.03 = $0.60
- (70 × 0.4s) + (10 × 0.4s) + (20 × 15s) = 5.3 minutes

**Savings: 80% cost reduction, 79% time reduction**

### Decision Flow

```
100 sections
    │
    ├─► 70% High Confidence Accept (score ≥85, confidence ≥0.8)
    │   └─ Return immediately → $0, 0.4s each
    │
    ├─► 10% Clear Reject (score <60)
    │   └─ Retry with NLP feedback → $0, 0.4s each
    │
    └─► 20% Uncertain (60 ≤ score <85)
        └─ LLM evaluation → $0.03, 15s each
```

## LLM Evaluation (Phase 2)

### Criteria-Based Scoring

```python
from services.rag.src.utils.evaluation import EvaluationCriterion

criteria = [
    EvaluationCriterion(
        name="Scientific Accuracy",
        evaluation_instructions="""
        - Verify precise, field-specific terminology
        - Ensure no hallucinated facts
        - Check scientific concepts are correct
        """,
        weight=1.0,
    ),
    EvaluationCriterion(
        name="Source Grounding",
        evaluation_instructions="""
        - Content grounded in provided sources
        - No information beyond available context
        """,
        weight=0.8,
    ),
]
```

### Iterative Feedback Loop

```python
result = await with_evaluation(
    criteria=criteria,
    passing_score=100,          # Start at 100
    retries=4,                  # Max 4 attempts
    increment=2.5,              # Reduce by 2.5 each retry
    prompt_handler=generate_fn,
)
```

**Process**:
1. Generate content
2. Evaluate against criteria
3. If failing criteria → Generate improvement instructions (combining NLP + LLM feedback)
4. Retry with feedback (max 4 times)
5. Reduce passing score by 2.5 each iteration (100 → 97.5 → 95 → 92.5)
6. Return when all criteria pass or retries exhausted

## Testing

### Unit Tests

Test individual NLP metric functions:

```bash
# Structural metrics
PYTHONPATH=. uv run pytest tests/utils/evaluation/unit/structural_test.py -v

# Quality metrics
PYTHONPATH=. uv run pytest tests/utils/evaluation/unit/quality_test.py -v

# JSON evaluators
PYTHONPATH=. uv run pytest tests/utils/evaluation/unit/json_enrichment_test.py -v
```

### Integration Tests

Test component interactions:

```bash
# NLP evaluation pipeline
PYTHONPATH=. uv run pytest tests/utils/evaluation/integration/pipeline_integration_test.py -v

# JSON evaluation routing
PYTHONPATH=. uv run pytest tests/utils/evaluation/integration/json_evaluation_integration_test.py -v
```

### E2E Tests

Test complete workflows:

```bash
# Full evaluation workflow
PYTHONPATH=. uv run pytest tests/utils/evaluation/e2e/evaluation_workflow_test.py -v
```

## Stage Configurations

Predefined evaluation configs for each pipeline stage:

```python
from services.rag.src.evaluation_criteria import STAGE_CONFIGS

# Text generation
STAGE_CONFIGS["generate_section_text"]
# Criteria: Content Depth (1.0), Structural Completeness (0.95),
#           Context Integration (0.85), RAG Integration (0.85),
#           Academic Quality (0.8), Feasibility (0.75)

# JSON extraction
STAGE_CONFIGS["extract_relationships"]
# Criteria: Relationship Coherence (0.9), Scientific Accuracy (1.0),
#           Source Grounding (0.8), Completeness (0.8), Strategic Value (0.7)
```

## Evaluation Context

Always provide maximum context for accurate evaluation:

```python
context = build_evaluation_context(
    section_config=section,              # Keywords, topics, max_words
    rag_context=documents,               # Source material for grounding
    research_objectives=objectives,      # For alignment scoring
    cfp_analysis=cfp_data,               # CFP requirements
    reference_corpus=["example text"],   # Optional: previous high-quality text
)
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│               with_evaluation() - Single Entry Point          │
│                  (llm/evaluation.py:979)                      │
└────┬─────────────────────────────────────────────────────────┘
     │
     ├─► Generate Content (prompt_handler)
     │
     ├─► Phase 1: NLP Evaluation (if enabled & has context)
     │   ├─ Run CPU-based NLP metrics (5 parallel tasks)
     │   ├─ Calculate overall score + confidence
     │   └─ Decision:
     │       ├─ High confidence + good score → Accept (skip LLM)
     │       ├─ Low score (<60%) → Reject + retry with feedback
     │       └─ Uncertain → Continue to Phase 2
     │
     └─► Phase 2: LLM Evaluation (criteria-based)
         ├─ Score against evaluation criteria
         ├─ If failing → Combine NLP + LLM feedback
         └─ Retry with targeted improvements

┌──────────────────────────────────────────────────────────────┐
│          NLP Evaluation Components (Phase 1)                  │
└─────────────────┬────────────────────────────────────────────┘
                  │
      ┌───────────┴──────────┐
      │                      │
  ┌───▼────────┐    ┌───────▼────────┐
  │Text Pipeline│    │JSON Evaluators │
  │(pipeline.py)│    │  (json/*.py)   │
  │- Structure  │    │- Objectives    │
  │- Grounding  │    │- Relationships │
  │- Quality    │    │- Enrichment    │
  │- Coherence  │    │- CFP Analysis  │
  │- Scientific │    │                │
  └─────────────┘    └────────────────┘
```

## Key Files

- `llm/evaluation.py` - Unified `with_evaluation()` entry point
- `pipeline.py` - NLP text evaluation orchestration
- `json_evaluator.py` - JSON content evaluation router
- `dto.py` - All TypedDict definitions for type safety
- `constants.py` - Default thresholds and settings
- `context_builder.py` - Helper functions for building context/settings
- `quality_standards.py` - Quality checks (MISSING INFO, thresholds)
- `text/*.py` - Individual text metric evaluators
- `json/*.py` - Specialized JSON evaluators

## Design Principles

1. **Single Entry Point**: All evaluation flows through `with_evaluation()`
2. **NLP First**: Try deterministic evaluation before expensive LLM calls
3. **Confidence-Based Routing**: Only use LLM when NLP lacks confidence
4. **Scientific Focus**: Metrics tailored for biomedical/scientific grant writing
5. **Type Safe**: Comprehensive TypedDict usage with proper generics
6. **Testable**: Clean separation of concerns, unit-testable metrics
7. **Context-Aware**: Pass maximum context for accurate evaluation
8. **Cost-Conscious**: Minimize LLM usage without sacrificing quality