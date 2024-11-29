from typing import TypeVar

import pytest

from src.utils.ref import Ref

T = TypeVar("T")


class TestRef:
    @pytest.mark.parametrize("input_value", [1, "a", True, None, 1.1, 2 + 3j, {"a ": "b"}, [1, 2]])
    def test_ref_with_different_types(self, input_value: T) -> None:
        ref = Ref[T](input_value)
        assert ref.value == input_value

    @pytest.mark.parametrize("input_value", [1, "a", True, None])
    def test_ref_with_different_types_async(self, input_value: T) -> None:
        ref = Ref[T](input_value)
        assert ref.value == input_value

    @pytest.mark.parametrize("t", [int, str, bool, None])
    def test_ref_correct_type(self, t: type[T]) -> None:
        ref = Ref[T]()
        assert ref.value is None

        if t is not None and t is not type(None):
            ref = Ref[T](t())
            assert isinstance(ref.value, t)

    @pytest.mark.parametrize("t", [int, str, bool, None])
    def test_ref_correct_type_async(self, t: type[T]) -> None:
        ref = Ref[T]()
        assert ref.value is None

        if t is not None and t is not type(None):
            ref = Ref[T](t())
            assert isinstance(ref.value, t)
