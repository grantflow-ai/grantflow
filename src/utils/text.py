from src.utils.nlp import get_spacy_model


def concatenate_segments_with_spacy_coherence(segments: list[str]) -> str:
    """Concatenate segmented text responses with coherence check using spaCy.

    Args:
        segments: A list of text segments.

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
            for overlap_count in range(1, min(len(context_buffer), 2) + 1):
                if sentences[:overlap_count] == context_buffer[-overlap_count:]:
                    overlap_index = overlap_count
                    break

            sentences = sentences[overlap_index:]

        concatenated_text.append(" ".join(sentences).strip())

        context_buffer = sentences[-2:]

    return " ".join(concatenated_text).strip()


def normalize_markdown(markdown_string: str) -> str:
    """Normalize the markdown string by removing extra whitespaces and empty lines.

    Args:
        markdown_string: The markdown string to normalize.

    Returns:
        The normalized markdown string.
    """
    normalized_whitespaces = " ".join([word for word in markdown_string.split(" ") if word.strip()])
    normalized_lines = [line for line in normalized_whitespaces.splitlines() if line.strip()]
    return "\n\n".join(normalized_lines)
