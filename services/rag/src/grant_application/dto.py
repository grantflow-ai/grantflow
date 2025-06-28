from typing import Literal, NotRequired, TypedDict

from src.json_objects import GrantLongFormSection, ResearchObjective, ResearchDeepDive


class ResearchComponentGenerationDTO(TypedDict):
    number: str
    title: str
    description: str
    instructions: str
    guiding_questions: list[str]
    search_queries: list[str]
    relationships: list[tuple[str, str]]
    max_words: NotRequired[int]
    type: Literal["task", "objective"]


class EnrichObjectiveInputDTO(TypedDict):
    application_id: str
    grant_section: GrantLongFormSection
    research_objective: ResearchObjective
    form_inputs: ResearchDeepDive
    retrieval_context: str
    keywords: list[str]
    topics: list[str]
