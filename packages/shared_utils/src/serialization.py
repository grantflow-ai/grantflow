from dataclasses import asdict, is_dataclass
from enum import Enum
from json import JSONDecodeError, loads
from typing import Any

from msgspec import MsgspecError
from msgspec.json import decode, encode
from msgspec import to_builtins as msgspec_to_builtins

from packages.shared_utils.src.exceptions import (
    DeserializationError,
    SerializationError,
)


def encode_hook(obj: Any) -> Any:
    if callable(obj):
        return None

    if isinstance(obj, Exception):
        error_dict = {
            "message": str(obj),
            "type": type(obj).__name__,
        }

        if hasattr(obj, "code"):
            error_dict["code"] = str(getattr(obj, "code", ""))
        if hasattr(obj, "details"):
            error_dict["details"] = str(getattr(obj, "details", ""))
        if hasattr(obj, "response"):
            response = getattr(obj, "response", None)
            if response and hasattr(response, "status_code"):
                error_dict["status_code"] = response.status_code

        return error_dict

    if isinstance(obj, Enum):
        return obj.value

    for key in (
        "to_dict",
        "as_dict",
        "dict",
        "model_dump",
        "json",
        "to_list",
        "tolist",
    ):
        if hasattr(obj, key) and callable(getattr(obj, key)):
            return getattr(obj, key)()

    if is_dataclass(obj) and not isinstance(obj, type):
        return {
            k: v if not isinstance(v, Enum) else v.value
            for (k, v) in asdict(obj).items()
        }

    raise TypeError(f"Unsupported type: {type(obj)!r}")


def deserialize[T](value: str | bytes, target_type: type[T]) -> T:
    try:
        return decode(value, type=target_type, strict=False)
    except MsgspecError as e:
        type_name = getattr(target_type, "__name__", str(target_type))
        raise DeserializationError(
            str(e),
            context={
                "value": value,
                "target_type": type_name,
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


def fix_string_json_values(
    input_data: dict[str, Any] | list[Any],
) -> dict[str, Any] | list[Any]:
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


def to_builtins(obj: Any) -> Any:
    return msgspec_to_builtins(obj, enc_hook=encode_hook)


def _looks_like_json(string_value: str) -> bool:
    string_value = string_value.strip()

    if string_value.startswith("[") and string_value.endswith("]"):
        return True

    return string_value.startswith("{") and string_value.endswith("}")


def extract_first_json_object(text: str) -> str | None:
    if not text or not text.strip():
        return None

    text = text.strip()
    if not text.startswith("{"):
        return None

    brace_count = 0
    in_string = False
    escape_next = False

    for i, char in enumerate(text):
        if escape_next:
            escape_next = False
            continue

        if char == "\\" and in_string:
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
            continue

        if not in_string:
            if char == "{":
                brace_count += 1
            elif char == "}":
                brace_count -= 1
                if brace_count == 0:
                    return text[: i + 1]

    return None
