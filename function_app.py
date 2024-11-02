"""Azure Function App definition.

This file is the entry point for the Azure Function App.
"""

from azure.functions import FunctionApp

from src.indexer import blueprint as indexer_blueprint

app = FunctionApp()

app.register_blueprint(indexer_blueprint)
