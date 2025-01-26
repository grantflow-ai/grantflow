from typing import TYPE_CHECKING

import pytest

from src.patterns import TEMPLATE_VARIABLE_PATTERN, XML_CONTENT_PATTERN, XML_TAG_PATTERN

if TYPE_CHECKING:
    from re import Match


@pytest.mark.parametrize(
    "test_input,expected_matches",
    [
        ("Hello {{name}}!", ["name"]),
        ("Hi {{name}}, your score is {{score}}", ["name", "score"]),
        ("Welcome to {{user profile}}", ["user profile"]),
        ("{{user_name}} scored {{points.total}}", ["user_name", "points.total"]),
        ("{{outer{inner}}}", ["outer{inner"]),
        ("{{incomplete} and {{also_incomplete", []),
        ("{{first}}{{second}}", ["first", "second"]),
        ("{{ spaces_around }}", [" spaces_around "]),
        ("Plain text without variables", []),
        ("{{user123}} {{item2_qty}}", ["user123", "item2_qty"]),
        ("{{{overlapping}}}", ["{overlapping"]),
    ],
)
def test_template_variables(test_input: str, expected_matches: list[str]) -> None:
    matches: list[str] = TEMPLATE_VARIABLE_PATTERN.findall(test_input)
    assert matches == expected_matches


@pytest.mark.parametrize(
    "test_input,expected_group",
    [
        ("Hello {{name}}!", "name"),
        ("{{complex.value}}", "complex.value"),
        ("{{ spaced }}", " spaced "),
        ("{{user_123}}", "user_123"),
    ],
)
def test_group_extraction(test_input: str, expected_group: str) -> None:
    match: Match[str] | None = TEMPLATE_VARIABLE_PATTERN.search(test_input)
    assert match is not None
    assert match.group(1) == expected_group


@pytest.mark.parametrize(
    "test_input,expected_matches,expected_positions",
    [
        ("{{a}}{{b}}{{c}}", ["a", "b", "c"], [(0, 5), (5, 10), (10, 15)]),
        ("Start {{mid}} end", ["mid"], [(6, 13)]),
    ],
)
def test_position_matching(
    test_input: str, expected_matches: list[str], expected_positions: list[tuple[int, int]]
) -> None:
    matches: list[tuple[str, tuple[int, int]]] = [
        (m.group(1), m.span()) for m in TEMPLATE_VARIABLE_PATTERN.finditer(test_input)
    ]
    assert [m[0] for m in matches] == expected_matches
    assert [m[1] for m in matches] == expected_positions


@pytest.mark.parametrize(
    "test_input,expected_matches",
    [
        ("<tag>", ["<tag>"]),
        ("<tag></tag>", ["<tag>", "</tag>"]),
        ("<tag attr='value'>", ["<tag attr='value'>"]),
        ('<tag attr="value">', ['<tag attr="value">']),
        ("<self-closing/>", ["<self-closing/>"]),
        ("<tag attr1='v1' attr2=\"v2\">", ["<tag attr1='v1' attr2=\"v2\">"]),
        ("<ns:tag>", ["<ns:tag>"]),
        ("Text without tags", []),
        ("Multiple <tag1> and <tag2>", ["<tag1>", "<tag2>"]),
        ("<nested><tags></tags></nested>", ["<nested>", "<tags>", "</tags>", "</nested>"]),
        ("< invalid >", ["< invalid >"]),
        ("<tag with spaces>", ["<tag with spaces>"]),
        ("<tag\nwith\nlinebreaks>", ["<tag\nwith\nlinebreaks>"]),
    ],
)
def test_xml_tags(test_input: str, expected_matches: list[str]) -> None:
    matches: list[str] = XML_TAG_PATTERN.findall(test_input)
    assert matches == expected_matches


@pytest.mark.parametrize(
    "test_input,expected_positions",
    [
        ("<tag1><tag2>", [(0, 6), (6, 12)]),
        ("Text <tag> more text", [(5, 10)]),
        ("<outer><inner></inner></outer>", [(0, 7), (7, 14), (14, 22), (22, 30)]),
    ],
)
def test_tag_positions(test_input: str, expected_positions: list[tuple[int, int]]) -> None:
    matches: list[tuple[int, int]] = [m.span() for m in XML_TAG_PATTERN.finditer(test_input)]
    assert matches == expected_positions


@pytest.mark.parametrize(
    "test_input,match_content",
    [
        ("<simple>", "simple"),
        ("<tag attr='value'>", "tag attr='value'"),
        ("</closing>", "/closing"),
        ("<self-closing/>", "self-closing/"),
    ],
)
def test_tag_content(test_input: str, match_content: str) -> None:
    match: Match[str] | None = XML_TAG_PATTERN.search(test_input)
    assert match is not None

    inner_content: str = match.group()[1:-1]
    assert inner_content == match_content


@pytest.mark.parametrize(
    "test_input,expected_tag,expected_content",
    [
        ("<tag>content</tag>", "tag", "content"),
        ("<div>nested <span>content</span></div>", "div", "nested <span>content</span>"),
        ("<p class='test'>text</p>", "p", "text"),
        ("<ns:elem>data</ns:elem>", "ns:elem", "data"),
        ("<tag_1>numeric</tag_1>", "tag_1", "numeric"),
        ("<empty></empty>", "empty", ""),
        ("<tag attr='value'>spaced content</tag>", "tag", "spaced content"),
    ],
)
def test_content_extraction(test_input: str, expected_tag: str, expected_content: str) -> None:
    match: Match[str] | None = XML_CONTENT_PATTERN.search(test_input)
    assert match is not None
    groups: dict[str, str] = match.groupdict()
    assert groups["tag"] == expected_tag
    assert groups["content"] == expected_content


@pytest.mark.parametrize(
    "test_input,expected_count",
    [
        ("<div>one</div><div>two</div>", 2),
        ("No matches here", 0),
        ("<tag>content</tag><empty></empty>", 2),
        ("<div>a</div><p>b</p><span>c</span>", 3),
    ],
)
def test_multiple_matches(test_input: str, expected_count: int) -> None:
    matches: list[Match[str]] = list(XML_CONTENT_PATTERN.finditer(test_input))
    assert len(matches) == expected_count


@pytest.mark.parametrize(
    "test_input",
    [
        "<tag>mismatched</other>",
        "<tag>unclosed",
        "<>empty</empty>",
        "<tag>content</tag",
        "tag>invalid start</tag>",
        "<tag attr='value'content</tag>",
    ],
)
def test_non_matching_patterns(test_input: str) -> None:
    match: Match[str] | None = XML_CONTENT_PATTERN.search(test_input)
    assert match is None


@pytest.mark.parametrize(
    "test_input,expected_matches",
    [
        ("<div>1</div><div>2</div>", [("div", "1"), ("div", "2")]),
        ("<p>text</p><span>more</span>", [("p", "text"), ("span", "more")]),
    ],
)
def test_tag_content_pairs(test_input: str, expected_matches: list[tuple[str, str]]) -> None:
    matches: list[tuple[str, str]] = [
        (m.group("tag"), m.group("content")) for m in XML_CONTENT_PATTERN.finditer(test_input)
    ]
    assert matches == expected_matches
