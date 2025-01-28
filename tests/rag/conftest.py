from typing import Any
from uuid import UUID

import pytest

from src.db.json_objects import GrantSection
from tests.factories import GrantSectionFactory

GRANT_APPLICATION_ID = UUID("43b4aed5-8549-461f-9290-5ee9a630ac9a")


@pytest.fixture
def grant_sections() -> list[GrantSection]:
    return [
        GrantSectionFactory.build(
            name="abstract",
            title="Abstract",
            order=1,
            is_research_plan=False,
            keywords=[
                "research goals",
                "objectives",
                "impact",
                "melanoma",
                "treatment",
                "diagnosis",
                "prevention",
            ],
            topics=["project_summary", "technical_abstract"],
            generation_instructions="Provide a concise summary of the proposed research project, including the project's goals, objectives, and significance. The abstract should be written in a clear and accessible style, as it will be read by a broad audience of scientists and administrators.",
            depends_on=["research_strategy"],
            max_words=285,
            search_queries=[
                "melanoma research objectives methodology impact",
                "project goals innovation significance melanoma",
                "technical approach outcomes melanoma research",
                "melanoma detection diagnosis treatment",
                "melanoma prevention research",
                "melanoma immunotherapy",
                "melanoma biomarker discovery",
                "melanoma clinical trials",
            ],
        ),
        GrantSectionFactory.build(
            name="research_strategy",
            title="Research Strategy",
            parent_id="narrative",
            order=2,
            is_research_plan=True,
            keywords=[
                "methodology",
                "experimental design",
                "data analysis",
                "melanoma",
                "immunotherapy",
                "targeted therapy",
                "biomarkers",
            ],
            topics=[
                "background_context",
                "hypothesis",
                "methodology",
                "expected_outcomes",
                "research_objectives",
            ],
            generation_instructions="Describe the overall research strategy, methodology, and analyses to be used to accomplish the specific aims of the project. Discuss potential problems and alternative strategies.",
            depends_on=[],
            max_words=1806,
            search_queries=[
                "melanoma research methodology experimental design protocols",
                "data collection analysis methods melanoma",
                "melanoma experimental approach techniques",
                "research strategy implementation melanoma",
                "melanoma immunotherapy research",
                "melanoma targeted therapy research",
                "melanoma biomarker discovery research",
                "melanoma clinical trial design",
            ],
        ),
        GrantSectionFactory.build(
            name="preliminary_results",
            title="Preliminary Results",
            parent_id="research_strategy",
            order=1,
            is_research_plan=False,
            keywords=[
                "data",
                "analysis",
                "interpretation",
                "melanoma",
                "research",
                "findings",
            ],
            topics=["preliminary_data", "research_feasibility"],
            generation_instructions="Present any preliminary data that is relevant to the proposed research project. Discuss the significance of the data and how it supports the feasibility of the project.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma preliminary data results analysis",
                "research feasibility interpretation melanoma",
                "data significance relevance melanoma",
                "melanoma research findings",
                "melanoma preliminary experimental data",
            ],
        ),
        GrantSectionFactory.build(
            name="risks_and_mitigations",
            title="Risks and Mitigations",
            parent_id="narrative",
            order=3,
            is_research_plan=False,
            keywords=[
                "risk assessment",
                "contingency plan",
                "mitigation strategies",
                "melanoma",
                "research",
            ],
            topics=["risks_and_mitigations", "research_feasibility"],
            generation_instructions="Describe potential risks associated with the proposed research project, and explain the proposed mitigation strategies to address these risks.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma research risks assessment",
                "contingency planning research melanoma",
                "mitigation strategies in melanoma research",
                "challenges in melanoma research",
                "feasibility of melanoma research",
            ],
        ),
        GrantSectionFactory.build(
            name="impact",
            title="Potential Impact",
            parent_id="narrative",
            order=4,
            is_research_plan=False,
            keywords=[
                "clinical impact",
                "translational research",
                "melanoma",
                "treatment",
                "diagnosis",
                "prevention",
            ],
            topics=["impact", "knowledge_translation"],
            generation_instructions="Describe the potential clinical and translational impact of the proposed research project. Explain how the project could improve the lives of patients with melanoma.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma clinical impact research",
                "translational research in melanoma",
                "melanoma treatment improvements",
                "melanoma diagnosis and detection",
                "melanoma prevention strategies",
            ],
        ),
    ]


@pytest.fixture
def grant_template_data(grant_sections: list[GrantSection]) -> dict[str, Any]:
    return {
        "grant_sections": grant_sections,
        "grant_application_id": str(GRANT_APPLICATION_ID),
        "funding_organization_id": None,
    }
