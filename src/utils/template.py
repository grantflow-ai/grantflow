from decimal import Decimal
from itertools import chain
from string import Template as StringTemplate
from textwrap import dedent
from typing import Any
from uuid import UUID

from src.utils.serialization import serialize


class Template(StringTemplate):
    """A string template with variable validation."""

    @property
    def variables(self) -> set[str]:
        """Get the variables in the template."""
        return {v for v in chain(*self.pattern.findall(self.template)) if v}

    def substitute_partial(self, **kwargs: Any) -> "Template":
        """Partially substitute the template.

        Args:
            **kwargs: The keyword arguments to substitute.

        Returns:
            The partially substituted template.
        """
        return Template(super().substitute(kwargs))

    def substitute(self, **kwargs: Any) -> str:  # type: ignore[override]
        """Substitute the template.

        Args:
            **kwargs: The keyword arguments to substitute.

        Raises:
            ValueError: If invalid keys are provided.

        Returns:
            The substituted string.
        """
        if invalid_keys := [key for key in kwargs if key not in self.variables]:
            raise ValueError(
                f"Invalid keys provided to Template.substitute: {invalid_keys}"
                f"\n\n"
                f"Note: the template defines the following variables: {self.variables}"
            )

        mapping: dict[str, Any] = {}

        for key, value in kwargs.items():
            if isinstance(value, Template):
                raise ValueError(f"Cannot substitute a Template object: {value}")
            if isinstance(value, str):
                mapping[key] = value
            elif isinstance(value, (int | float | Decimal | UUID)):
                mapping[key] = str(value)
            elif isinstance(value, bytes):
                mapping[key] = value.decode()
            else:
                mapping[key] = serialize(value).decode()

        return dedent(super().substitute(mapping)).strip()
