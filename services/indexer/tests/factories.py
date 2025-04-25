from packages.db.src.json_objects import Chunk
from polyfactory.factories import TypedDictFactory


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
