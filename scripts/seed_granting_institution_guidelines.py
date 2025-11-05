import asyncio
from os import environ
from pathlib import Path
from typing import Any, TypedDict

import yaml
from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantingInstitution, GrantingInstitutionSource, RagFile, RagSource
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class GuidelineFile(TypedDict):
    subdir: str | None
    filename: str


class InstitutionConfig(TypedDict):
    name: str
    guidelines: list[GuidelineFile]


class GuidelinesConfig(TypedDict):
    institutions: list[InstitutionConfig]


async def _process_guideline_file(
    *,
    file_path: Path,
    filename: str,
    institution_id: str,
    session_maker: async_sessionmaker[Any],
) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"Guideline file not found: {file_path}")

    file_size = file_path.stat().st_size

    async with session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                indexing_status=SourceIndexingStatusEnum.CREATED,
                text_content=None,
                source_type=RAG_FILE,
            )
            .returning(RagSource.id)
        )

        await session.execute(
            insert(RagFile).values(
                id=source_id,
                filename=filename,
                mime_type="application/pdf",
                size=file_size,
                bucket_name="guidelines",
                object_path=str(file_path),
            )
        )

        await session.execute(
            insert(GrantingInstitutionSource).values(
                rag_source_id=source_id,
                granting_institution_id=institution_id,
            )
        )

    logger.info("Guideline processed", filename=filename, source_id=str(source_id))


def _build_guideline_path(base_dir: Path, subdir: str | None, filename: str) -> Path:
    if subdir:
        return base_dir / subdir / filename
    return base_dir / filename


async def seed_granting_institution_guidelines(session_maker: async_sessionmaker[Any]) -> int:
    config_path = Path(__file__).parent / "guidelines_config.yaml"
    guidelines_dir = Path(__file__).parent.parent / "testing/test_data/sources/guidelines"

    with config_path.open("r") as f:
        config: GuidelinesConfig = yaml.safe_load(f)

    async with session_maker() as session:
        institutions = {row.full_name: row.id for row in await session.scalars(select(GrantingInstitution))}

    total_uploaded = 0

    for institution_config in config["institutions"]:
        institution_name = institution_config["name"]
        institution_id = institutions.get(institution_name)

        if not institution_id:
            logger.warning("Institution not found, skipping", institution_name=institution_name)
            continue

        for guideline in institution_config["guidelines"]:
            file_path = _build_guideline_path(guidelines_dir, guideline["subdir"], guideline["filename"])

            try:
                await _process_guideline_file(
                    file_path=file_path,
                    filename=guideline["filename"],
                    institution_id=str(institution_id),
                    session_maker=session_maker,
                )
                total_uploaded += 1
            except FileNotFoundError as e:
                logger.error("Guideline file missing", error=str(e), filename=guideline["filename"])
                raise

    logger.info("Guidelines seeding complete", total_uploaded=total_uploaded)
    return total_uploaded


async def seed_guidelines() -> None:
    load_dotenv()

    if "DATABASE_CONNECTION_STRING" not in environ:
        environ["DATABASE_CONNECTION_STRING"] = "postgresql+asyncpg://local:local@db:5432/local"
        logger.info("Using local database connection")

    session_maker = get_session_maker()
    await seed_granting_institution_guidelines(session_maker)


if __name__ == "__main__":
    asyncio.run(seed_guidelines())
