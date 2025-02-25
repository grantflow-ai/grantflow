def detect_cycle(
    graph: dict[str, list[str]], start: str, visited: set[str] | None = None, path: set[str] | None = None
) -> bool:
    """Detect cycles in a directed graph using DFS.

    Args:
        graph: Adjacency list representation of graph.
        start: Current node being visited.
        visited: Set of all visited nodes.
        path: Set of nodes in current DFS path.

    Returns:
        bool: True if cycle detected, False otherwise.
    """
    if visited is None:
        visited = set()

    if path is None:
        path = set()

    if start in path:  # Cycle detected in the current path
        return True

    if start in visited:  # Already fully explored
        return False

    path.add(start)

    cycle_found = any(detect_cycle(graph, neighbor, visited, path) for neighbor in graph.get(start, []))

    path.remove(start)  # Backtrack
    visited.add(start)  # Mark node fully explored

    return cycle_found  # Return the correct cycle status
