"""Debug test to check prompt sizes."""

from packages.db.src.json_objects import ResearchObjective
from services.rag.src.grant_application.batch_enrich_objectives import BATCH_ENRICH_OBJECTIVES_USER_PROMPT


def estimate_prompt_size(objectives: list[ResearchObjective]) -> dict:
    """Estimate the size of the prompt for batch enrichment."""


    objectives_text = "\n\n".join([
        f"Objective {obj['number']}: {obj['title']}\nTasks: {obj['research_tasks']}"
        for obj in objectives
    ])


    mock_keywords = ["melanoma", "immunotherapy", "resistance", "biomarkers", "treatment"]
    mock_topics = ["cancer research", "precision medicine", "translational oncology"]
    mock_form_inputs = {
        "project_title": "Comprehensive Melanoma Research Project",
        "project_summary": "A detailed study of melanoma progression and treatment resistance mechanisms"
    }


    prompt = BATCH_ENRICH_OBJECTIVES_USER_PROMPT.substitute(
        objectives_and_tasks=objectives_text,
        keywords=mock_keywords,
        topics=mock_topics,
        form_inputs=mock_form_inputs,
    )


    mock_rag_results = "Mock retrieval results with research papers..." * 10
    full_prompt = prompt.to_string(rag_results=mock_rag_results)


    return {
        "objectives_count": len(objectives),
        "objectives_text_length": len(objectives_text),
        "prompt_template_length": len(str(prompt)),
        "full_prompt_length": len(full_prompt),
        "estimated_tokens": len(full_prompt) // 4,
        "size_kb": len(full_prompt) / 1024,
    }




test_cases = [

    [{
        "number": 1,
        "title": "Investigate melanoma immunotherapy resistance",
        "research_tasks": [
            {"number": 1, "title": "Analyze tumor microenvironment"},
            {"number": 2, "title": "Profile immune checkpoints"},
        ]
    }],

    [
        {
            "number": 1,
            "title": "Investigate melanoma immunotherapy resistance",
            "research_tasks": [
                {"number": 1, "title": "Analyze tumor microenvironment"},
                {"number": 2, "title": "Profile immune checkpoints"},
            ]
        },
        {
            "number": 2,
            "title": "Develop combination therapies",
            "research_tasks": [
                {"number": 1, "title": "Test drug synergies"},
                {"number": 2, "title": "Validate in models"},
            ]
        }
    ],

    [
        {
            "number": i,
            "title": f"Research Objective {i}: " + ["Investigate resistance mechanisms", "Develop new therapies", "Identify biomarkers"][i-1],
            "research_tasks": [
                {"number": j, "title": f"Task {i}.{j}: " + ["Molecular analysis", "Functional validation"][j-1]}
                for j in range(1, 3)
            ]
        }
        for i in range(1, 4)
    ],

    [
        {
            "number": i,
            "title": f"Research Objective {i}: Complex melanoma research objective with detailed description",
            "research_tasks": [
                {"number": j, "title": f"Task {i}.{j}: Detailed research task requiring extensive analysis"}
                for j in range(1, 4)
            ]
        }
        for i in range(1, 7)
    ]
]


for objectives in test_cases:
    results = estimate_prompt_size(objectives)
