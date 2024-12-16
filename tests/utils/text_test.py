import pytest

from src.utils.text import concatenate_segments_with_spacy_coherence, normalize_markdown


@pytest.mark.parametrize(
    ("segments", "expected"),
    [
        ([], ""),
        (["This is a test."], "This is a test."),
        (["This is a test. ", "This is another test. "], "This is a test. This is another test."),
        (["This is a test. ", "This is a test. This is another test."], "This is a test. This is another test."),
    ],
)
def test_concatenate_segments_with_spacy_coherence(segments: list[str], expected: str) -> None:
    result = concatenate_segments_with_spacy_coherence(segments)
    assert result == expected


def test_normalize_markdown() -> None:
    input_str = "# Developing Ai Tailored Immunocytokines To Target Melanoma Brain Metastases\n## Research Significance\nBrain metastases (BMs) present a significant clinical challenge, particularly in melanoma, where they occur in nearly half of metastatic patients, leading to drastically reduced survival rates.   The brain's unique microenvironment contributes to a highly immunosuppressive state within the BM tumor microenvironment (TME), rendering conventional therapies ineffective. This project addresses the critical need for innovative therapeutic strategies to overcome this immunosuppression and improve outcomes for patients with melanoma BMs.   Current treatment options...."
    expected_out = "# Developing Ai Tailored Immunocytokines To Target Melanoma Brain Metastases\n\n## Research Significance\n\nBrain metastases (BMs) present a significant clinical challenge, particularly in melanoma, where they occur in nearly half of metastatic patients, leading to drastically reduced survival rates. The brain's unique microenvironment contributes to a highly immunosuppressive state within the BM tumor microenvironment (TME), rendering conventional therapies ineffective. This project addresses the critical need for innovative therapeutic strategies to overcome this immunosuppression and improve outcomes for patients with melanoma BMs. Current treatment options...."

    assert normalize_markdown(input_str) == expected_out
