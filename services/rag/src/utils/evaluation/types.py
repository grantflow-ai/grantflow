"""Type aliases for the evaluation system."""

from typing import Literal

# Common type aliases used across evaluation modules
RecommendationType = Literal["accept", "llm_review", "reject"]
EvaluationPathType = Literal["fast_only", "fast_with_llm_fallback", "llm_only", "error"]
