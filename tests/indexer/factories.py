from polyfactory.factories import TypedDictFactory

from src.db.json_objects import Chunk


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
