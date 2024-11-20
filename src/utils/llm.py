from typing import Final

from openai.lib.azure import AsyncAzureOpenAI

from src.utils.env import get_env
from src.utils.ref import Ref

AZURE_EMBEDDINGS_API_VERSION: Final[str] = "2023-05-15"
AZURE_GENERATION_API_VERSION: Final[str] = "2024-08-01-preview"

embeddings_ref = Ref[AsyncAzureOpenAI]()
generation_ref = Ref[AsyncAzureOpenAI]()


def get_embeddings_model() -> AsyncAzureOpenAI:
    """Get the Azure OpenAI client for embeddings.

    Returns:
        AsyncAzureOpenAI: The Azure OpenAI client.
    """
    if not embeddings_ref.value:
        embeddings_ref.value = AsyncAzureOpenAI(
            api_key=get_env("AZURE_OPENAI_KEY"),
            api_version=AZURE_EMBEDDINGS_API_VERSION,
            azure_endpoint=get_env("AZURE_OPENAI_ENDPOINT"),
        )

    return embeddings_ref.value


def get_generation_model() -> AsyncAzureOpenAI:
    """Get the Azure OpenAI client for text completions.

    Returns:
        AsyncAzureOpenAI: The Azure OpenAI client.
    """
    if not generation_ref.value:
        generation_ref.value = AsyncAzureOpenAI(
            api_key=get_env("AZURE_OPENAI_KEY"),
            api_version=AZURE_GENERATION_API_VERSION,
            azure_endpoint=get_env("AZURE_OPENAI_ENDPOINT"),
            max_retries=0,
        )

    return generation_ref.value
