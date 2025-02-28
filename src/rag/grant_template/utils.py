def detect_cycle(
    graph: dict[str, list[str]],
    start: str,
    visited: set[str] | None = None,
    path: set[str] | None = None,
    path_list: list[str] | None = None,
) -> set[str]:
    """Detect cycles in a directed graph using DFS and return cycle nodes.

    Args:
        graph: Adjacency list representation of graph.
        start: Current node being visited.
        visited: Set of all visited nodes.
        path: Set of nodes in current DFS path.
        path_list: List to track the current path for cycle detection.

    Returns:
        set[str]: Set of nodes in the cycle if detected, empty set otherwise.
    """
    if visited is None:
        visited = set()

    if path is None:
        path = set()

    if path_list is None:
        path_list = []

    if start in path:
        cycle_start_idx = path_list.index(start)
        return set(path_list[cycle_start_idx:])

    if start in visited:
        return set()

    path.add(start)
    path_list.append(start)

    cycle_nodes = set()
    for neighbor in graph.get(start, []):
        if found_cycle := detect_cycle(graph, neighbor, visited, path, path_list):
            cycle_nodes.update(found_cycle)
            break

    path_list.pop()
    path.remove(start)
    visited.add(start)

    return cycle_nodes
