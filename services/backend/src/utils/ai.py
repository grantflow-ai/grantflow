from typing import Any

from anthropic import AsyncAnthropic
from google.cloud.aiplatform import init
from google.oauth2.service_account import Credentials
from shared_utils.src.env import get_env
from shared_utils.src.ref import Ref
from shared_utils.src.serialization import deserialize
from vertexai.generative_models import GenerativeModel

init_ref = Ref[bool]()
anthropic_client = Ref[AsyncAnthropic]()
google_clients: dict[str, GenerativeModel] = {}


def get_vertex_credentials() -> Credentials:
    credentials = deserialize(get_env("LLM_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
    return Credentials.from_service_account_info(credentials)  # type: ignore[no-any-return,no-untyped-call]


def init_llm_connection() -> None:
    if not init_ref.value:
        init(
            credentials=get_vertex_credentials(),
            location=get_env("GOOGLE_CLOUD_REGION"),
            project=get_env("GOOGLE_CLOUD_PROJECT"),
        )
        init_ref.value = True


def get_google_ai_client(*, prompt_identifier: str, system_instructions: str, model: str) -> GenerativeModel:
    if prompt_identifier not in google_clients:
        init_llm_connection()
        google_clients[prompt_identifier] = GenerativeModel(model, system_instruction=system_instructions)
    return google_clients[prompt_identifier]


def get_anthropic_client() -> AsyncAnthropic:
    if not anthropic_client.value:
        anthropic_client.value = AsyncAnthropic(
            api_key=get_env("ANTHROPIC_API_KEY"),
        )
    return anthropic_client.value
