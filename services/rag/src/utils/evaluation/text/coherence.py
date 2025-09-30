import re
from collections import Counter
from typing import Final

from packages.shared_utils.src.nlp import get_spacy_model

from services.rag.src.utils.evaluation.dto import CoherenceMetrics
from services.rag.src.utils.post_processing import deduplicate_sentences

ADDITION_TRANSITIONS: Final[set[str]] = {
    "furthermore",
    "moreover",
    "additionally",
    "in addition",
    "also",
    "besides",
    "similarly",
    "likewise",
    "equally",
    "correspondingly",
}

CONTRAST_TRANSITIONS: Final[set[str]] = {
    "however",
    "nevertheless",
    "nonetheless",
    "conversely",
    "in contrast",
    "on the other hand",
    "alternatively",
    "whereas",
    "while",
    "although",
}

CAUSAL_TRANSITIONS: Final[set[str]] = {
    "therefore",
    "thus",
    "consequently",
    "as a result",
    "hence",
    "accordingly",
    "because",
    "since",
    "due to",
    "given that",
    "owing to",
}

TEMPORAL_TRANSITIONS: Final[set[str]] = {
    "first",
    "second",
    "third",
    "next",
    "then",
    "subsequently",
    "finally",
    "initially",
    "previously",
    "earlier",
    "later",
    "meanwhile",
    "simultaneously",
}

ALL_TRANSITIONS: Final[set[str]] = (
    ADDITION_TRANSITIONS | CONTRAST_TRANSITIONS | CAUSAL_TRANSITIONS | TEMPORAL_TRANSITIONS
)

DEMONSTRATIVES: Final[set[str]] = {"this", "that", "these", "those", "such"}
ANAPHORIC_REFERENCES: Final[set[str]] = {"it", "they", "them", "their", "its"}


def analyze_sentence_transitions(sentences: list[str]) -> float:
    if len(sentences) < 2:
        return 1.0

    transition_score = 0.0
    total_transitions = len(sentences) - 1

    for i in range(1, len(sentences)):
        current_sentence = sentences[i].lower().strip()

        sentence_words = current_sentence.split()
        if sentence_words and sentence_words[0] in ALL_TRANSITIONS:
            transition_score += 1.0
        elif any(transition in current_sentence[:50] for transition in ALL_TRANSITIONS):
            transition_score += 0.7
        elif any(device in sentence_words[:3] for device in DEMONSTRATIVES | ANAPHORIC_REFERENCES):
            transition_score += 0.5
        else:
            prev_sentence = sentences[i - 1].lower()
            shared_content_words = _calculate_lexical_overlap(prev_sentence, current_sentence)
            if shared_content_words > 0.2:
                transition_score += 0.3

    return transition_score / total_transitions if total_transitions > 0 else 1.0


def calculate_lexical_diversity(content: str) -> float:
    if not content.strip():
        return 0.0

    nlp = get_spacy_model()
    doc = nlp(content)

    content_words = [
        token.lemma_.lower() for token in doc if token.is_alpha and not token.is_stop and len(token.text) > 2
    ]

    if len(content_words) < 10:
        return 0.5

    unique_words = len(set(content_words))
    total_words = len(content_words)
    ttr = unique_words / total_words

    if total_words > 100:
        window_size = 50
        ttr_values = []

        for i in range(0, total_words - window_size, 10):
            window_words = content_words[i : i + window_size]
            window_ttr = len(set(window_words)) / len(window_words)
            ttr_values.append(window_ttr)

        ttr = sum(ttr_values) / len(ttr_values) if ttr_values else ttr

    if 0.4 <= ttr <= 0.7:
        return 1.0
    if 0.3 <= ttr < 0.4 or 0.7 < ttr <= 0.8:
        return 0.7
    if ttr > 0:
        return 0.4
    return 0.0


def assess_argument_flow_consistency(content: str) -> float:
    if not content.strip():
        return 0.0

    nlp = get_spacy_model()
    doc = nlp(content)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    if len(sentences) < 3:
        return 0.8

    flow_score = 0.0

    progression_indicators = {
        "first": 1,
        "second": 2,
        "third": 3,
        "finally": 10,
        "initially": 1,
        "subsequently": 5,
        "then": 5,
        "next": 5,
        "in conclusion": 10,
        "to summarize": 10,
    }

    found_progressions = []
    for i, sentence in enumerate(sentences):
        sentence_lower = sentence.lower()
        for indicator, order in progression_indicators.items():
            if indicator in sentence_lower:
                found_progressions.append((i, order))

    if len(found_progressions) >= 2:
        is_ordered = all(
            found_progressions[i][1] <= found_progressions[i + 1][1] for i in range(len(found_progressions) - 1)
        )
        flow_score += 0.3 if is_ordered else 0.1

    content_lower = content.lower()

    content_words = [
        token.lemma_.lower() for token in doc if token.is_alpha and not token.is_stop and len(token.text) > 4
    ]

    if content_words:
        word_freq = Counter(content_words)
        main_themes = {word for word, freq in word_freq.most_common(10) if freq >= 2}

        text_thirds = [
            sentences[: len(sentences) // 3],
            sentences[len(sentences) // 3 : 2 * len(sentences) // 3],
            sentences[2 * len(sentences) // 3 :],
        ]

        theme_consistency = 0
        for third in text_thirds:
            third_text = " ".join(third).lower()
            themes_present = sum(1 for theme in main_themes if theme in third_text)
            if themes_present >= len(main_themes) * 0.3:
                theme_consistency += 1

        flow_score += (theme_consistency / 3) * 0.4

    contradiction_patterns = [
        (r"not\s+\w+", r"is\s+\w+"),
        (r"never", r"always"),
        (r"impossible", r"possible"),
        (r"cannot", r"can"),
    ]

    contradiction_penalty = 0.0
    for neg_pattern, pos_pattern in contradiction_patterns:
        if re.search(neg_pattern, content_lower) and re.search(pos_pattern, content_lower):
            contradiction_penalty += 0.1

    flow_score = max(0, flow_score - contradiction_penalty)

    transition_quality = analyze_sentence_transitions(sentences)
    flow_score += transition_quality * 0.3

    return min(1.0, flow_score)


def analyze_paragraph_unity(content: str) -> float:
    if not content.strip():
        return 0.0

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n(?=#)", content) if p.strip()]

    if not paragraphs:
        return 0.0

    nlp = get_spacy_model()
    unity_scores = []

    for paragraph in paragraphs:
        if len(paragraph) < 50:
            continue

        doc = nlp(paragraph)
        sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

        if len(sentences) < 2:
            unity_scores.append(1.0)
            continue

        paragraph_unity = 0.0

        all_content_words: list[str] = []
        sentence_word_sets = []

        for sentence in sentences:
            sent_doc = nlp(sentence)
            content_words = {
                token.lemma_.lower()
                for token in sent_doc
                if token.is_alpha and not token.is_stop and len(token.text) > 3
            }
            sentence_word_sets.append(content_words)
            all_content_words.extend(content_words)

        if all_content_words:
            word_freq = Counter(all_content_words)
            common_words = {word for word, freq in word_freq.items() if freq >= 2}

            sentences_with_common = sum(
                1 for word_set in sentence_word_sets if len(word_set.intersection(common_words)) > 0
            )

            if sentences_with_common > 0:
                paragraph_unity += (sentences_with_common / len(sentences)) * 0.5

        referential_devices = 0
        for sentence in sentences[1:]:
            sentence_words = sentence.lower().split()
            if any(word in sentence_words[:5] for word in DEMONSTRATIVES | ANAPHORIC_REFERENCES):
                referential_devices += 1

        if len(sentences) > 1:
            paragraph_unity += (referential_devices / (len(sentences) - 1)) * 0.3

        internal_transitions = 0
        for sentence in sentences[1:]:
            if any(trans in sentence.lower()[:30] for trans in ALL_TRANSITIONS):
                internal_transitions += 1

        if len(sentences) > 1:
            paragraph_unity += (internal_transitions / (len(sentences) - 1)) * 0.2

        unity_scores.append(min(1.0, paragraph_unity))

    return sum(unity_scores) / len(unity_scores) if unity_scores else 0.0


async def calculate_repetition_penalty(content: str) -> float:
    if not content.strip():
        return 1.0

    nlp = get_spacy_model()
    doc = nlp(content)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    if len(sentences) < 2:
        return 1.0

    try:
        unique_sentences = await deduplicate_sentences(sentences)
        repetition_ratio = len(unique_sentences) / len(sentences)

        if repetition_ratio >= 0.9:
            return 1.0
        if repetition_ratio >= 0.8:
            return 0.8
        if repetition_ratio >= 0.7:
            return 0.6
        return 0.4

    except Exception:
        words = [token.lemma_.lower() for token in doc if token.is_alpha]
        if not words:
            return 1.0

        word_counts = Counter(words)

        max_freq = max(word_counts.values())
        total_words = len(words)

        if max_freq / total_words > 0.1:
            return 0.5
        if max_freq / total_words > 0.05:
            return 0.7
        return 1.0


def _calculate_lexical_overlap(text1: str, text2: str) -> float:
    words1 = {word.lower() for word in text1.split() if len(word) > 3}
    words2 = {word.lower() for word in text2.split() if len(word) > 3}

    if not words1 or not words2:
        return 0.0

    intersection = words1.intersection(words2)
    union = words1.union(words2)

    return len(intersection) / len(union) if union else 0.0


async def evaluate_coherence(content: str) -> CoherenceMetrics:
    if not content.strip():
        return CoherenceMetrics(
            local_coherence=0.0,
            global_coherence=0.0,
            lexical_diversity=0.0,
            sentence_transition_quality=0.0,
            argument_flow_consistency=0.0,
            paragraph_unity=0.0,
            repetition_penalty=1.0,
            overall=0.0,
        )

    nlp = get_spacy_model()
    doc = nlp(content)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    sentence_transition_quality = analyze_sentence_transitions(sentences)
    lexical_diversity = calculate_lexical_diversity(content)
    argument_flow_consistency = assess_argument_flow_consistency(content)
    paragraph_unity = analyze_paragraph_unity(content)
    repetition_penalty = await calculate_repetition_penalty(content)

    local_coherence = (sentence_transition_quality + paragraph_unity) / 2

    global_coherence = (argument_flow_consistency + lexical_diversity) / 2

    overall = (
        local_coherence * 0.25
        + global_coherence * 0.25
        + lexical_diversity * 0.15
        + sentence_transition_quality * 0.15
        + argument_flow_consistency * 0.10
        + paragraph_unity * 0.05
        + repetition_penalty * 0.05
    )

    return CoherenceMetrics(
        local_coherence=local_coherence,
        global_coherence=global_coherence,
        lexical_diversity=lexical_diversity,
        sentence_transition_quality=sentence_transition_quality,
        argument_flow_consistency=argument_flow_consistency,
        paragraph_unity=paragraph_unity,
        repetition_penalty=repetition_penalty,
        overall=overall,
    )
