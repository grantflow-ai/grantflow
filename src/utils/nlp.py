import logging
from collections import Counter

from spacy.language import Language

from src.utils.ref import Ref

nlp = Ref[Language]()

logger = logging.getLogger(__name__)


def get_spacy_model() -> Language:
    """Get the Spacy model. Initializing it if it is not already loaded."""
    if nlp.value is None:
        from spacy import load

        logger.info("Loading spaCy model")
        nlp.value = load("en_core_web_sm")
    return nlp.value


def extract_labels(text: str) -> list[str]:
    """Extract entities from text as labels using spaCy.

    Args:
        text: The text to process.

    Returns:
        A list of extracted labels.
    """
    model = get_spacy_model()
    doc = model(text)
    labels = [ent.text for ent in doc.ents]

    logger.debug("Extracted labels: %s", ",".join(labels))
    return labels


def extract_keywords(text: str, top_n: int = 5) -> list[str]:
    """Extract keywords from text using spaCy.

    Args:
        text: The text to extract keywords from.
        top_n: The number of top keywords to extract.

    Returns:
        List of keywords.
    """
    model = get_spacy_model()
    doc = model(text)
    pos_tags = {"NOUN", "PROPN", "ADJ"}

    keywords = [
        token.text.lower()
        for token in doc
        if token.pos_ in pos_tags and token.text.lower() not in model.Defaults.stop_words
    ]

    keyword_freq = Counter(keywords)

    return [v for v, _ in keyword_freq.most_common(top_n)]
