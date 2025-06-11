from packages.shared_utils.src.patterns import SNAKE_CASE_PATTERN


async def test_snake_case_pattern_valid_strings() -> None:
    valid_strings = ["variable", "variable_name", "variable_name_1", "v1", "a_b_c_1_2_3"]

    for s in valid_strings:
        assert SNAKE_CASE_PATTERN.match(s) is not None


async def test_snake_case_pattern_invalid_strings() -> None:
    invalid_strings = [
        "",
        "Variable",
        "variable-name",
        "1variable",
        "variable name",
        "VARIABLE",
        "_variable",
    ]

    for s in invalid_strings:
        assert SNAKE_CASE_PATTERN.match(s) is None


async def test_snake_case_pattern_edge_cases() -> None:
    # Pattern allows trailing underscores
    assert SNAKE_CASE_PATTERN.match("variable_") is not None
    assert SNAKE_CASE_PATTERN.match("var__name") is not None
    assert SNAKE_CASE_PATTERN.match("a_") is not None
