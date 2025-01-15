from prompt_template import PromptTemplate as _PromptTemplate

from src.utils.serialization import serialize


class PromptTemplate(_PromptTemplate):
    """A template for generating prompts with placeholders for variables."""

    serialize = staticmethod(lambda value: serialize(value).decode())
