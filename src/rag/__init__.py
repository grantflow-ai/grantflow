from http import HTTPMethod

from azure.functions import Blueprint

from .handler import handle_rag_request

blueprint = Blueprint(name="rag-api")  # type: ignore[no-untyped-call]

blueprint.function_name(name=handle_rag_request.__name__)(
    blueprint.route(route="/rag", methods=[HTTPMethod.POST])(
        handle_rag_request,
    ),
)
