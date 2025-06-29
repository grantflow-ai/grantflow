"""
Evaluation result caching system for improved performance.

Provides intelligent caching of evaluation results to avoid redundant LLM calls
for similar content and criteria combinations.
"""

import hashlib
import time
from functools import lru_cache
from typing import Any, Final

from packages.shared_utils.src.logger import get_logger

from services.rag.src.utils.llm_evaluation import EvaluationCriterion, EvaluationToolResponse

logger = get_logger(__name__)

# Cache configuration
CACHE_TTL_SECONDS: Final[int] = 3600  # 1 hour TTL
MAX_CACHE_SIZE: Final[int] = 1000     # Maximum cached evaluations
MIN_CONTENT_LENGTH: Final[int] = 50   # Minimum content length to cache


class EvaluationCache:
    """
    LRU cache for evaluation results with TTL and content-based hashing.
    """
    
    def __init__(self, max_size: int = MAX_CACHE_SIZE, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[EvaluationToolResponse, float]] = {}
        self._access_times: dict[str, float] = {}
    
    def _generate_cache_key(
        self, 
        criteria: list[EvaluationCriterion], 
        prompt: str, 
        model_output: str | dict[str, Any]
    ) -> str:
        """
        Generate a deterministic cache key from evaluation inputs.
        
        Args:
            criteria: Evaluation criteria list
            prompt: Evaluation prompt
            model_output: Content to evaluate
            
        Returns:
            SHA-256 hash string for cache key
        """
        # Normalize content to string for consistent hashing
        content_str = str(model_output) if isinstance(model_output, dict) else model_output
        
        # Create criteria signature
        criteria_sig = "|".join([
            f"{c.name}:{c.evaluation_instructions[:100]}:{c.weight}" 
            for c in sorted(criteria, key=lambda x: x.name)
        ])
        
        # Combine all components
        combined_input = f"{criteria_sig}|{prompt[:200]}|{content_str[:1000]}"
        
        # Generate hash
        cache_key = hashlib.sha256(combined_input.encode('utf-8')).hexdigest()[:16]
        
        return cache_key
    
    def _is_cacheable(self, model_output: str | dict[str, Any]) -> bool:
        """
        Determine if content is suitable for caching.
        
        Args:
            model_output: Content to evaluate
            
        Returns:
            True if content should be cached
        """
        content_str = str(model_output) if isinstance(model_output, dict) else model_output
        
        # Only cache substantial content
        if len(content_str) < MIN_CONTENT_LENGTH:
            return False
        
        # Don't cache very dynamic content (timestamps, UUIDs, etc.)
        dynamic_indicators = [
            "timestamp", "uuid", "generated_at", "created_at", 
            "random", "session", "request_id"
        ]
        
        content_lower = content_str.lower()
        if any(indicator in content_lower for indicator in dynamic_indicators):
            return False
        
        return True
    
    def _cleanup_expired(self) -> None:
        """Remove expired cache entries."""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if current_time - timestamp > self.ttl_seconds
        ]
        
        for key in expired_keys:
            del self._cache[key]
            self._access_times.pop(key, None)
        
        if expired_keys:
            logger.debug("Cleaned up %d expired cache entries", len(expired_keys))
    
    def _evict_lru(self) -> None:
        """Evict least recently used entries if cache is full."""
        while len(self._cache) >= self.max_size:
            # Find least recently used key
            lru_key = min(self._access_times.items(), key=lambda x: x[1])[0]
            del self._cache[lru_key]
            del self._access_times[lru_key]
            logger.debug("Evicted LRU cache entry: %s", lru_key[:8])
    
    def get(
        self, 
        criteria: list[EvaluationCriterion], 
        prompt: str, 
        model_output: str | dict[str, Any]
    ) -> EvaluationToolResponse | None:
        """
        Retrieve cached evaluation result if available.
        
        Args:
            criteria: Evaluation criteria
            prompt: Evaluation prompt
            model_output: Content to evaluate
            
        Returns:
            Cached evaluation result or None if not found/expired
        """
        if not self._is_cacheable(model_output):
            return None
        
        cache_key = self._generate_cache_key(criteria, prompt, model_output)
        
        # Cleanup expired entries periodically
        if len(self._cache) % 100 == 0:
            self._cleanup_expired()
        
        if cache_key in self._cache:
            result, timestamp = self._cache[cache_key]
            current_time = time.time()
            
            # Check if entry is still valid
            if current_time - timestamp <= self.ttl_seconds:
                # Update access time for LRU
                self._access_times[cache_key] = current_time
                logger.info(
                    "Cache hit for evaluation",
                    cache_key=cache_key[:8],
                    age_seconds=int(current_time - timestamp),
                    criteria_count=len(criteria)
                )
                return result
            else:
                # Remove expired entry
                del self._cache[cache_key]
                self._access_times.pop(cache_key, None)
        
        return None
    
    def put(
        self, 
        criteria: list[EvaluationCriterion], 
        prompt: str, 
        model_output: str | dict[str, Any],
        result: EvaluationToolResponse
    ) -> None:
        """
        Store evaluation result in cache.
        
        Args:
            criteria: Evaluation criteria
            prompt: Evaluation prompt
            model_output: Content that was evaluated
            result: Evaluation result to cache
        """
        if not self._is_cacheable(model_output):
            return
        
        cache_key = self._generate_cache_key(criteria, prompt, model_output)
        current_time = time.time()
        
        # Evict LRU entries if cache is full
        self._evict_lru()
        
        # Store result with timestamp
        self._cache[cache_key] = (result, current_time)
        self._access_times[cache_key] = current_time
        
        logger.info(
            "Cached evaluation result",
            cache_key=cache_key[:8],
            criteria_count=len(criteria),
            cache_size=len(self._cache)
        )
    
    def clear(self) -> None:
        """Clear all cached entries."""
        cleared_count = len(self._cache)
        self._cache.clear()
        self._access_times.clear()
        logger.info("Cleared evaluation cache", cleared_entries=cleared_count)
    
    def stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        current_time = time.time()
        valid_entries = sum(
            1 for _, timestamp in self._cache.values()
            if current_time - timestamp <= self.ttl_seconds
        )
        
        return {
            "total_entries": len(self._cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self._cache) - valid_entries,
            "max_size": self.max_size,
            "ttl_seconds": self.ttl_seconds,
            "hit_potential": len(self._cache) / self.max_size if self.max_size > 0 else 0
        }


# Global cache instance
_evaluation_cache = EvaluationCache()


@lru_cache(maxsize=500)
def _normalize_criteria_signature(criteria_tuple: tuple[tuple[str, str, float], ...]) -> str:
    """Fast criteria signature generation with LRU caching."""
    return "|".join([f"{name}:{instructions[:50]}:{weight}" for name, instructions, weight in criteria_tuple])


def get_cached_evaluation(
    criteria: list[EvaluationCriterion], 
    prompt: str, 
    model_output: str | dict[str, Any]
) -> EvaluationToolResponse | None:
    """
    Get cached evaluation result if available.
    
    Args:
        criteria: Evaluation criteria
        prompt: Evaluation prompt  
        model_output: Content to evaluate
        
    Returns:
        Cached result or None if not found
    """
    return _evaluation_cache.get(criteria, prompt, model_output)


def cache_evaluation_result(
    criteria: list[EvaluationCriterion], 
    prompt: str, 
    model_output: str | dict[str, Any],
    result: EvaluationToolResponse
) -> None:
    """
    Cache evaluation result for future use.
    
    Args:
        criteria: Evaluation criteria
        prompt: Evaluation prompt
        model_output: Content that was evaluated
        result: Evaluation result to cache
    """
    _evaluation_cache.put(criteria, prompt, model_output, result)


def clear_evaluation_cache() -> None:
    """Clear all cached evaluation results."""
    _evaluation_cache.clear()


def get_cache_stats() -> dict[str, Any]:
    """Get evaluation cache statistics."""
    return _evaluation_cache.stats()


def should_use_cache(criteria_count: int, content_length: int) -> bool:
    """
    Determine if caching should be used for this evaluation.
    
    Args:
        criteria_count: Number of evaluation criteria
        content_length: Length of content to evaluate
        
    Returns:
        True if caching is recommended
    """
    # Use cache for substantial content with multiple criteria
    if content_length >= MIN_CONTENT_LENGTH and criteria_count >= 2:
        return True
    
    # Use cache for very long content even with single criterion
    if content_length >= 500:
        return True
    
    return False