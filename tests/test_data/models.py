from enum import Enum
from typing import TypedDict

from pydantic import BaseModel


class TestModel(BaseModel):
    name: str
    value: int


class TestEnum(Enum):
    A = "a"
    B = "b"


class TestModelWithEnum(BaseModel):
    enum_field: TestEnum


class TestDict(TypedDict):
    name: str
    value: int
