from typing import Final

MAX_RETRIEVAL_TOKENS: Final[int] = 8000
RESEARCH_PLAN_MAX_TOKENS: Final[int] = 6000
MAX_DOCUMENTS_FOR_CONTEXT: Final[int] = 15
RESEARCH_PLAN_MAX_DOCUMENTS: Final[int] = 10
MIN_ANSWER_LENGTH: Final[int] = 50
DOCUMENT_PREVIEW_LENGTH: Final[int] = 300
ANSWER_PREVIEW_LENGTH: Final[int] = 100
TEMPERATURE: Final[float] = 0.7
MIN_WORD_COUNT: Final[int] = 200
MAX_WORD_COUNT: Final[int] = 500

RESEARCH_DEEP_DIVE_FIELD_MAPPING: Final[dict[str, str]] = {
    "background_context": "What is the context and background of your research?",
    "hypothesis": "What is the central hypothesis or key question your research aims to address?",
    "rationale": "Why is this research important and what motivates its pursuit?",
    "novelty_and_innovation": "What makes your approach unique or innovative compared to existing research?",
    "impact": "How will your research contribute to the field and society?",
    "team_excellence": "What makes your team uniquely qualified to carry out this project?",
    "research_feasibility": "What makes your research plan realistic and achievable?",
    "preliminary_data": "Have you obtained any preliminary findings that support your research?",
}

RESEARCH_DEEP_DIVE_SYSTEM_PROMPT: Final[str] = """
You are a specialist in writing comprehensive research answers for grant applications. Your task is to generate detailed, well-structured answers to research questions based on the provided context and research materials.
"""

RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
You are a specialist in creating research plans for grant applications. Your task is to generate well-structured research objectives and tasks based on the provided context and uploaded research materials.
"""
