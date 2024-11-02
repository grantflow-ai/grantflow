from __future__ import annotations


class Ref[T]:
    """A reference to a value that can be mutated."""

    value: T | None = None

    def __init__(self, value: T | None = None) -> None:
        self.value = value
