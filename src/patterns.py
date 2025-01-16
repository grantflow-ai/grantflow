from re import Pattern
from re import compile as compile_regex
from typing import Final

TEMPLATE_VARIABLE_PATTERN: Final[Pattern[str]] = compile_regex("{{([^}]+)}}")
XML_TAG_PATTERN: Final[Pattern[str]] = compile_regex(r"<[^>]+>")
XML_CONTENT_PATTERN: Final[Pattern[str]] = compile_regex(r"<(?P<tag>[a-zA-Z0-9_:-]+)[^>]*>(?P<content>.*?)</(?P=tag)>")
