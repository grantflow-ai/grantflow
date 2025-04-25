from typing import final

from packages.shared_utils.src.serialization import serialize
from prompt_template import PromptTemplate as BasePromptTemplate


@final
class PromptTemplate(BasePromptTemplate):
    serialize = staticmethod(lambda value: serialize(value).decode())
