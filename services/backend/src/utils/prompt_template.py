from typing import final

from prompt_template import PromptTemplate as BasePromptTemplate
from shared_utils.src.serialization import serialize


@final
class PromptTemplate(BasePromptTemplate):
    serialize = staticmethod(lambda value: serialize(value).decode())
