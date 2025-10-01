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

# Keep only true marketing buzzwords that don't carry substantive meaning
GRANT_BUZZWORD_STOP_WORDS: Final[set[str]] = {
    "cutting-edge",
    "state-of-the-art",
    "groundbreaking",
    "pioneering",
}

# Removed QUANTITATIVE_STOP_WORDS: Terms like "significant", "comprehensive", "detailed"
# are essential for scientific writing and grant evaluation criteria.
#
# Removed METHODOLOGICAL_STOP_WORDS: Terms like "method", "technique", "mechanism", "pathway"
# are core scientific concepts that should never be removed during compression.

ACADEMIC_STOP_WORDS: Final[set[str]] = (
    TRANSITIONAL_STOP_WORDS
    | FREQUENCY_STOP_WORDS
    | ACADEMIC_FILLER_STOP_WORDS
    | GRANT_BUZZWORD_STOP_WORDS
)
