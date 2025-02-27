from collections import defaultdict
from collections.abc import MutableMapping, Sequence

from src.rag.grant_template.validation_utils import detect_cycle


def create_graph(edges: list[tuple[str, list[str]]]) -> MutableMapping[str, Sequence[str]]:
    graph = defaultdict(list)
    for node, neighbors in edges:
        graph[node] = neighbors
    return graph


def test_detect_cycle_no_cycle() -> None:
    graph = create_graph(
        [
            ("a", ["b", "c"]),
            ("b", ["d"]),
            ("c", ["d"]),
            ("d", []),
        ]
    )

    assert not detect_cycle(graph, "a", set(), set())
    assert not detect_cycle(graph, "b", set(), set())
    assert not detect_cycle(graph, "c", set(), set())
    assert not detect_cycle(graph, "d", set(), set())


def test_detect_cycle_simple_cycle() -> None:
    graph = create_graph(
        [
            ("a", ["b"]),
            ("b", ["c"]),
            ("c", ["a"]),
        ]
    )

    assert detect_cycle(graph, "a", set(), set())
    assert detect_cycle(graph, "b", set(), set())
    assert detect_cycle(graph, "c", set(), set())


def test_detect_cycle_self_cycle() -> None:
    graph = create_graph([("a", ["a"])])
    assert detect_cycle(graph, "a", set(), set())


def test_detect_cycle_complex() -> None:
    graph = create_graph(
        [
            ("a", ["b", "c"]),
            ("b", ["d", "e"]),
            ("c", ["f"]),
            ("d", ["g"]),
            ("e", ["g"]),
            ("f", ["h"]),
            ("g", ["i"]),
            ("h", ["i"]),
            ("i", ["j"]),
            ("j", ["k"]),
            ("k", ["e"]),
            ("1", ["2"]),
            ("2", []),
        ]
    )

    assert detect_cycle(graph, "a", set(), set())  # a -> b -> d -> g -> i -> j -> k -> e -> g
    assert detect_cycle(graph, "b", set(), set())  # b -> d -> g -> i -> j -> k -> e -> g
    assert detect_cycle(graph, "c", set(), set())  # c -> f -> h -> i -> j -> k -> e -> g -> i
    assert not detect_cycle(graph, "1", set(), set())  # 1 -> 2
