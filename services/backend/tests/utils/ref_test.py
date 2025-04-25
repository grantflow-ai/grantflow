from typing import Any

import pytest
from shared_utils.src.ref import Ref


@pytest.mark.parametrize("input_value", [1, "a", True, None, 1.1, 2 + 3j, {"a ": "b"}, [1, 2]])
def test_ref_with_different_types(input_value: Any) -> None:
    ref = Ref(input_value)  # type: ignore[var-annotated]
    assert ref.value == input_value


@pytest.mark.parametrize("input_value", [1, "a", True, None])
def test_ref_with_different_types_async(input_value: Any) -> None:
    ref = Ref(input_value)  # type: ignore[var-annotated]
    assert ref.value == input_value


@pytest.mark.parametrize("t", [int, str, bool, None])
def test_ref_correct_type(t: Any) -> None:
    ref = Ref()  # type: ignore[var-annotated]
    assert ref.value is None

    if t is not None and t is not type(None):
        ref = Ref(t())
        assert isinstance(ref.value, t)


@pytest.mark.parametrize("t", [int, str, bool, None])
def test_ref_correct_type_async(t: Any) -> None:
    ref = Ref()  # type: ignore[var-annotated]
    assert ref.value is None

    if t is not None and t is not type(None):
        ref = Ref(t())
        assert isinstance(ref.value, t)
