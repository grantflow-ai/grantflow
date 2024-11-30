import pytest

from src.indexer.chunking import chunk_text


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

    chunks = chunk_text(text=text, mime_type=mime_type)
    assert len(chunks) == 1
