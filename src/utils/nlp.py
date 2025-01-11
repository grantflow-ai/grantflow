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
