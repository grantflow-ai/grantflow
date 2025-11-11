#!/usr/bin/env python3
"""
Download and cache required ML models for the RAG service.

Downloads models to the configured cache directories via environment variables:
- HF_HOME: Hugging Face cache directory
- SENTENCE_TRANSFORMERS_HOME: Sentence transformers cache directory

Dependencies are installed via the 'models' dependency group in pyproject.toml.
"""

import sys


def download_models() -> None:
    """Download and cache required models."""
    from keybert import KeyBERT  # noqa: PLC0415
    from sentence_transformers import SentenceTransformer  # noqa: PLC0415

    SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")

    KeyBERT()


if __name__ == "__main__":
    try:
        download_models()
    except Exception:
        sys.exit(1)
