from __future__ import annotations

from math import ceil
from typing import TYPE_CHECKING, Final, overload

from services.rag.src.constants import MIN_WORDS_RATIO

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection, LengthConstraint

    from services.rag.src.dto import ResearchComponentGenerationDTO

WORDS_PER_PAGE: Final[int] = 415
AVERAGE_CHARACTERS_PER_WORD: Final[float] = 6.5
DEFAULT_SECTION_MAX_WORDS: Final[int] = 1000
MIN_WORKPLAN_SECTION_WORDS: Final[int] = 150


def constraint_to_word_limit(constraint: LengthConstraint | None) -> int | None:
    if constraint is None:
        return None

    constraint_type = constraint["type"]
    value = constraint["value"]

    if value <= 0:
        return None

    if constraint_type == "words":
        return value

    if constraint_type == "characters":
        return max(1, round(value / AVERAGE_CHARACTERS_PER_WORD))

    raise ValueError(f"Unsupported constraint type: {constraint_type}")


def compute_word_bounds(
    constraint: LengthConstraint | None,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
    min_ratio: float = MIN_WORDS_RATIO,
) -> tuple[int, int]:
    max_words = constraint_to_word_limit(constraint) or default_max_words
    min_words = max(1, int(max_words * min_ratio))
    return min_words, max_words


def create_word_constraint(value: int, source: str | None = None) -> LengthConstraint:
    if value <= 0:
        raise ValueError("Constraint value must be positive")
    return {"type": "words", "value": value, "source": source}


def distribute_constraint_among_components(
    *,
    constraint: LengthConstraint | None,
    component_count: int,
    minimum_words: int = MIN_WORKPLAN_SECTION_WORDS,
) -> LengthConstraint | None:
    if component_count <= 0:
        return None

    total_words = constraint_to_word_limit(constraint)
    if total_words is None:
        # No constraint means each component inherits an unconstrained section
        return None

    per_component = max(minimum_words, ceil(total_words / component_count))
    return create_word_constraint(per_component)


@overload
def get_word_bounds_from_section(
    section: GrantLongFormSection,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
    min_ratio: float = MIN_WORDS_RATIO,
) -> tuple[int, int]: ...


@overload
def get_word_bounds_from_section(
    section: ResearchComponentGenerationDTO,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
    min_ratio: float = MIN_WORDS_RATIO,
) -> tuple[int, int]: ...


def get_word_bounds_from_section(
    section: GrantLongFormSection | ResearchComponentGenerationDTO,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
    min_ratio: float = MIN_WORDS_RATIO,
) -> tuple[int, int]:
    constraint: LengthConstraint | None
    constraint = section.get("length_constraint", None)
    return compute_word_bounds(constraint, default_max_words=default_max_words, min_ratio=min_ratio)


@overload
def get_max_words_from_section(
    section: GrantLongFormSection,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
) -> int: ...


@overload
def get_max_words_from_section(
    section: ResearchComponentGenerationDTO,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
) -> int: ...


def get_max_words_from_section(
    section: GrantLongFormSection | ResearchComponentGenerationDTO,
    *,
    default_max_words: int = DEFAULT_SECTION_MAX_WORDS,
) -> int:
    _, max_words = get_word_bounds_from_section(section, default_max_words=default_max_words)
    return max_words
