import time
from statistics import mean, median

import pytest

from services.rag.src.grant_template.nlp_categorizer import categorize_text_async


@pytest.fixture
def sample_cfp_texts() -> list[str]:
    return [
        "The application must not exceed 10 pages and include a budget of $50,000. Deadline is March 15, 2025.",
        "Applications will be evaluated based on innovation, feasibility, and impact. Please provide references.",
        "Collaborative proposals are not allowed. You must submit detailed research plans with timelines.",
        "Budget limitations: maximum $100,000. Applications should include CVs of all investigators.",
        "Review criteria include scientific merit, methodology, and potential for breakthrough discoveries.",
    ]


@pytest.mark.asyncio
async def test_nlp_categorization_performance_benchmark(sample_cfp_texts: list[str]) -> None:
    times = []
    accuracy_scores = []

    for text in sample_cfp_texts:
        start_time = time.perf_counter()
        result = await categorize_text_async(text)
        end_time = time.perf_counter()

        processing_time = end_time - start_time
        times.append(processing_time)

        total_categories = sum(len(sentences) for sentences in result.values())
        accuracy_scores.append(total_categories)

    avg_time = mean(times)
    median(times)
    max_time = max(times)
    avg_accuracy = mean(accuracy_scores)

    assert avg_time < 0.5, f"Average processing time {avg_time:.3f}s too slow"
    assert max_time < 1.0, f"Max processing time {max_time:.3f}s too slow"
    assert avg_accuracy > 0, f"No categories detected on average: {avg_accuracy}"


@pytest.mark.asyncio
async def test_nlp_categorization_accuracy_benchmark() -> None:
    test_cases = [
        ("Budget must not exceed $50,000", {"money": 1}),
        ("Deadline is March 15, 2025", {"date_time": 1}),
        ("You must include detailed plans", {"orders": 1}),
        ("Applications will be evaluated on merit", {"evaluation_criteria": 1}),
        ("Collaborative work is not allowed", {"negative_instructions": 1}),
    ]

    accuracy_count = 0
    total_tests = len(test_cases)

    for text, expected_categories in test_cases:
        result = await categorize_text_async(text)

        for category, expected_count in expected_categories.items():
            actual_count = len(result.get(category, []))
            if actual_count >= expected_count:
                accuracy_count += 1

    accuracy_rate = accuracy_count / total_tests

    assert accuracy_rate >= 0.8, f"Accuracy rate {accuracy_rate:.2f} below threshold"


def test_nlp_categorizer_memory_efficiency() -> None:
    import sys

    from services.rag.src.grant_template.nlp_categorizer import get_nlp_categorizer_status

    initial_modules = len(sys.modules)
    status = get_nlp_categorizer_status()
    final_modules = len(sys.modules)

    module_growth = final_modules - initial_modules

    assert status["spacy_model_loaded"], "spaCy model should be loaded"
    assert module_growth < 10, f"Too many modules loaded: {module_growth}"
