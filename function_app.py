"""Azure Function App definition.

This file is the entry point for the Azure Function App.
"""

from azure.functions import FunctionApp

from src.app import blob_trigger_handler

app = FunctionApp()

"""
- see the documentation on Azure Blob trigger name patterns:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-python#blob-name-patterns
- see the documentation about Binding Expressions:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-expressions-patterns
"""
app.function_name(name="parser-indexer")(
    app.blob_trigger(
        arg_name="blob",
        path="grant-application-files/{workspace_id}/{parent_id}/{filename}",
        connection="AzureWebJobsStorage",
    )(blob_trigger_handler)
)
