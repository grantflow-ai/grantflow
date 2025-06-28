from re import compile as re_compile

from packages.shared_utils.src.nlp import get_spacy_model


def count_words(text: str) -> int:
    return len(text.split())


SINGLE_QUOTE_PATTERN = re_compile(r"[\u2018\u2019]")
DOUBLE_QUOTE_PATTERN = re_compile(r"[\u201C\u201D\u201F]")
DASH_PATTERN = re_compile(r"[\u2013\u2014\u2015]")
ELLIPSIS_PATTERN = re_compile(r"\u2026")
BROKEN_MARKDOWN_BOLD_PATTERN = re_compile(r"(\*\*)(.*?)\s+\*\*")
HEADING_PATTERN = re_compile(r"^#{1,6}\s+\S+")
LIST_ITEM_PATTERN = re_compile(r"^\s*(?:[*+-]|\d+\.)\s+\S+")


def concatenate_segments_with_spacy_coherence(segments: list[str]) -> str:
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


def normalize_punctuation(text: str) -> str:
    text = SINGLE_QUOTE_PATTERN.sub("'", text)
    text = DOUBLE_QUOTE_PATTERN.sub('"', text)
    text = DASH_PATTERN.sub("-", text)
    return ELLIPSIS_PATTERN.sub("...", text)


def normalize_markdown(markdown_string: str) -> str:
    if not markdown_string.strip():
        return ""

    markdown_string = _fix_broken_bold(markdown_string)
    lines = _split_and_strip_lines(markdown_string)
    normalized_lines = _process_lines(lines)
    return _finalize_normalized_lines(normalized_lines)


def _fix_broken_bold(markdown_string: str) -> str:
    if "**" in markdown_string:
        markdown_string = BROKEN_MARKDOWN_BOLD_PATTERN.sub(r"\1\2**", markdown_string)
    return markdown_string


def _split_and_strip_lines(markdown_string: str) -> list[str]:
    return [line.strip() for line in markdown_string.splitlines()]


def _process_lines(lines: list[str]) -> list[str]:
    normalized_lines: list[str] = []
    current_list_items: list[str] = []

    for i, line in enumerate(lines):
        if not line:
            _handle_empty_line(normalized_lines, current_list_items)
            continue

        normalized_line = _normalize_line(line)
        is_header = HEADING_PATTERN.match(normalized_line)
        is_list_item = LIST_ITEM_PATTERN.match(normalized_line)

        if is_header:
            _handle_header(normalized_lines, current_list_items, normalized_line)
            continue

        if is_list_item:
            current_list_items.append(normalized_line)
            continue

        _handle_regular_line(normalized_lines, current_list_items, normalized_line, i, lines)

    if current_list_items:
        normalized_lines.extend(current_list_items)

    return normalized_lines


def _handle_empty_line(normalized_lines: list[str], current_list_items: list[str]) -> None:
    if current_list_items:
        normalized_lines.extend(current_list_items)
        current_list_items.clear()
    if normalized_lines and normalized_lines[-1] != "":
        normalized_lines.append("")


def _normalize_line(line: str) -> str:
    return " ".join(normalize_punctuation(word) for word in line.split())


def _handle_header(normalized_lines: list[str], current_list_items: list[str], normalized_line: str) -> None:
    if current_list_items:
        normalized_lines.extend(current_list_items)
        current_list_items.clear()
    if normalized_lines and normalized_lines[-1] != "":
        normalized_lines.append("")
    normalized_lines.append(normalized_line)
    normalized_lines.append("")


def _handle_regular_line(
    normalized_lines: list[str], current_list_items: list[str], normalized_line: str, i: int, lines: list[str]
) -> None:
    if current_list_items:
        normalized_lines.extend(current_list_items)
        normalized_lines.append("")
        current_list_items.clear()
    normalized_lines.append(normalized_line)
    if i < len(lines) - 1:
        normalized_lines.append("")


def _finalize_normalized_lines(normalized_lines: list[str]) -> str:
    result: list[str] = []
    for line in normalized_lines:
        if line or (result and result[-1]):
            result.append(line)
    while result and not result[-1]:
        result.pop()
    return "\n".join(result)


def concat_extracted_cfp_content(extracted_result_content: list[str]) -> str:
    extracted_content_all: str = ""
    for content in extracted_result_content:
        extracted_content_all += content
    return extracted_content_all
