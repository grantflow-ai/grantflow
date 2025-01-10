from enum import Enum
from typing import Any, TypedDict

import pytest
from msgspec import DecodeError, EncodeError
from pydantic import BaseModel
from pytest_mock import MockFixture

from src.exceptions import DeserializationError, SerializationError
from src.utils.serialization import decode_hook, deserialize, encode_hook, serialize


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


def test_decode_hook_pydantic_model() -> None:
    data: dict[str, Any] = {"name": "test", "value": 42}
    result = decode_hook(TestModel, data)
    assert isinstance(result, TestModel)
    assert result.name == "test"
    assert result.value == 42


def test_decode_hook_unsupported_type() -> None:
    with pytest.raises(TypeError, match="Unsupported type"):
        decode_hook(str, {"value": "test"})


def test_encode_hook_pydantic_model() -> None:
    model = TestModel(name="test", value=42)
    result = encode_hook(model)
    assert result == {"name": "test", "value": 42}


def test_encode_hook_pydantic_model_with_enum() -> None:
    model = TestModelWithEnum(enum_field=TestEnum.A)
    result = encode_hook(model)
    assert result == {"enum_field": "a"}


def test_encode_hook_callable() -> None:
    def test_func() -> None:
        pass

    result = encode_hook(test_func)
    assert result is None


def test_encode_hook_exception() -> None:
    exc = ValueError("test error")
    result = encode_hook(exc)
    assert result == {"message": "test error", "type": "ValueError"}


def test_encode_hook_object_with_to_dict() -> None:
    class TestObject:
        def to_dict(self) -> dict[str, str]:
            return {"key": "value"}

    result = encode_hook(TestObject())
    assert result == {"key": "value"}


def test_encode_hook_unsupported_type() -> None:
    with pytest.raises(TypeError, match="Unsupported type"):
        encode_hook(object())


def test_deserialize_success() -> None:
    json_str = '{"name": "test", "value": 42}'
    result = deserialize(json_str, TestDict)
    assert result == {"name": "test", "value": 42}


def test_deserialize_decode_error(mocker: MockFixture) -> None:
    with (
        mocker.patch(
            "src.utils.serialization.decode",
            side_effect=DecodeError("Failed to decode"),
        ),
        pytest.raises(DeserializationError),
    ):
        deserialize("invalid", dict)


def test_serialize_success() -> None:
    data = TestModel(name="test", value=42)
    result = serialize(data)
    assert result == b'{"name":"test","value":42}'


def test_serialize_with_kwargs() -> None:
    data = {"key": "value"}
    result = serialize(data, extra="extra_value")
    assert result == b'{"key":"value","extra":"extra_value"}'


def test_serialize_encode_error(mocker: MockFixture) -> None:
    with (
        mocker.patch(
            "src.utils.serialization.encode",
            side_effect=EncodeError("Failed to encode"),
        ),
        pytest.raises(SerializationError),
    ):
        serialize({"key": object()})


def test_encoder_decoder_integration() -> None:
    original = TestModel(name="test", value=42)
    encoded = serialize(original)
    decoded = deserialize(encoded, TestDict)
    assert decoded == {"name": "test", "value": 42}
