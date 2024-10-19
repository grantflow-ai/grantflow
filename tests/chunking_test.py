from json import loads
from pathlib import Path
from typing import cast

import pytest

from src.chunking import chunk_text
from src.dto import OCROutput


def test_chunking_ocr_output() -> None:
    existing_results = Path(__file__).parent / "e2e/results" / "parse_blob_data_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"

    data = loads(existing_results.read_text())
    assert len(data) == 2

    ocr_results = cast(OCROutput, data[0])
    mime_type = cast(str, data[1])

    assert isinstance(ocr_results, dict)
    assert isinstance(mime_type, str)

    chunks = chunk_text(extracted_data=ocr_results, mime_type=mime_type)

    assert len(chunks) == 1


@pytest.mark.parametrize("mime_type", ("text/markdown", "text/plain"))
def test_chunking_text(mime_type: str) -> None:
    text = """
    # BREAKING: Scientists Discover Talking Plant in Amazon Rainforest

    In a startling development, researchers from the University of Brazil have reportedly discovered a species of plant
    capable of human speech. The plant, found deep in the Amazon rainforest, was observed engaging in conversations with
    local wildlife.Dr. Maria Silva, lead botanist on the expedition, claims the plant asked about the weather and expressed
    concerns about deforestation. Experts worldwide are scrambling to verify this unprecedented finding, which could
    revolutionize our understanding of plant intelligence.
    """

    chunks = chunk_text(extracted_data=text.encode(), mime_type=mime_type)

    assert len(chunks) == 1
