from enum import Enum
from functools import partial
from inspect import isclass
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
        raise DeserializationError(str(e)) from e


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
        # this guard is required for structlog
        value = value | kwargs

    try:
        return encode(value, enc_hook=encode_hook)
    except MsgspecError as e:
        raise SerializationError(str(e)) from e


decoder = partial(decode, dec_hook=decode_hook)
encoder = partial(encode, enc_hook=encode_hook)
