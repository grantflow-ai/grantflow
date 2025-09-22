"""
Stop words collections for text processing across GrantFlow services.

This module provides curated stop word collections optimized for academic and grant application text processing.
These stop words complement spaCy's default stop words by targeting domain-specific overused terms.
"""

from typing import Final

# Transitional and linking words commonly overused in academic writing
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

# Frequency and degree adverbs that add little semantic value
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

# Quantitative and descriptive modifiers overused in academic contexts
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

# Methodological and procedural terms commonly overused in research descriptions
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

# Academic filler words that provide limited semantic content
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

# Overused grant-specific terms (excludes scientifically meaningful ones)
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

# Complete collection of academic/grant application stop words beyond spaCy defaults
# These words are commonly overused in academic writing but add little semantic value
ACADEMIC_STOP_WORDS: Final[set[str]] = (
    TRANSITIONAL_STOP_WORDS
    | FREQUENCY_STOP_WORDS
    | QUANTITATIVE_STOP_WORDS
    | METHODOLOGICAL_STOP_WORDS
    | ACADEMIC_FILLER_STOP_WORDS
    | GRANT_BUZZWORD_STOP_WORDS
)
