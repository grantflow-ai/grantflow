from http import HTTPMethod

from azure.functions import Blueprint

from .handlers import handle_section_generation_request

blueprint = Blueprint(name="rag_backend-api")  # type: ignore[no-untyped-call]

blueprint.function_name(name=handle_section_generation_request.__name__)(
    blueprint.route(route="generate-section-text", methods=[HTTPMethod.POST])(
        handle_section_generation_request,
    ),
)
