"""Testing infrastructure for the grantflow monorepo."""

from pathlib import Path

__version__ = "0.1.0"

# Find project root (where testing_data/ lives)
_PACKAGE_ROOT = Path(__file__).parent
_PROJECT_ROOT = _PACKAGE_ROOT.parent.parent.parent.parent  # Up to monorepo root

# Test data paths
TESTING_DATA_ROOT = _PROJECT_ROOT / "testing_data"
SOURCES_FOLDER = TESTING_DATA_ROOT / "sources"
FIXTURES_FOLDER = TESTING_DATA_ROOT / "fixtures"
RESULTS_FOLDER = _PROJECT_ROOT / "testing_results"
SCENARIOS_FOLDER = TESTING_DATA_ROOT / "scenarios"

# Test source files (all PDFs and DOCX files in sources/)
TEST_DATA_SOURCES: list[Path] = []
if SOURCES_FOLDER.exists():
    TEST_DATA_SOURCES = sorted(SOURCES_FOLDER.rglob("*.pdf")) + sorted(SOURCES_FOLDER.rglob("*.docx"))

__all__ = [
    "FIXTURES_FOLDER",
    "RESULTS_FOLDER",
    "SCENARIOS_FOLDER",
    "SOURCES_FOLDER",
    "TESTING_DATA_ROOT",
    "TEST_DATA_SOURCES",
    "__version__",
]
