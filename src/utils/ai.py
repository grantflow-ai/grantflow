from json import loads

from google.cloud.aiplatform import init
from google.oauth2.service_account import Credentials
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbeddingModel

from src.constants import EMBEDDINGS_MODEL
from src.utils.env import get_env
from src.utils.ref import Ref

init_ref = Ref[bool]()
embeddings_model = Ref[TextEmbeddingModel]()
clients: dict[str, GenerativeModel] = {}


def init_llm_connection() -> None:
    """Handle the initialization of the clients."""
    if not init_ref.value:
        credentials = loads(get_env("LLM_SERVICE_ACCOUNT_CREDENTIALS"))
        init(
            project=get_env("GOOGLE_CLOUD_PROJECT"),
            location=get_env("GOOGLE_CLOUD_REGION"),
            credentials=Credentials.from_service_account_info(credentials),  # type: ignore[no-untyped-call]
        )
        init_ref.value = True


def get_embeddings_client() -> TextEmbeddingModel:
    """Get the TextEmbeddingModel client.

    Returns:
        The TextEmbeddingModel client.
    """
    if not embeddings_model.value:
        init_llm_connection()
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
        init_llm_connection()
        clients[prompt_identifier] = GenerativeModel(model, system_instruction=system_instructions)
    return clients[prompt_identifier]
