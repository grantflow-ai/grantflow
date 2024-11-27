from json import loads

from google.cloud.aiplatform import MatchingEngineIndex, init
from google.oauth2.service_account import Credentials
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbeddingModel
from vertexai.resources.preview import DistanceMeasureType

from src.constants import EMBEDDING_DIMENSIONS, EMBEDDINGS_MODEL
from src.utils.env import get_env
from src.utils.ref import Ref

init_ref = Ref[bool]()
embeddings_model = Ref[TextEmbeddingModel]()
clients: dict[str, GenerativeModel] = {}
indexes: dict[str, MatchingEngineIndex] = {}


def _ensure_init() -> None:
    """Handle the initialization of the clients."""
    if not init_ref.value:
        credentials = loads(get_env("GCP_CREDENTIALS"))
        init(
            project=get_env("GCP_PROJECT_ID"),
            location=get_env("GCP_REGION"),
            credentials=Credentials.from_service_account_info(credentials),  # type: ignore[no-untyped-call]
        )
        init_ref.value = True


def get_embeddings_client() -> TextEmbeddingModel:
    """Get the TextEmbeddingModel client.

    Returns:
        The TextEmbeddingModel client.
    """
    if not embeddings_model.value:
        _ensure_init()
        embeddings_model.value = TextEmbeddingModel.from_pretrained(EMBEDDINGS_MODEL)

    return embeddings_model.value


def get_google_ai_client(*, prompt_identifier: str, system_instructions: str, model: str) -> GenerativeModel:
    """Get the GenerativeModel client for the given prompt identifier.

    Args:
        prompt_identifier: The prompt identifier.
        system_instructions: The system instructions.
        model: The model to use for the generation.

    Returns:
        The GenerativeModel client.
    """
    if prompt_identifier not in clients:
        _ensure_init()
        clients[prompt_identifier] = GenerativeModel(model, system_instruction=system_instructions)
    return clients[prompt_identifier]


async def get_or_create_search_index(index_name: str, bucket_url: str) -> MatchingEngineIndex:
    if index_name not in indexes:
        _ensure_init()
        if index_name not in MatchingEngineIndex.deployed_indexes:
            indexes[index_name] = MatchingEngineIndex.create_tree_ah_index(
                index_name,
                dimensions=EMBEDDING_DIMENSIONS,
                contents_delta_uri=bucket_url,
                distance_measure_type=DistanceMeasureType.COSINE_DISTANCE,
                approximate_neighbors_count=10,
            )
        else:
            indexes[index_name] = MatchingEngineIndex(index_name).update_embeddings(contents_delta_uri=bucket_url)
    return indexes[index_name]
