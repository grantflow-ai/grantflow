import re
from typing import Final

from packages.db.src.json_objects import GrantLongFormSection
from packages.shared_utils.src.nlp import get_spacy_model, get_word_count

from services.rag.src.utils.evaluation.dto import StructuralMetrics

HEADING_PATTERN: Final[re.Pattern[str]] = re.compile(r"^(#{1,6})\s+.+", re.MULTILINE)
LIST_ITEM_PATTERN: Final[re.Pattern[str]] = re.compile(r"^\s*(?:[*+-]|\d+\.)\s+\S+", re.MULTILINE)
ACADEMIC_FORMATTING_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"\*\*[^*]+\*\*"),
    re.compile(r"_[^_]+_"),
    re.compile(r"`[^`]+`"),
    re.compile(r"\[[^\]]+\]\([^)]+\)"),
]

ACADEMIC_SECTION_HEADERS: Final[set[str]] = {
    "abstract",
    "introduction",
    "background",
    "literature review",
    "methodology",
    "methods",
    "approach",
    "design",
    "procedure",
    "results",
    "findings",
    "analysis",
    "discussion",
    "conclusion",
    "objectives",
    "aims",
    "hypothesis",
    "research questions",
    "significance",
    "implications",
    "limitations",
    "future work",
}


def evaluate_word_count_compliance(content: str, max_words: int | None) -> float:
    if max_words is None:
        return 1.0

    word_count = get_word_count(content)

    if word_count == 0:
        return 0.0

    if word_count <= max_words:
        return min(1.0, word_count / max_words)
    excess_ratio = word_count / max_words
    if excess_ratio <= 1.1:
        return 0.8
    if excess_ratio <= 1.2:
        return 0.5
    return 0.2


def analyze_paragraph_structure(content: str) -> float:
    if not content.strip():
        return 0.0

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n(?=#)", content) if p.strip()]

    if not paragraphs:
        return 0.0

    nlp = get_spacy_model()
    paragraph_sentence_counts = []

    for paragraph in paragraphs:
        if len(paragraph) < 20 or HEADING_PATTERN.match(paragraph):
            continue

        doc = nlp(paragraph)
        sentence_count = len(list(doc.sents))
        paragraph_sentence_counts.append(sentence_count)

    if not paragraph_sentence_counts:
        return 0.5

    avg_sentences = sum(paragraph_sentence_counts) / len(paragraph_sentence_counts)

    if 3 <= avg_sentences <= 7:
        structure_score = 1.0
    elif 2 <= avg_sentences < 3 or 7 < avg_sentences <= 10:
        structure_score = 0.7
    else:
        structure_score = 0.4

    variety_bonus = 0.1 if len(set(paragraph_sentence_counts)) > len(paragraph_sentence_counts) * 0.3 else 0.0

    return min(1.0, structure_score + variety_bonus)


def check_section_organization(content: str) -> float:
    if not content.strip():
        return 0.0

    headers = HEADING_PATTERN.findall(content)

    if not headers:
        content_lower = content.lower()
        implied_sections = sum(1 for section_header in ACADEMIC_SECTION_HEADERS if section_header in content_lower)
        return min(1.0, implied_sections / 5)

    header_levels = []
    academic_headers = 0

    for header in headers:
        level = len(header) - len(header.lstrip("#"))
        header_levels.append(level)

        header_text = header.lstrip("# ").lower()
        if any(academic_header in header_text for academic_header in ACADEMIC_SECTION_HEADERS):
            academic_headers += 1

    if not header_levels:
        return 0.0

    hierarchy_score = 0.5

    if header_levels and min(header_levels) <= 2:
        hierarchy_score += 0.2

    academic_ratio = academic_headers / len(headers)
    hierarchy_score += academic_ratio * 0.3

    return min(1.0, hierarchy_score)


def assess_academic_formatting(content: str) -> float:
    if not content.strip():
        return 0.0

    formatting_score = 0.0
    total_possible_score = 0.0

    for pattern in ACADEMIC_FORMATTING_PATTERNS:
        matches = pattern.findall(content)
        if matches:
            usage_ratio = len(matches) / max(len(content.split()), 1) * 100
            if 0.5 <= usage_ratio <= 3.0:
                formatting_score += 0.2
            elif usage_ratio <= 5.0:
                formatting_score += 0.1
        total_possible_score += 0.2

    list_items = LIST_ITEM_PATTERN.findall(content)
    if list_items:
        list_usage_ratio = len(list_items) / max(len(content.split()), 1) * 100
        if 1.0 <= list_usage_ratio <= 10.0:
            formatting_score += 0.2
        elif list_usage_ratio <= 15.0:
            formatting_score += 0.1
    total_possible_score += 0.2

    return formatting_score / max(total_possible_score, 1.0)


def evaluate_header_structure(content: str) -> float:
    if not content.strip():
        return 0.0

    headers = HEADING_PATTERN.findall(content)

    if not headers:
        return 0.0

    header_levels = []
    for header_hash in headers:
        level = len(header_hash)
        header_levels.append(level)

    if not header_levels:
        return 0.0

    structure_score = 0.0

    if len(set(header_levels)) > 1:
        sorted_levels = sorted(set(header_levels))
        consecutive = all(sorted_levels[i] + 1 == sorted_levels[i + 1] for i in range(len(sorted_levels) - 1))
        if consecutive:
            structure_score += 0.4
        else:
            structure_score += 0.2

    content_length = len(content.split())
    expected_headers = max(1, content_length // 200)
    header_ratio = len(headers) / expected_headers

    if 0.5 <= header_ratio <= 2.0:
        structure_score += 0.3
    elif 0.3 <= header_ratio <= 3.0:
        structure_score += 0.2

    descriptive_headers = 0
    for header in headers:
        header_text = header.lstrip("# ").strip()
        if 10 <= len(header_text) <= 80:
            descriptive_headers += 1

    if descriptive_headers > 0:
        descriptive_ratio = descriptive_headers / len(headers)
        structure_score += descriptive_ratio * 0.3

    return min(1.0, structure_score)


async def evaluate_structure(content: str, section_config: GrantLongFormSection) -> StructuralMetrics:
    word_count_compliance = evaluate_word_count_compliance(content, section_config["max_words"])
    paragraph_distribution = analyze_paragraph_structure(content)
    section_organization = check_section_organization(content)
    academic_formatting = assess_academic_formatting(content)
    header_structure = evaluate_header_structure(content)

    overall = (
        word_count_compliance * 0.25
        + paragraph_distribution * 0.20
        + section_organization * 0.25
        + academic_formatting * 0.15
        + header_structure * 0.15
    )

    return StructuralMetrics(
        word_count_compliance=word_count_compliance,
        paragraph_distribution=paragraph_distribution,
        section_organization=section_organization,
        academic_formatting=academic_formatting,
        header_structure=header_structure,
        overall=overall,
    )
