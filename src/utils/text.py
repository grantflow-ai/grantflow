from src.utils.nlp import get_spacy_model


def strip_lines(text: str) -> str:
    """Strip lines of text.

    Args:
        text: The text to strip.

    Returns:
        The stripped text.
    """
    return "\n".join([line.strip() for line in text.splitlines() if line.strip()]).strip()


def concatenate_segments_with_spacy_coherence(segments: list[str], max_overlap_sentences: int = 2) -> str:
    """Concatenate segmented text responses with coherence check using spaCy.

    Args:
        segments: A list of text segments.
        max_overlap_sentences: Maximum number of overlapping sentences to check for coherence.

    Returns:
        The concatenated and coherent text.
    """
    nlp = get_spacy_model()

    concatenated_text: list[str] = []
    context_buffer: list[str] = []

    for segment in segments:
        doc = nlp(segment)
        sentences = [sent.text for sent in doc.sents]

        overlap_index = 0
        if context_buffer and sentences:
            for overlap_count in range(1, min(len(context_buffer), max_overlap_sentences) + 1):
                if sentences[:overlap_count] == context_buffer[-overlap_count:]:
                    overlap_index = overlap_count
                    break

            sentences = sentences[overlap_index:]

        concatenated_text.append(" ".join(sentences).strip())

        context_buffer = sentences[-max_overlap_sentences:]

    return " ".join(concatenated_text).strip()
