from enum import Enum
from functools import partial
from inspect import isclass
from json import JSONDecodeError, loads
from typing import Any

from msgspec import MsgspecError
from msgspec.json import decode, encode
from pydantic import BaseModel

from src.exceptions import DeserializationError, SerializationError


def decode_hook(target: Any, value: dict[str, Any]) -> Any:
    """Decode a dictionary into an object.

    Args:
        target: The type to decode the data into.
        value: The dictionary to decode.

    Raises:
        TypeError: If the target type is not supported.

    Returns:
        An instance of ``type_``.
    """
    if isclass(target) and issubclass(target, BaseModel):
        return target(**value)

    raise TypeError(f"Unsupported type: {type(target)!r}")


def encode_hook(obj: Any) -> Any:
    """Encode an object into a dictionary.

    Args:
        obj: The object to encode.

    Raises:
        TypeError: If the object type is not supported.

    Returns:
        A dictionary representation of ``obj``.
    """
    if isinstance(obj, BaseModel):
        return {k: v if not isinstance(v, Enum) else v.value for (k, v) in obj.model_dump().items()}

    if callable(obj):
        return None

    if isinstance(obj, Exception):
        return {"message": str(obj), "type": type(obj).__name__}

    for key in ("to_dict", "asdict", "as_dict", "model_dump", "json", "to_list", "tolist"):
        if hasattr(obj, key) and callable(getattr(obj, key)):
            return getattr(obj, key)()

    raise TypeError(f"Unsupported type: {type(obj)!r}")


def deserialize[T](value: str | bytes, target_type: type[T]) -> T:
    """Decode a JSON string/bytes into an object.

    Args:
        value: Value to decode.
        target_type: A type to decode the data into.

    Raises:
        DeserializationError: If the value cannot be deserialized.

    Returns:
        An instance of ``target_type``.
    """
    try:
        return decode(value, type=target_type, dec_hook=decode_hook, strict=False)
    except MsgspecError as e:
        raise DeserializationError(
            str(e),
            context={
                "value": value,
                "target_type": target_type.__name__,
            },
        ) from e


def serialize(value: Any, **kwargs: Any) -> bytes:
    """Encode an object into a JSON string.

    Args:
        value: Value to serialize to JSON.
        **kwargs: Additional keyword arguments to include in the serialization.

    Raises:
        SerializationError: If the value cannot be serialized.

    Returns:
        A JSON string.
    """
    if isinstance(value, dict) and kwargs:
        # this guard is required for structlog ~keep
        value = value | kwargs

    try:
        return encode(value, enc_hook=encode_hook)
    except MsgspecError as e:
        raise SerializationError(
            str(e),
            context={
                "value": value,
                "value_type": type(value).__name__,
            },
        ) from e


decoder = partial(decode, dec_hook=decode_hook)
encoder = partial(encode, enc_hook=encode_hook)


def fix_string_json_values(input_data: dict[str, Any] | list[Any]) -> dict[str, Any] | list[Any]:
    """Recursively processes a Python dictionary to find string values that should be
    JSON arrays or objects (strings that look like '[]' or '{}') and converts
    them to actual Python objects.

    Args:
        input_data: A Python dictionary or any nested structure within it

    Returns:
        The same structure with any string representations of JSON properly parsed
    """
    if isinstance(input_data, dict):
        for key in input_data:
            if isinstance(input_data[key], str):
                if _looks_like_json(input_data[key]):
                    try:
                        parsed_value = loads(input_data[key])
                        input_data[key] = parsed_value
                        fix_string_json_values(input_data[key])
                    except JSONDecodeError:
                        pass
            else:
                fix_string_json_values(input_data[key])

    elif isinstance(input_data, list):
        for i in range(len(input_data)):
            if isinstance(input_data[i], str):
                if _looks_like_json(input_data[i]):
                    try:
                        parsed_item = loads(input_data[i])
                        input_data[i] = parsed_item
                        fix_string_json_values(input_data[i])
                    except JSONDecodeError:
                        pass
            else:
                fix_string_json_values(input_data[i])

    return input_data


def _looks_like_json(string_value: str) -> bool:
    """Checks if a string potentially represents a JSON array or object.

    Args:
        string_value: String to check

    Returns:
        Boolean indicating if the string looks like JSON
    """
    string_value = string_value.strip()

    if string_value.startswith("[") and string_value.endswith("]"):
        return True

    return string_value.startswith("{") and string_value.endswith("}")
