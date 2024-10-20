"""Azure Function App definition.

This file is the entry point for the Azure Function App.
"""

from azure.functions import FunctionApp

from src.app import blueprint

app = FunctionApp()

app.register_blueprint(blueprint)
