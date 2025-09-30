from typing import TYPE_CHECKING

from packages.db.src.json_objects import ResearchObjective

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import ObjectiveQualityMetrics


def evaluate_objectives_quality(
    objectives: list[ResearchObjective],
    keywords: list[str] | None = None,
    topics: list[str] | None = None,
) -> "ObjectiveQualityMetrics":
    if not objectives:
        return {
            "overall": 0.0,
            "scientific_rigor": 0.0,
            "innovation_score": 0.0,
            "coherence": 0.0,
            "comprehensiveness": 0.0,
            "keyword_alignment": 0.0,
        }

    scientific_rigor = _evaluate_scientific_rigor(objectives)

    innovation_score = _evaluate_innovation(objectives)

    coherence = _evaluate_objectives_coherence(objectives)

    comprehensiveness = _evaluate_comprehensiveness(objectives)

    keyword_alignment = _evaluate_keyword_alignment(objectives, keywords, topics)

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
    rigor_score = 0.0

    for obj in objectives:
        if obj.get("title") and len(obj["title"]) > 10:
            rigor_score += 0.2

        if obj.get("description") and len(obj.get("description", "")) > 50:
            rigor_score += 0.3

        tasks = obj.get("research_tasks", [])
        if tasks:
            valid_tasks = sum(1 for task in tasks if task.get("title") and len(task.get("title", "")) > 10)
            task_score = valid_tasks / len(tasks) if tasks else 0
            rigor_score += task_score * 0.5

    return min(1.0, rigor_score / len(objectives)) if objectives else 0.0


def _evaluate_innovation(objectives: list[ResearchObjective]) -> float:
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

        keyword_count = sum(1 for keyword in innovation_keywords if keyword in text)
        if keyword_count > 0:
            innovation_score += min(0.5, keyword_count * 0.1)

        for task in obj.get("research_tasks", []):
            task_text = f"{task.get('title', '')} {task.get('description', '')}".lower()
            if any(keyword in task_text for keyword in innovation_keywords):
                innovation_score += 0.1

    return min(1.0, innovation_score / len(objectives)) if objectives else 0.0


def _evaluate_objectives_coherence(objectives: list[ResearchObjective]) -> float:
    if len(objectives) < 2:
        return 1.0

    coherence_score = 0.0

    expected_numbers = list(range(1, len(objectives) + 1))
    actual_numbers = [obj.get("number", 0) for obj in objectives]
    if actual_numbers == expected_numbers:
        coherence_score += 0.3

    for i in range(1, len(objectives)):
        prev_obj = objectives[i - 1]
        curr_obj = objectives[i]

        prev_tasks = len(prev_obj.get("research_tasks", []))
        curr_tasks = len(curr_obj.get("research_tasks", []))

        if curr_tasks >= prev_tasks or curr_tasks > 0:
            coherence_score += 0.2

    all_titles = " ".join(obj.get("title", "") for obj in objectives).lower()
    if len(set(all_titles.split())) < len(all_titles.split()) * 0.7:
        coherence_score += 0.3

    return min(1.0, coherence_score)


def _evaluate_keyword_alignment(
    objectives: list[ResearchObjective],
    keywords: list[str] | None,
    topics: list[str] | None,
) -> float:
    if not keywords and not topics:
        return 0.75

    alignment_score = 0.0
    all_terms = []
    if keywords:
        all_terms.extend(keywords)
    if topics:
        all_terms.extend(topics)

    if not all_terms:
        return 0.75

    matched_terms = set()

    for obj in objectives:
        obj_text = (
            f"{obj.get('title', '')} {obj.get('description', '')} "
            f"{' '.join(task.get('title', '') + ' ' + task.get('description', '') for task in obj.get('research_tasks', []))}"
        ).lower()

        for term in all_terms:
            if term.lower() in obj_text:
                matched_terms.add(term.lower())

    alignment_score = len(matched_terms) / len(all_terms) if all_terms else 0.75

    if keywords and len(matched_terms) >= len(keywords) * 0.5:
        alignment_score = min(1.0, alignment_score + 0.15)

    return min(1.0, alignment_score)


def _evaluate_comprehensiveness(objectives: list[ResearchObjective]) -> float:
    if not objectives:
        return 0.0

    comp_score = 0.0

    if 3 <= len(objectives) <= 5:
        comp_score += 0.3
    elif 2 <= len(objectives) <= 6:
        comp_score += 0.2

    total_tasks = sum(len(obj.get("research_tasks", [])) for obj in objectives)
    if total_tasks >= 10:
        comp_score += 0.3
    elif total_tasks >= 5:
        comp_score += 0.2

    with_descriptions = sum(1 for obj in objectives if obj.get("description"))
    if with_descriptions == len(objectives):
        comp_score += 0.2

    task_counts = [len(obj.get("research_tasks", [])) for obj in objectives]
    if task_counts and max(task_counts) <= min(task_counts) * 3:
        comp_score += 0.2

    return min(1.0, comp_score)


def check_objectives_completeness(objectives: list[ResearchObjective]) -> dict[str, bool]:
    return {
        "has_objectives": bool(objectives),
        "all_have_titles": all(obj.get("title") for obj in objectives),
        "all_have_tasks": all(obj.get("research_tasks") for obj in objectives),
        "all_have_descriptions": all(obj.get("description") for obj in objectives),
        "sequential_numbering": _check_sequential_numbering(objectives),
        "minimum_objectives": len(objectives) >= 2,
    }


def _check_sequential_numbering(objectives: list[ResearchObjective]) -> bool:
    if not objectives:
        return True
    expected = list(range(1, len(objectives) + 1))
    actual = [obj.get("number", 0) for obj in objectives]
    return actual == expected
