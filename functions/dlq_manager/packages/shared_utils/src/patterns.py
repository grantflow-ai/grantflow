from re import Pattern
from re import compile as compile_regex
from typing import Final

SNAKE_CASE_PATTERN: Final[Pattern[str]] = compile_regex(r"^[a-z][a-z0-9_]*$")
