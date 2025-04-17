from typing import Final

from sentence_transformers import SentenceTransformer

from src.utils.logger import get_logger
from src.utils.ref import Ref
from src.utils.sync import run_sync

logger = get_logger(__name__)
embedding_model_ref = Ref[SentenceTransformer]()

EMBEDDING_MODEL_NAME: Final[str] = "sentence-transformers/all-MiniLM-L12-v2"


def get_embedding_model() -> SentenceTransformer:
    if embedding_model_ref.value is None:
        model = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")
        embedding_model_ref.value = model

    return embedding_model_ref.value


async def generate_embeddings(inputs: str | list[str]) -> list[list[float]]:
    if not isinstance(inputs, list):
        inputs = [inputs]

    model = await run_sync(get_embedding_model)

    return [[float(x) for x in embedding] for embedding in model.encode(inputs)]
