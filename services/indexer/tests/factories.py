from polyfactory.factories import TypedDictFactory

from db.src.json_objects import Chunk


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
