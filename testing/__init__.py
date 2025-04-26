from collections.abc import Generator
from pathlib import Path
from typing import Final


def _file_path_generator(folder: Path) -> Generator[Path, None, None]:
    for path in folder.glob("*"):
        if path.is_dir():
            yield from _file_path_generator(path)
        yield path


SOURCES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "sources"
RESULTS_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "results"
FIXTURES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "fixtures"
SYNTHETIC_DATA_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "synthetic"
TEST_DATA_SOURCES: Generator[Path, None, None] = _file_path_generator(SOURCES_FOLDER / "application_sources")
TEST_DATA_RESULTS: Generator[Path, None, None] = _file_path_generator(RESULTS_FOLDER)
CFP_FIXTURES: Generator[Path, None, None] = _file_path_generator(FIXTURES_FOLDER / "cfps")
