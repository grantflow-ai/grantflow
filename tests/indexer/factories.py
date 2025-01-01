from polyfactory.factories import TypedDictFactory

from src.indexer.dto import Chunk


class ChunkFactory(TypedDictFactory[Chunk]):
    __model__ = Chunk
