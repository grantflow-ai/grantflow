from keybert import KeyBERT

from src.utils.ref import Ref

ref = Ref[KeyBERT]


def get_keybert_model() -> KeyBERT:
    """Get the KeyBERT model.

    Returns:
        The KeyBERT model.
    """
    if ref.value is None:
        ref.value = KeyBERT()
    return ref.value


def extract_keywords(text: str, top_n: int = 5) -> list[str]:
    """Extract keywords from text using KeyBERT.

    Args:
        text: The text to extract keywords from.
        top_n: The number of top keywords to extract.

    Returns:
        List of keywords.
    """
    keywords = get_keybert_model().extract_keywords(
        text, keyphrase_ngram_range=(1, 2), stop_words="english", top_n=top_n
    )
    return [keyword[0] for keyword in keywords]
