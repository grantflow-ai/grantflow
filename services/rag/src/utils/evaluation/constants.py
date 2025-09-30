from typing import Final

from services.rag.src.utils.evaluation.dto import EvaluationSettings, EvaluationThresholds

DEFAULT_THRESHOLDS: Final[EvaluationThresholds] = EvaluationThresholds(
    accept_threshold=85.0,
    llm_review_threshold=65.0,
    component_weights={
        "structural": 0.15,
        "grounding": 0.25,
        "quality": 0.30,
        "coherence": 0.20,
        "scientific": 0.10,
    },
    minimum_component_scores={
        "quality": 70.0,
        "grounding": 60.0,
        "coherence": 65.0,
        "structural": 60.0,
    },
)

DEFAULT_SETTINGS: Final[EvaluationSettings] = EvaluationSettings(
    enable_nlp_evaluation=True,
    nlp_confidence_threshold=0.8,
    nlp_accept_threshold=85.0,
    nlp_review_threshold=70.0,
    force_llm_evaluation=False,
    llm_timeout=60.0,
    nlp_weight=0.3,
    llm_weight=0.7,
)

JSON_SETTINGS: Final[EvaluationSettings] = EvaluationSettings(
    enable_nlp_evaluation=True,
    nlp_confidence_threshold=0.85,
    nlp_accept_threshold=80.0,
    nlp_review_threshold=65.0,
    force_llm_evaluation=False,
    llm_timeout=45.0,
    nlp_weight=0.5,
    llm_weight=0.5,
)

CONFIDENCE_THRESHOLDS: Final[dict[str, float]] = {
    "text": 0.8,
    "objectives": 0.85,
    "relationships": 0.9,
    "enrichment": 0.75,
    "cfp_analysis": 0.85,
}

QUALITY_THRESHOLDS: Final[dict[str, float]] = {
    "excellent": 0.80,
    "good": 0.65,
    "acceptable": 0.50,
    "poor": 0.35,
    "unacceptable": 0.0,
}

TARGET_THRESHOLDS: Final[dict[str, float]] = {
    "research_plan": 0.80,
    "clinical_trial": 0.70,
    "general_scientific": 0.65,
    "administrative": 0.60,
}

MINIMAL_THRESHOLD: Final[float] = 0.60

COMPONENT_REQUIREMENTS: Final[dict[str, dict[str, float]]] = {
    "clinical_trial": {
        "quality": 0.70,
        "grounding": 0.65,
        "coherence": 0.60,
        "structural": 0.55,
    },
    "research_plan": {
        "quality": 0.75,
        "grounding": 0.70,
        "coherence": 0.70,
        "structural": 0.65,
    },
    "general_scientific": {
        "quality": 0.60,
        "grounding": 0.55,
        "coherence": 0.55,
        "structural": 0.50,
    },
    "administrative": {
        "quality": 0.45,
        "grounding": 0.40,
        "coherence": 0.50,
        "structural": 0.45,
    },
}

DEFAULT_FEEDBACK_SETTINGS: Final[dict[str, float | int | bool]] = {
    "max_iterations": 2,
    "min_improvement_threshold": 0.05,
    "target_quality_level": 0.80,
    "enable_adaptive_thresholds": False,
    "llm_timeout": 45.0,
}

FAST_EVALUATION_TIMEOUT: Final[float] = 20.0
STANDARD_EVALUATION_TIMEOUT: Final[float] = 45.0
COMPREHENSIVE_EVALUATION_TIMEOUT: Final[float] = 90.0

DEFAULT_CACHE_SIZE: Final[int] = 100
DEFAULT_TTL_SECONDS: Final[float] = 3600.0

EXCELLENT_SCORE_THRESHOLD: Final[int] = 85
MIN_PASSING_SCORE: Final[int] = 40
SCORE_INCREMENT: Final[int] = 10
MAX_RETRIES: Final[int] = 2
