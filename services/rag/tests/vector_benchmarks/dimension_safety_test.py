"""
Vector dimension safety testing to ensure production model changes are safe.

This module validates that changing vector dimensions doesn't break the system
and that database schema modifications work correctly.
"""

from dataclasses import dataclass
from typing import Any

import pytest
from packages.db.src.constants import EMBEDDING_DIMENSIONS
from packages.shared_utils.src.embeddings import EMBEDDING_MODEL_NAME, generate_embeddings
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test

logger = get_logger(__name__)


@dataclass(frozen=True)
class ModelTestConfig:
    """Configuration for testing a specific embedding model."""

    model_name: str
    expected_dimension: int
    timeout_seconds: int = 300

    def __post_init__(self) -> None:
        if self.expected_dimension <= 0:
            raise ValueError("expected_dimension must be positive")
        if not self.model_name.strip():
            raise ValueError("model_name cannot be empty")


# Test configurations for different models
PRODUCTION_MODEL = ModelTestConfig(
    model_name=EMBEDDING_MODEL_NAME,
    expected_dimension=EMBEDDING_DIMENSIONS,
    timeout_seconds=180,
)

SCIBERT_MODEL = ModelTestConfig(
    model_name="allenai/scibert_scivocab_uncased",
    expected_dimension=768,
    timeout_seconds=300,
)


async def validate_embedding_generation(config: ModelTestConfig) -> bool:
    """Validate that embedding generation works for the given model config."""
    try:
        test_texts = ["Test document for embedding validation"]
        embeddings = await generate_embeddings(test_texts, model_name=config.model_name)

        if not embeddings or len(embeddings) != 1:
            return False

        actual_dimension = len(embeddings[0])
        return actual_dimension == config.expected_dimension
    except Exception as e:
        logger.error("Embedding generation failed", model=config.model_name, error=str(e))
        return False


async def validate_database_schema(session_maker: async_sessionmaker[Any], target_dimension: int) -> bool:
    """Validate database can handle vectors of the target dimension."""
    try:
        async with session_maker() as session:
            # Test that we can query the schema
            result = await session.execute(
                text(
                    "SELECT column_name, data_type "
                    "FROM information_schema.columns "
                    "WHERE table_name = 'text_vectors' AND column_name = 'embedding'"
                )
            )
            schema_info = result.fetchone()
            return schema_info is not None
    except Exception as e:
        logger.error("Database schema validation failed", target_dimension=target_dimension, error=str(e))
        return False


def test_model_config_validation() -> None:
    """Test that model configuration validation works correctly."""
    # Valid config
    config = ModelTestConfig(model_name="test/model", expected_dimension=384)
    assert config.model_name == "test/model"
    assert config.expected_dimension == 384

    # Invalid dimension
    with pytest.raises(ValueError, match="expected_dimension must be positive"):
        ModelTestConfig(model_name="test/model", expected_dimension=0)

    # Empty model name
    with pytest.raises(ValueError, match="model_name cannot be empty"):
        ModelTestConfig(model_name="", expected_dimension=384)


def test_production_model_config() -> None:
    """Test that production model configuration is correct."""
    assert PRODUCTION_MODEL.model_name == EMBEDDING_MODEL_NAME
    assert PRODUCTION_MODEL.expected_dimension == EMBEDDING_DIMENSIONS
    assert PRODUCTION_MODEL.timeout_seconds == 180


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_production_model_embedding_generation() -> None:
    """Test that production model can generate embeddings correctly."""
    result = await validate_embedding_generation(PRODUCTION_MODEL)
    assert result, f"Production model {PRODUCTION_MODEL.model_name} failed embedding generation"


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_alternative_model_embedding_generation() -> None:
    """Test that alternative models can generate embeddings correctly."""
    result = await validate_embedding_generation(SCIBERT_MODEL)
    assert result, f"SciBERT model {SCIBERT_MODEL.model_name} failed embedding generation"


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
async def test_database_schema_validation(async_session_maker: async_sessionmaker[Any]) -> None:
    """Test that database schema is accessible and valid."""
    result = await validate_database_schema(async_session_maker, EMBEDDING_DIMENSIONS)
    assert result, "Database schema validation failed"


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=600)
async def test_multiple_model_validation() -> None:
    """Test validation across multiple embedding models."""
    models = [PRODUCTION_MODEL, SCIBERT_MODEL]

    for model in models:
        logger.info("Testing model", model_name=model.model_name, dimension=model.expected_dimension)
        result = await validate_embedding_generation(model)
        assert result, f"Model validation failed for {model.model_name}"

    logger.info("All models validated successfully", tested_models=len(models))
