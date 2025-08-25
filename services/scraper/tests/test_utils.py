from typing import Any
from unittest.mock import MagicMock


class MockAsyncIterator:
    def __init__(self, docs: list[Any]) -> None:
        self.docs = docs
        self.index = 0

    def __aiter__(self) -> "MockAsyncIterator":
        return self

    async def __anext__(self) -> Any:
        if self.index >= len(self.docs):
            raise StopAsyncIteration
        doc = self.docs[self.index]
        self.index += 1
        return doc


def create_mock_firestore_doc(doc_id: str) -> MagicMock:
    mock_doc = MagicMock()
    mock_doc.id = doc_id
    return mock_doc
