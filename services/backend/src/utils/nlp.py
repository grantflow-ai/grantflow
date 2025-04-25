from packages.shared_utils.ref import Ref
from packages.shared_utils.src.logger import get_logger
from spacy.language import Language

logger = get_logger(__name__)

nlp = Ref[Language]()


def get_spacy_model() -> Language:
    if nlp.value is None:
        from spacy import load

        logger.info("Loading spaCy model")
        nlp.value = load("en_core_web_sm")
    return nlp.value


def get_word_count(text: str) -> int:
    model = get_spacy_model()
    return len([token for token in model(text) if not token.is_punct and not token.is_space])
