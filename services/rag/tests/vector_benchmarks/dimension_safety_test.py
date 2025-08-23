from packages.db.src.constants import EMBEDDING_DIMENSIONS
from packages.shared_utils.src.embeddings import EMBEDDING_MODEL_NAME, generate_embeddings
from packages.shared_utils.src.logger import get_logger
from testing.e2e_utils import E2ETestCategory, e2e_test

logger = get_logger(__name__)


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_production_model_embedding_generation() -> None:
    test_texts = ["Test document for embedding validation"]
    embeddings = await generate_embeddings(test_texts, model_name=EMBEDDING_MODEL_NAME)

    assert len(embeddings) == 1
    assert len(embeddings[0]) == EMBEDDING_DIMENSIONS
    assert all(isinstance(x, float) for x in embeddings[0])


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_scibert_model_embedding_generation() -> None:
    test_texts = ["Scientific research methodology for validation"]
    embeddings = await generate_embeddings(test_texts, model_name="allenai/scibert_scivocab_uncased")

    assert len(embeddings) == 1
    assert len(embeddings[0]) == 768
    assert all(isinstance(x, float) for x in embeddings[0])


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=600)
async def test_multiple_model_dimensions() -> None:
    models = [
        (EMBEDDING_MODEL_NAME, EMBEDDING_DIMENSIONS),
        ("allenai/scibert_scivocab_uncased", 768),
    ]

    for model_name, expected_dim in models:
        logger.info("Testing model", model_name=model_name, expected_dimension=expected_dim)
        embeddings = await generate_embeddings(["Test text"], model_name=model_name)

        assert len(embeddings) == 1
        assert len(embeddings[0]) == expected_dim
        logger.info("Model validated", model_name=model_name, actual_dimension=len(embeddings[0]))
