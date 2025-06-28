"""
TTL-aware LRU cache utility using functional programming.
Provides a decorator for adding time-based expiration to Python's lru_cache.
"""

import time
from functools import lru_cache, wraps
from typing import Any, Callable, TypeVar

from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


_cache_timestamps: dict[tuple[Callable, tuple, frozenset], float] = {}


def ttl_lru_cache(
    maxsize: int = 128,
    ttl_seconds: int = 300,
    typed: bool = False,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator that combines LRU cache with TTL (time-to-live) functionality.

    Args:
        maxsize: Maximum size of cache (default: 128)
        ttl_seconds: Time-to-live in seconds (default: 300)
        typed: If True, arguments of different types will be cached separately

    Example:
        @ttl_lru_cache(maxsize=100, ttl_seconds=600)
        async def expensive_operation(param: str) -> dict:
            # Expensive operation here
            return result
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        cached_func = lru_cache(maxsize=maxsize, typed=typed)(func)

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            hashable_args = tuple(
                str(arg)
                if not isinstance(arg, (str, int, float, bool, type(None)))
                else arg
                for arg in args
            )
            hashable_kwargs = frozenset(
                (
                    k,
                    str(v)
                    if not isinstance(v, (str, int, float, bool, type(None)))
                    else v,
                )
                for k, v in kwargs.items()
            )
            cache_key = (func, hashable_args, hashable_kwargs)
            current_time = time.time()

            if cache_key in _cache_timestamps:
                cache_age = current_time - _cache_timestamps[cache_key]
                if cache_age >= ttl_seconds:
                    logger.debug(
                        "Cache entry expired",
                        function=func.__name__,
                        age_seconds=round(cache_age, 2),
                        ttl_seconds=ttl_seconds,
                    )

                    cached_func.cache_clear()
                    _cache_timestamps.clear()

            try:
                result = await cached_func(*args, **kwargs)

                if cache_key not in _cache_timestamps:
                    _cache_timestamps[cache_key] = current_time

                cache_info = cached_func.cache_info()
                if cache_info.hits > 0:
                    logger.debug(
                        "Cache hit",
                        function=func.__name__,
                        hits=cache_info.hits,
                        misses=cache_info.misses,
                        cache_size=cache_info.currsize,
                    )

                return result
            except Exception:
                cached_func.cache_clear()
                _cache_timestamps.clear()
                result = await func(*args, **kwargs)
                _cache_timestamps[cache_key] = current_time
                return result

        wrapper.cache_clear = lambda: (
            cached_func.cache_clear(),
            _cache_timestamps.clear(),
        )
        wrapper.cache_info = cached_func.cache_info

        return wrapper

    return decorator


def create_content_hash(*args: Any, **kwargs: Any) -> str:
    """
    Create a stable hash from function arguments for cache key generation.

    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        A stable hash string
    """
    import hashlib
    import json

    key_data = {
        "args": [str(arg) for arg in args],
        "kwargs": {k: str(v) for k, v in sorted(kwargs.items())},
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.sha256(key_str.encode()).hexdigest()[:16]


def cached_with_ttl(
    func: Callable[..., T],
    ttl_seconds: int = 300,
    cache_key: str | None = None,
) -> Callable[..., T]:
    """
    Create a cached version of a function with TTL.

    Args:
        func: The function to cache
        ttl_seconds: Time-to-live in seconds
        cache_key: Optional custom cache key prefix

    Returns:
        A cached version of the function
    """

    cache_storage: dict[str, tuple[Any, float]] = {}

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> T:
        key_parts = [cache_key] if cache_key else [func.__name__]
        key_parts.append(create_content_hash(*args, **kwargs))
        full_key = ":".join(key_parts)

        current_time = time.time()

        if full_key in cache_storage:
            result, timestamp = cache_storage[full_key]
            if current_time - timestamp < ttl_seconds:
                logger.debug(
                    "TTL cache hit",
                    function=func.__name__,
                    key=full_key[:20],
                    age_seconds=round(current_time - timestamp, 2),
                )
                return result
            else:
                del cache_storage[full_key]

        logger.debug(
            "TTL cache miss",
            function=func.__name__,
            key=full_key[:20],
        )

        result = await func(*args, **kwargs)
        cache_storage[full_key] = (result, current_time)

        return result

    wrapper.cache_clear = lambda: cache_storage.clear()
    wrapper.cache_size = lambda: len(cache_storage)

    return wrapper
