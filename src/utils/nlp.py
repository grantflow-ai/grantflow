from spacy.language import Language

from src.utils.ref import Ref

nlp = Ref[Language]()


def get_spacy_model() -> Language:
    """Get the Spacy model. Initializing it if it is not already loaded."""
    if nlp.value is None:
        from spacy import load

        nlp.value = load("en_core_web_sm")
    return nlp.value
