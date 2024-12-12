import logging
from enum import Enum
from functools import partial
from inspect import isclass
from typing import Any, TypeVar

from msgspec import MsgspecError
from msgspec.json import decode, encode
from pydantic import BaseModel

from src.db.tables import Base
from src.exceptions import DeserializationError, SerializationError

logger = logging.getLogger(__name__)
T = TypeVar("T")


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
    if isinstance(obj, Base):
        attrs = [attr for attr in dir(obj) if not attr.startswith("_") and attr not in ("metadata", "registry")]

        res: dict[str, Any] = {}
        for attr in attrs:
            v = getattr(obj, attr)
            if isinstance(v, str) and v.startswith("Traceback"):
                continue
            res[attr] = v if not isinstance(v, Enum) else v.value

        return res

    if isinstance(obj, BaseModel):
        return {k: v if not isinstance(v, Enum) else v.value for (k, v) in obj.model_dump().items()}

    if callable(obj):
        return None

    raise TypeError(f"Unsupported type: {type(obj)!r}")


def deserialize(value: str | bytes, target_type: type[T]) -> T:
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
        logger.error("failed to decode value of type %s", type(value).__name__)
        raise DeserializationError(str(e)) from e


def serialize(
    value: Any,
) -> bytes:
    """Encode an object into a JSON string.

    Args:
        value: Value to serialize to JSON.

    Raises:
        SerializationError: If the value cannot be serialized.

    Returns:
        A JSON string.
    """
    try:
        return encode(value, enc_hook=encode_hook)
    except MsgspecError as e:
        logger.error("failed to encode value of type %s", type(value).__name__)
        raise SerializationError(str(e)) from e


decoder = partial(decode, dec_hook=decode_hook)
encoder = partial(encode, enc_hook=encode_hook)
