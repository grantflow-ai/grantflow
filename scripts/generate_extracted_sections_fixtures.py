
import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize, serialize
from services.rag.src.grant_template.extract_sections import handle_extract_sections

logger = get_logger(__name__)


async def generate_extracted_sections_fixture(
    cfp_analysis_fixture_path: Path,
    output_fixture_path: Path,
) -> None:
    logger.info("Loading CFP analysis fixture from %s", cfp_analysis_fixture_path)

    cfp_analysis = deserialize(cfp_analysis_fixture_path.read_bytes(), CFPAnalysis)

    logger.info(
        "Running handle_extract_sections on %d content sections",
        len(cfp_analysis["content"])
    )

    mock_job_manager = AsyncMock()
    mock_job_manager.ensure_not_cancelled = AsyncMock()

    async def mock_retrieve_documents(*args: Any, **kwargs: Any) -> list[str]:
        return []  

    with patch("services.rag.src.grant_template.extract_sections.retrieve_documents", side_effect=mock_retrieve_documents):
        extracted_sections = await handle_extract_sections(
            cfp_content=cfp_analysis["content"],
            cfp_analysis=cfp_analysis,
            job_manager=mock_job_manager,
            trace_id=f"fixture-generation-{cfp_analysis_fixture_path.stem}",
        )

    logger.info(
        "Generated %d extracted sections (%d long-form)",
        len(extracted_sections),
        sum(1 for s in extracted_sections if s.get("long_form"))
    )

    output_fixture_path.parent.mkdir(parents=True, exist_ok=True)
    output_fixture_path.write_bytes(serialize(extracted_sections))

    logger.info("Saved extracted_sections fixture to %s", output_fixture_path)


async def main() -> None:
    fixtures_base = Path("testing/test_data/fixtures")
    cfp_analysis_dir = fixtures_base / "cfp_analysis"
    extracted_sections_dir = fixtures_base / "extracted_sections"

    fixtures_to_generate = [
        {
            "name": "MRA",
            "cfp_analysis_path": cfp_analysis_dir / "mra_2023_2024_cfp_analysis.json",
            "output_path": extracted_sections_dir / "mra_2023_2024_extracted_sections.json",
        },
        {
            "name": "NIH PAR-25-450",
            "cfp_analysis_path": cfp_analysis_dir / "nih_par_25_450_cfp_analysis.json",
            "output_path": extracted_sections_dir / "nih_par_25_450_extracted_sections.json",
        },
    ]

    for fixture_config in fixtures_to_generate:
        logger.info("=" * 80)
        logger.info("Generating %s extracted_sections fixture", fixture_config["name"])
        logger.info("=" * 80)

        await generate_extracted_sections_fixture(
            cfp_analysis_fixture_path=fixture_config["cfp_analysis_path"],
            output_fixture_path=fixture_config["output_path"],
        )

        logger.info("✅ %s fixture generated successfully\n", fixture_config["name"])

    logger.info("=" * 80)
    logger.info("All extracted_sections fixtures generated successfully!")
    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
