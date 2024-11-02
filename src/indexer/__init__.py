from azure.functions import Blueprint

from .handler import blob_trigger_handler

"""
- see the documentation on Azure Blob trigger name patterns:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-python#blob-name-patterns
- see the documentation about Binding Expressions:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-expressions-patterns
"""
blueprint = Blueprint(name="parser-indexer")  # type: ignore[no-untyped-call]

blueprint.function_name(name=blob_trigger_handler.__name__)(
    blueprint.blob_trigger(
        arg_name="blob",
        path="grant-application-files/{workspace_id}/{parent_id}/{filename}",
        connection="AzureWebJobsStorage",
    )(blob_trigger_handler)
)
