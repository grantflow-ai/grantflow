from enum import Enum
from functools import partial
from inspect import isclass
from json import JSONDecodeError, loads
from typing import Any

from msgspec import MsgspecError
from msgspec.json import decode, encode
from pydantic import BaseModel

from packages.shared_utils.src.exceptions import DeserializationError, SerializationError


def decode_hook(target: Any, value: dict[str, Any]) -> Any:
    if isclass(target) and issubclass(target, BaseModel):
        return target(**value)

    raise TypeError(f"Unsupported type: {type(target)!r}")


def encode_hook(obj: Any) -> Any:
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
    string_value = string_value.strip()

    if string_value.startswith("[") and string_value.endswith("]"):
        return True

    return string_value.startswith("{") and string_value.endswith("}")
