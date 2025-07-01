from __future__ import annotations

from typing import Final, Protocol

from anyio import Path as AsyncPath

from services.scraper.src.url_utils import get_identifier_from_filename


class Storage(Protocol):
    """A protocol to represent a storage object.

    We implement a filesystem storage object locally, and in production use cloud storage.

    The logic of saving into a directory and deciding on the naming conventions etc. should be abstracted into
    this protocol.
    """

    async def save_file(self, file_name: str, content: bytes | str) -> None:
        """Save file to storage.

        Args:
            file_name: The name of the file to save.
            content: The data to save.

        Returns:
            None
        """

    async def get_existing_file_identifiers(self) -> set[str]:
        """Get a list file identifiers from storage, extracting the id component out of
            `grant_search_result-<identifier>.<extension>`.

        Returns:
            A set of filenames without extension.
        """


class SimpleFileStorage(Storage):
    """A simple file storage implementation."""

    _results_folder: Final[AsyncPath] = AsyncPath("./.results")

    async def save_file(self, file_name: str, content: bytes | str) -> None:
        """Save file to storage.

        Args:
            file_name: The name of the file to save.
            content: The data to save.

        Returns:
            None
        """
        await self._results_folder.mkdir(exist_ok=True)

        target = AsyncPath(self._results_folder / file_name)

        if isinstance(content, str):
            await target.write_text(content)
        else:
            await target.write_bytes(content)

    async def get_existing_file_identifiers(self) -> set[str]:
        """Get a list file identifiers from storage, extracting the id component out of
            `grant_search_result-<identifier>.<extension>`.

        Returns:
            A set of filenames without extension.
        """
        if not await self._results_folder.exists():
            return set()

        filenames = [
            async_path.name async for async_path in self._results_folder.iterdir() if await async_path.is_file()
        ]
        return {get_identifier_from_filename(filename) for filename in filenames}
