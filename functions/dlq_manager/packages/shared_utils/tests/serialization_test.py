from dataclasses import dataclass
from enum import Enum
from typing import TypedDict

import pytest
from msgspec import DecodeError, EncodeError
from pytest_mock import MockFixture

from packages.shared_utils.src.exceptions import (
    DeserializationError,
    SerializationError,
)
from packages.shared_utils.src.serialization import (
    deserialize,
    encode_hook,
    extract_first_json_object,
    serialize,
    to_builtins,
)


@dataclass(slots=True)
class SampleModel:
    name: str
    value: int


class SampleEnum(Enum):
    A = "a"
    B = "b"


@dataclass(slots=True)
class SampleModelWithEnum:
    enum_field: SampleEnum


class SampleDict(TypedDict):
    name: str
    value: int


def test_encode_hook_dataclass_model() -> None:
    model = SampleModel(name="test", value=42)
    result = encode_hook(model)
    assert result == {"name": "test", "value": 42}


def test_encode_hook_pydantic_model_with_enum() -> None:
    model = SampleModelWithEnum(enum_field=SampleEnum.A)
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


def test_encode_hook_enum() -> None:
    result = encode_hook(SampleEnum.A)
    assert result == "a"

    result = encode_hook(SampleEnum.B)
    assert result == "b"


def test_encode_hook_object_with_to_dict() -> None:
    class TestObject:
        @staticmethod
        def to_dict() -> dict[str, str]:
            return {"key": "value"}

    result = encode_hook(TestObject())
    assert result == {"key": "value"}


def test_encode_hook_unsupported_type() -> None:
    with pytest.raises(TypeError, match="Unsupported type"):
        encode_hook(object())


def test_deserialize_success() -> None:
    json_str = '{"name": "test", "value": 42}'
    result = deserialize(json_str, SampleDict)
    assert result == {"name": "test", "value": 42}


def test_deserialize_decode_error(mocker: MockFixture) -> None:
    mocker.patch(
        "packages.shared_utils.src.serialization.decode",
        side_effect=DecodeError("Failed to decode"),
    )
    with (
        pytest.raises(DeserializationError),
    ):
        deserialize("invalid", dict)


def test_serialize_success() -> None:
    data = SampleModel(name="test", value=42)
    result = serialize(data)
    assert result == b'{"name":"test","value":42}'


def test_serialize_with_kwargs() -> None:
    data = {"key": "value"}
    result = serialize(data, extra="extra_value")
    assert result == b'{"key":"value","extra":"extra_value"}'


def test_serialize_encode_error(mocker: MockFixture) -> None:
    mocker.patch(
        "packages.shared_utils.src.serialization.encode",
        side_effect=EncodeError("Failed to encode"),
    )
    with (
        pytest.raises(SerializationError),
    ):
        serialize({"key": object()})


def test_encoder_decoder_integration() -> None:
    original = SampleModel(name="test", value=42)
    encoded = serialize(original)
    decoded = deserialize(encoded, SampleDict)
    assert decoded == {"name": "test", "value": 42}


def test_to_builtins_simple_types() -> None:
    assert to_builtins("string") == "string"
    assert to_builtins(42) == 42
    assert to_builtins(3.14) == 3.14
    assert to_builtins(True) is True
    assert to_builtins(None) is None


def test_to_builtins_list() -> None:
    result = to_builtins([1, 2, "three"])
    assert result == [1, 2, "three"]


def test_to_builtins_dict() -> None:
    result = to_builtins({"key": "value", "number": 42})
    assert result == {"key": "value", "number": 42}


def test_to_builtins_enum() -> None:
    result = to_builtins(SampleEnum.A)
    assert result == "a"


def test_to_builtins_dataclass() -> None:
    model = SampleModel(name="test", value=42)
    result = to_builtins(model)
    assert result == {"name": "test", "value": 42}


def test_to_builtins_complex_structure() -> None:
    complex_data = {
        "models": [
            SampleModel(name="first", value=1),
            SampleModel(name="second", value=2),
        ],
        "enum": SampleEnum.B,
        "nested": {
            "enum_model": SampleModelWithEnum(enum_field=SampleEnum.A),
            "plain": "value",
        },
    }

    result = to_builtins(complex_data)
    expected = {
        "models": [
            {"name": "first", "value": 1},
            {"name": "second", "value": 2},
        ],
        "enum": "b",
        "nested": {
            "enum_model": {"enum_field": "a"},
            "plain": "value",
        },
    }
    assert result == expected


def test_extract_first_json_object_single_object() -> None:
    json_str = '{"key": "value", "number": 123}'
    result = extract_first_json_object(json_str)
    assert result == json_str


def test_extract_first_json_object_concatenated() -> None:
    json_str = '{"sections": [{"id": "summary", "content": "test"}]}{"sections": [{"id": "aims", "content": "test2"}]}'
    result = extract_first_json_object(json_str)
    assert result == '{"sections": [{"id": "summary", "content": "test"}]}'


def test_extract_first_json_object_with_nested_objects() -> None:
    json_str = '{"outer": {"inner": {"deep": "value"}, "array": [{"item": 1}]}}{"extra": "should be ignored"}'
    result = extract_first_json_object(json_str)
    assert result == '{"outer": {"inner": {"deep": "value"}, "array": [{"item": 1}]}}'


def test_extract_first_json_object_with_escaped_quotes() -> None:
    json_str = '{"text": "This is a \\"quoted\\" string", "normal": "value"}{"extra": "ignored"}'
    result = extract_first_json_object(json_str)
    assert result == '{"text": "This is a \\"quoted\\" string", "normal": "value"}'


def test_extract_first_json_object_with_braces_in_strings() -> None:
    json_str = '{"code": "function() { return {}; }", "value": 123}{"extra": "data"}'
    result = extract_first_json_object(json_str)
    assert result == '{"code": "function() { return {}; }", "value": 123}'


def test_extract_first_json_object_empty_input() -> None:
    assert extract_first_json_object("") is None
    assert extract_first_json_object("   ") is None
    assert extract_first_json_object("not json") is None
    assert extract_first_json_object("[1, 2, 3]") is None


def test_extract_first_json_object_incomplete() -> None:
    json_str = '{"key": "value", "incomplete":'
    result = extract_first_json_object(json_str)
    assert result is None


def test_encode_hook_google_api_exception() -> None:
    class MockGoogleAPIException(Exception):
        def __init__(self, message: str):
            super().__init__(message)
            self.code = 409
            self.details = "Resource already exists"

    exc = MockGoogleAPIException("409 Subscription already exists")
    result = encode_hook(exc)

    assert result == {
        "message": "409 Subscription already exists",
        "type": "MockGoogleAPIException",
        "code": 409,
        "details": "Resource already exists",
    }


def test_encode_hook_exception_with_response() -> None:
    class MockResponse:
        status_code = 500

    class MockHTTPException(Exception):
        def __init__(self, message: str):
            super().__init__(message)
            self.response = MockResponse()

    exc = MockHTTPException("Internal Server Error")
    result = encode_hook(exc)

    assert result == {
        "message": "Internal Server Error",
        "type": "MockHTTPException",
        "status_code": 500,
    }


def test_encode_hook_regular_exception() -> None:
    exc = ValueError("Invalid value")
    result = encode_hook(exc)

    assert result == {"message": "Invalid value", "type": "ValueError"}
