import pytest
from msgspec import DecodeError
from pytest_mock import MockFixture

from src.exceptions import DeserializationError
from src.utils.serialization import deserialize


def test_deserialize_decode_error(mocker: MockFixture) -> None:
    with (
        mocker.patch(
            "src.utils.serialization.decode",
            side_effect=DecodeError("Failed to decode the request body"),
        ),
    ):
        with pytest.raises(DeserializationError) as exc_info:
            deserialize("invalid", dict)
        assert str(exc_info.value.args[0]) == "Failed to decode the request body"
