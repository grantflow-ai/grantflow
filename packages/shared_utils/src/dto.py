from typing import TypedDict

from packages.db.src.json_objects import Chunk


class VectorDTO(TypedDict):
    embedding: list[float]
    rag_source_id: str
    chunk: Chunk
