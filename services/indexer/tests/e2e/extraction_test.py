import logging
from json import dumps
from mimetypes import guess_type
from os import environ
from pathlib import Path
from typing import cast

import pytest
from azure.ai.documentintelligence.models import AnalyzeResult
from services.indexer.src.extraction import extract_file_content
from services.indexer.src.files import FileDTO

from tests.test_utils import RESULTS_FOLDER, TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_extraction(logger: logging.Logger, data_file: Path) -> None:
    if data_file.name.endswith(".pdf"):
        return

    logger.info("Running end-to-end test for extracting text from a document")
    mime_type = cast("str", guess_type(data_file.name)[0])
    file_dto = FileDTO(content=data_file.read_bytes(), filename=data_file.name, mime_type=mime_type)
    result, _ = await extract_file_content(content=file_dto.content, mime_type=file_dto.mime_type)
    ext = "json" if isinstance(result, dict) else "md"
    content = dumps(result) if isinstance(result, AnalyzeResult) else result

    existing_results = RESULTS_FOLDER / f"parse_{file_dto.filename}_data_test_result.{ext}"
    if not existing_results.exists():
        existing_results.write_text(content)
    else:
        assert content == existing_results.read_text()
