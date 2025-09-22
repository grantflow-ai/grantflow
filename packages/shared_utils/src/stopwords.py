from typing import Final

TRANSITIONAL_STOP_WORDS: Final[set[str]] = {
    "furthermore",
    "moreover",
    "additionally",
    "consequently",
    "therefore",
    "thus",
    "however",
    "nevertheless",
    "nonetheless",
    "meanwhile",
    "specifically",
    "particularly",
    "significantly",
    "importantly",
    "notably",
    "essentially",
    "basically",
    "generally",
    "accordingly",
    "alternatively",
    "similarly",
    "likewise",
    "conversely",
    "subsequently",
}

FREQUENCY_STOP_WORDS: Final[set[str]] = {
    "typically",
    "usually",
    "commonly",
    "frequently",
    "often",
    "sometimes",
    "occasionally",
    "rarely",
    "seldom",
    "always",
    "never",
    "consistently",
    "regularly",
    "systematically",
}

QUANTITATIVE_STOP_WORDS: Final[set[str]] = {
    "various",
    "numerous",
    "several",
    "multiple",
    "different",
    "diverse",
    "wide",
    "broad",
    "comprehensive",
    "extensive",
    "detailed",
    "thorough",
    "complete",
    "full",
    "entire",
    "substantial",
    "considerable",
    "significant",
    "major",
    "minor",
    "primary",
    "secondary",
}

METHODOLOGICAL_STOP_WORDS: Final[set[str]] = {
    "approach",
    "method",
    "technique",
    "strategy",
    "process",
    "procedure",
    "system",
    "framework",
    "structure",
    "mechanism",
    "pathway",
    "means",
    "way",
    "manner",
    "methodological",
    "procedural",
    "strategic",
}

ACADEMIC_FILLER_STOP_WORDS: Final[set[str]] = {
    "aspect",
    "aspects",
    "element",
    "elements",
    "component",
    "components",
    "factor",
    "factors",
    "feature",
    "features",
    "characteristic",
    "characteristics",
    "dimension",
    "dimensions",
    "consideration",
    "considerations",
    "implication",
    "implications",
    "challenge",
    "challenges",
}

GRANT_BUZZWORD_STOP_WORDS: Final[set[str]] = {
    "cutting-edge",
    "state-of-the-art",
    "groundbreaking",
    "pioneering",
    "sophisticated",
    "optimal",
    "efficacious",
    "efficient",
    "effective",
    "successful",
    "promising",
    "potential",
    "feasible",
    "viable",
    "suitable",
    "appropriate",
    "relevant",
    "pertinent",
}

ACADEMIC_STOP_WORDS: Final[set[str]] = (
    TRANSITIONAL_STOP_WORDS
    | FREQUENCY_STOP_WORDS
    | QUANTITATIVE_STOP_WORDS
    | METHODOLOGICAL_STOP_WORDS
    | ACADEMIC_FILLER_STOP_WORDS
    | GRANT_BUZZWORD_STOP_WORDS
)
