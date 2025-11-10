from services.rag.src.grant_template.cfp_analysis.metadata_extraction import normalize_activity_code


def test_normalize_activity_code_uppercases_and_strips() -> None:
    assert normalize_activity_code(" r21 ") == "R21"


def test_normalize_activity_code_handles_empty_values() -> None:
    assert normalize_activity_code("") is None
    assert normalize_activity_code("   ") is None
    assert normalize_activity_code(None) is None


def test_normalize_activity_code_extracts_from_context() -> None:
    assert normalize_activity_code("PAR-25-450", fallback_texts=("Clinical trial readiness R21 mechanism",)) == "R21"
