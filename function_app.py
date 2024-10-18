"""Azure Function App definition.

This file is the entry point for the Azure Function App.
"""

from azure.functions import FunctionApp

from src.app import blob_trigger_handler

app = FunctionApp()

app.function_name(name="file_parser")(
    app.blob_trigger(arg_name="blob", path="PATH/TO/BLOB", connection="CONNECTION_SETTING")(blob_trigger_handler)
)
