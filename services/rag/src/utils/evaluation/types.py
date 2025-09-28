from typing import Literal

RecommendationType = Literal["accept", "llm_review", "reject"]
EvaluationPathType = Literal["fast_only", "fast_with_llm_fallback", "llm_only", "error"]
