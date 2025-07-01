from __future__ import annotations

from typing import TYPE_CHECKING

from anyio import Path as AsyncPath
from services.scraper.src.storage import SimpleFileStorage

if TYPE_CHECKING:
    from pathlib import Path

    from pytest import MonkeyPatch


async def test_simple_file_storage_save_file_text(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test saving a text file using SimpleFileStorage."""

    async_tmp_path = AsyncPath(tmp_path)


    monkeypatch.setattr(SimpleFileStorage, "_results_folder", async_tmp_path)


    storage = SimpleFileStorage()


    file_name = "test.txt"
    content = "Hello, world!"


    await storage.save_file(file_name, content)


    target_file = async_tmp_path / file_name
    assert await target_file.exists()


    read_content = await target_file.read_text()
    assert read_content == content


async def test_simple_file_storage_save_file_bytes(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test saving a binary file using SimpleFileStorage."""

    async_tmp_path = AsyncPath(tmp_path)


    monkeypatch.setattr(SimpleFileStorage, "_results_folder", async_tmp_path)


    storage = SimpleFileStorage()


    file_name = "test.bin"
    content = b"\x00\x01\x02\x03"


    await storage.save_file(file_name, content)


    target_file = async_tmp_path / file_name
    assert await target_file.exists()


    read_content = await target_file.read_bytes()
    assert read_content == content
