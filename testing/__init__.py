from collections.abc import Generator
from pathlib import Path
from typing import Final


def _file_path_generator(folder: Path) -> Generator[Path]:
    for path in folder.glob("*"):
        if path.is_dir():
            yield from _file_path_generator(path)
        else:
            yield path


def _get_file_paths(folder: Path) -> list[Path]:
    return list(_file_path_generator(folder))


SOURCES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "sources"
RESULTS_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "results"
FIXTURES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "fixtures"
SYNTHETIC_DATA_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "synthetic"
TEST_DATA_SOURCES: list[Path] = _get_file_paths(SOURCES_FOLDER / "application_sources")
TEST_DATA_RESULTS: list[Path] = _get_file_paths(RESULTS_FOLDER)
CFP_FIXTURES: list[Path] = _get_file_paths(FIXTURES_FOLDER / "cfps")
