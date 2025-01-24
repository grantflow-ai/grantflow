from spacy.language import Language

from src.utils.logger import get_logger
from src.utils.ref import Ref

logger = get_logger(__name__)

nlp = Ref[Language]()


def get_spacy_model() -> Language:
    """Get the Spacy model. Initializing it if it is not already loaded."""
    if nlp.value is None:
        from spacy import load

        logger.info("Loading spaCy model")
        nlp.value = load("en_core_web_sm")
    return nlp.value


def get_word_count(text: str) -> int:
    """Counts the number of words in a string using spaCy.

    Args:
      text: The string to count words in.

    Returns:
      The number of words in the string.
    """
    model = get_spacy_model()
    return len([token for token in model(text) if not token.is_punct and not token.is_space])
