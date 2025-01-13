from decimal import Decimal
from re import Pattern
from re import compile as compile_re
from textwrap import dedent
from typing import Any, ClassVar
from uuid import UUID

from src.utils.serialization import serialize


class PromptTemplate:
    """A string template with variable validation."""

    pattern: ClassVar[Pattern[str]] = compile_re(r"\${([_a-zA-Z][_a-zA-Z0-9]*)}")

    def __init__(self, template: str) -> None:
        self.template = template

    @property
    def variables(self) -> set[str]:
        """Get the variables in the template."""
        return {*self.pattern.findall(self.template)}

    def prepare(self, **kwargs: Any) -> dict[str, Any]:
        """Prepare the keyword arguments for substitution.

        Args:
            **kwargs: The keyword arguments to prepare.

        Raises:
            ValueError: If invalid keys are provided.

        Returns:
            The prepared mapping.
        """
        if invalid_keys := [key for key in kwargs if key not in self.variables]:
            raise ValueError(
                f"Invalid keys provided to Template.substitute: {invalid_keys}"
                f"\n\n"
                f"Note: the template defines the following variables: {self.variables}"
            )

        mapping: dict[str, Any] = {}

        for key, value in kwargs.items():
            if isinstance(value, PromptTemplate):
                raise ValueError(f"Cannot substitute a PromptTemplate object: {value}")
            if isinstance(value, str):
                mapping[key] = value
            elif isinstance(value, (int | float | Decimal | UUID)):
                mapping[key] = str(value)
            elif isinstance(value, bytes):
                mapping[key] = value.decode()
            else:
                mapping[key] = serialize(value).decode()

        return mapping

    def substitute_partial(self, **kwargs: Any) -> "PromptTemplate":
        """Partially substitute the template.

        Args:
            **kwargs: The keyword arguments to substitute.

        Returns:
            The partially substituted template.
        """
        mapping = self.prepare(**kwargs)

        template = self.template
        for k, v in mapping.items():
            template = template.replace(f"${{{k}}}", v)

        return PromptTemplate(template)

    def substitute(self, **kwargs: Any) -> str:
        """Substitute the template.

        Args:
            **kwargs: The keyword arguments to substitute.

        Raises:
            ValueError: If invalid keys are provided.

        Returns:
            The substituted string.
        """
        mapping = self.prepare(**kwargs)
        template_string = self.template
        for key in self.variables:
            try:
                value = mapping[key]
                template_string = template_string.replace(f"${{{key}}}", value)
            except KeyError as e:
                raise ValueError(f"Missing value for variable '{key}' in template") from e
        return dedent(template_string).strip()

    def __str__(self) -> str:
        """Return the template string."""
        return self.template
