from typing import Final

from openai.lib.azure import AsyncAzureOpenAI

from src.utils.env import get_env
from src.utils.ref import Ref

AZURE_API_VERSION: Final[str] = "2024-06-01"

ref = Ref[AsyncAzureOpenAI]()


def get_azure_openai() -> AsyncAzureOpenAI:
    """Get the Azure OpenAI client.

    Returns:
        AsyncAzureOpenAI: The Azure OpenAI client.
    """
    if not ref.value:
        ref.value = AsyncAzureOpenAI(
            api_key=get_env("AZURE_OPENAI_KEY"),
            api_version=AZURE_API_VERSION,
            azure_endpoint=get_env("AZURE_OPENAI_EMBEDDINGS_ENDPOINT"),
        )

    return ref.value
