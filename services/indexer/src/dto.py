from typing import TypedDict

from packages.db.src.json_objects import Chunk


class VectorDTO(TypedDict):
    embedding: list[float]
    rag_file_id: str
    chunk: Chunk
