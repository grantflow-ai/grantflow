from http import HTTPMethod

from azure.functions import Blueprint

from src.rag_backend.handlers import GENERATION_REQUESTS_QUEUE_NAME, handle_generation_init, handle_generation_queue_msg

blueprint = Blueprint(name="rag-api")  # type: ignore[no-untyped-call]

blueprint.function_name(name=handle_generation_init.__name__)(
    blueprint.route(route="generate-draft", methods=[HTTPMethod.POST])(
        handle_generation_init,
    ),
)

blueprint.function_name(name=handle_generation_queue_msg.__name__)(
    blueprint.service_bus_queue_trigger(
        arg_name="msg",
        queue_name=GENERATION_REQUESTS_QUEUE_NAME,
        connection="AZURE_SERVICE_BUS_CONNECTION_STRING",
    )(handle_generation_queue_msg),
)
