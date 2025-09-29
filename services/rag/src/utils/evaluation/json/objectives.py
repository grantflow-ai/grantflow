"""Evaluation functions for research objectives quality."""

from typing import TYPE_CHECKING

from packages.db.src.json_objects import ResearchObjective

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import ObjectiveQualityMetrics


def evaluate_objectives_quality(objectives: list[ResearchObjective]) -> "ObjectiveQualityMetrics":
    """Evaluate the quality of research objectives.

    Args:
        objectives: List of research objectives to evaluate

    Returns:
        Quality metrics for the objectives
    """
    if not objectives:
        return {
            "overall": 0.0,
            "scientific_rigor": 0.0,
            "innovation_score": 0.0,
            "coherence": 0.0,
            "comprehensiveness": 0.0,
            "keyword_alignment": 0.0,
        }

    # Evaluate scientific rigor
    scientific_rigor = _evaluate_scientific_rigor(objectives)

    # Evaluate innovation
    innovation_score = _evaluate_innovation(objectives)

    # Evaluate coherence between objectives
    coherence = _evaluate_objectives_coherence(objectives)

    # Evaluate comprehensiveness
    comprehensiveness = _evaluate_comprehensiveness(objectives)

    # For now, keyword alignment would need keywords to compare against
    keyword_alignment = 0.7  # Placeholder - would need section keywords

    # Calculate overall score
    overall = (
        scientific_rigor * 0.25
        + innovation_score * 0.20
        + coherence * 0.20
        + comprehensiveness * 0.20
        + keyword_alignment * 0.15
    )

    return {
        "overall": overall,
        "scientific_rigor": scientific_rigor,
        "innovation_score": innovation_score,
        "coherence": coherence,
        "comprehensiveness": comprehensiveness,
        "keyword_alignment": keyword_alignment,
    }


def _evaluate_scientific_rigor(objectives: list[ResearchObjective]) -> float:
    """Evaluate scientific rigor of objectives."""
    rigor_score = 0.0

    for obj in objectives:
        # Check if objective has clear title
        if obj.get("title") and len(obj["title"]) > 10:
            rigor_score += 0.2

        # Check if objective has description
        if obj.get("description") and len(obj.get("description", "")) > 50:
            rigor_score += 0.3

        # Check research tasks
        tasks = obj.get("research_tasks", [])
        if tasks:
            # Tasks should be well-defined
            valid_tasks = sum(1 for task in tasks if task.get("title") and len(task.get("title", "")) > 10)
            task_score = valid_tasks / len(tasks) if tasks else 0
            rigor_score += task_score * 0.5

    return min(1.0, rigor_score / len(objectives)) if objectives else 0.0


def _evaluate_innovation(objectives: list[ResearchObjective]) -> float:
    """Evaluate innovation in objectives."""
    innovation_keywords = {
        "novel",
        "innovative",
        "breakthrough",
        "pioneering",
        "cutting-edge",
        "transformative",
        "paradigm",
        "first",
        "unique",
        "unprecedented",
        "advanced",
        "state-of-the-art",
        "next-generation",
    }

    innovation_score = 0.0

    for obj in objectives:
        text = f"{obj.get('title', '')} {obj.get('description', '')}".lower()

        # Check for innovation keywords
        keyword_count = sum(1 for keyword in innovation_keywords if keyword in text)
        if keyword_count > 0:
            innovation_score += min(0.5, keyword_count * 0.1)

        # Check for methodological innovation in tasks
        for task in obj.get("research_tasks", []):
            task_text = f"{task.get('title', '')} {task.get('description', '')}".lower()
            if any(keyword in task_text for keyword in innovation_keywords):
                innovation_score += 0.1

    return min(1.0, innovation_score / len(objectives)) if objectives else 0.0


def _evaluate_objectives_coherence(objectives: list[ResearchObjective]) -> float:
    """Evaluate coherence between objectives."""
    if len(objectives) < 2:
        return 1.0  # Single objective is inherently coherent

    coherence_score = 0.0

    # Check if objectives are numbered sequentially
    expected_numbers = list(range(1, len(objectives) + 1))
    actual_numbers = [obj.get("number", 0) for obj in objectives]
    if actual_numbers == expected_numbers:
        coherence_score += 0.3

    # Check for logical progression (each objective builds on previous)
    for i in range(1, len(objectives)):
        prev_obj = objectives[i - 1]
        curr_obj = objectives[i]

        # Simple check: later objectives should have more tasks or complexity
        prev_tasks = len(prev_obj.get("research_tasks", []))
        curr_tasks = len(curr_obj.get("research_tasks", []))

        if curr_tasks >= prev_tasks or curr_tasks > 0:
            coherence_score += 0.2

    # Check for thematic consistency
    all_titles = " ".join(obj.get("title", "") for obj in objectives).lower()
    # If there are common themes across objectives
    if len(set(all_titles.split())) < len(all_titles.split()) * 0.7:
        coherence_score += 0.3

    return min(1.0, coherence_score)


def _evaluate_comprehensiveness(objectives: list[ResearchObjective]) -> float:
    """Evaluate comprehensiveness of objectives."""
    if not objectives:
        return 0.0

    comp_score = 0.0

    # Check number of objectives (3-5 is typically good)
    if 3 <= len(objectives) <= 5:
        comp_score += 0.3
    elif 2 <= len(objectives) <= 6:
        comp_score += 0.2

    # Check total number of research tasks
    total_tasks = sum(len(obj.get("research_tasks", [])) for obj in objectives)
    if total_tasks >= 10:
        comp_score += 0.3
    elif total_tasks >= 5:
        comp_score += 0.2

    # Check if all objectives have descriptions
    with_descriptions = sum(1 for obj in objectives if obj.get("description"))
    if with_descriptions == len(objectives):
        comp_score += 0.2

    # Check task distribution (should be relatively balanced)
    task_counts = [len(obj.get("research_tasks", [])) for obj in objectives]
    if task_counts and max(task_counts) <= min(task_counts) * 3:
        comp_score += 0.2

    return min(1.0, comp_score)


def check_objectives_completeness(objectives: list[ResearchObjective]) -> dict[str, bool]:
    """Check completeness of research objectives.

    Returns:
        Dictionary of completeness checks
    """
    return {
        "has_objectives": bool(objectives),
        "all_have_titles": all(obj.get("title") for obj in objectives),
        "all_have_tasks": all(obj.get("research_tasks") for obj in objectives),
        "all_have_descriptions": all(obj.get("description") for obj in objectives),
        "sequential_numbering": _check_sequential_numbering(objectives),
        "minimum_objectives": len(objectives) >= 2,
    }


def _check_sequential_numbering(objectives: list[ResearchObjective]) -> bool:
    """Check if objectives are numbered sequentially."""
    if not objectives:
        return True
    expected = list(range(1, len(objectives) + 1))
    actual = [obj.get("number", 0) for obj in objectives]
    return actual == expected
