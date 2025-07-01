from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from anyio import Path as AsyncPath
from pytest import MonkeyPatch

from services.scraper.src.storage import CloudFileStorage, SimpleFileStorage

if TYPE_CHECKING:
    from pathlib import Path


async def test_simple_file_storage_save_file_text(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test saving a text file using SimpleFileStorage."""
    # Convert tmp_path to AsyncPath
    async_tmp_path = AsyncPath(tmp_path)

    # Monkeypatch the _results_folder to point to the temporary directory
    monkeypatch.setattr(SimpleFileStorage, "_results_folder", async_tmp_path)

    # Create an instance of SimpleFileStorage
    storage = SimpleFileStorage()

    # Define test data
    file_name = "test.txt"
    content = "Hello, world!"

    # Call save_file method
    await storage.save_file(file_name, content)

    # Verify the file exists
    target_file = async_tmp_path / file_name
    assert await target_file.exists()

    # Verify the file content
    read_content = await target_file.read_text()
    assert read_content == content


async def test_simple_file_storage_save_file_bytes(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test saving a binary file using SimpleFileStorage."""
    # Convert tmp_path to AsyncPath
    async_tmp_path = AsyncPath(tmp_path)

    # Monkeypatch the _results_folder to point to the temporary directory
    monkeypatch.setattr(SimpleFileStorage, "_results_folder", async_tmp_path)

    # Create an instance of SimpleFileStorage
    storage = SimpleFileStorage()

    # Define test data
    file_name = "test.bin"
    content = b"\x00\x01\x02\x03"

    # Call save_file method
    await storage.save_file(file_name, content)

    # Verify the file exists
    target_file = async_tmp_path / file_name
    assert await target_file.exists()

    # Verify the file content
    read_content = await target_file.read_bytes()
    assert read_content == content


async def test_cloud_file_storage_save_file_not_implemented() -> None:
    """Test that CloudFileStorage.save_file raises NotImplementedError."""
    storage = CloudFileStorage()
    with pytest.raises(NotImplementedError):
        await storage.save_file("test.txt", "Hello")
