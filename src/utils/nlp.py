import logging

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
