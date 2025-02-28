import asyncio
from collections.abc import Generator
from pathlib import Path
from typing import Any, Final
from unittest.mock import Mock

from anyio import Path as AsyncPath
from sanic import Request
from sanic.compat import Header
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.db.enums import FileIndexingStatusEnum
from src.db.json_objects import ResearchObjective
from src.db.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    OrganizationFile,
    RagFile,
    TextVector,
    Workspace,
)
from src.files import FileDTO
from src.indexer.files import parse_and_index_file
from src.rag.grant_template.handler import grant_template_generation_pipeline_handler
from src.utils.extraction import extract_file_content
from src.utils.serialization import deserialize, serialize


def _file_path_generator(folder: Path) -> Generator[Path, None, None]:
    for path in folder.glob("*"):
        if path.is_dir():
            yield from _file_path_generator(path)
        yield path


SOURCES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "sources"
RESULTS_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "results"
FIXTURES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "fixtures"
SYNTHETHIC_DATA_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "synthethic"
TEST_DATA_SOURCES: Generator[Path, None, None] = _file_path_generator(SOURCES_FOLDER / "application_sources")
TEST_DATA_RESULTS: Generator[Path, None, None] = _file_path_generator(RESULTS_FOLDER)
CFP_FIXTURES: Generator[Path, None, None] = _file_path_generator(FIXTURES_FOLDER / "cfps")


async def get_funding_organization(
    async_session_maker: async_sessionmaker[Any], abbreviation: str
) -> FundingOrganization:
    async with async_session_maker() as session:
        result = await session.execute(
            select(FundingOrganization).where(FundingOrganization.abbreviation == abbreviation)
        )
        funding_org: FundingOrganization = result.scalar_one()
        return funding_org


def ensure_directory_exists(directory: Path) -> None:
    if not directory.exists():
        directory.mkdir(parents=True)


def get_source_files(source_folder: Path) -> list[Path]:
    assert source_folder.exists(), f"Source folder {source_folder} does not exist"
    sources = list(source_folder.glob("*.pdf"))
    if not sources:
        raise FileNotFoundError(f"No guidelines found in {source_folder}")
    return sources


async def parse_and_store_source_files(
    funding_organization_id: str,
    source_files: list[Path],
    async_session_maker: async_sessionmaker[Any],
    target_folder: Path,
) -> None:
    await asyncio.gather(
        *[
            parse_source_file(
                organization_id=funding_organization_id,
                source_file=source_file,
                async_session_maker=async_session_maker,
                target_folder=target_folder,
            )
            for source_file in source_files
        ]
    )


async def process_organization_files(
    funding_organization: FundingOrganization, data_fixture_folder: Path, async_session_maker: async_sessionmaker[Any]
) -> None:
    async with async_session_maker() as session, session.begin():
        for organization_file in data_fixture_folder.glob("*.json"):
            data = deserialize(organization_file.read_bytes(), dict[str, Any])
            rag_file_data = data.pop("rag_file")
            rag_file_id = data.pop("rag_file_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_file_id,
                        **{
                            k: v
                            for k, v in rag_file_data.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        },
                    }
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(
                insert(OrganizationFile)
                .values(
                    {
                        "funding_organization_id": funding_organization.id,
                        "rag_file_id": rag_file_id,
                    }
                )
                .on_conflict_do_nothing(index_elements=["funding_organization_id", "rag_file_id"])
            )
            await session.execute(
                insert(TextVector)
                .values(
                    [
                        {
                            k: v
                            for k, v in text_vector.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        }
                        for text_vector in text_vectors
                    ]
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
        await session.commit()


async def process_funding_organization(
    async_session_maker: async_sessionmaker[Any], abbreviation: str
) -> FundingOrganization:
    funding_organization = await get_funding_organization(async_session_maker, abbreviation)
    data_fixture_folder = FIXTURES_FOLDER / "organization_files" / abbreviation.lower() / "files"
    ensure_directory_exists(data_fixture_folder)

    organization_files = list(data_fixture_folder.glob("*.json"))
    if not organization_files:
        source_folder = SOURCES_FOLDER / "guidelines" / abbreviation.lower()
        source_files = get_source_files(source_folder)
        await parse_and_store_source_files(
            str(funding_organization.id), source_files, async_session_maker, data_fixture_folder
        )

    await process_organization_files(funding_organization, data_fixture_folder, async_session_maker)
    return funding_organization


def create_test_request(
    url: str = "/", headers: dict[str, Any] | None = None, method: str = "GET", **kwargs: Any
) -> Request:
    return Request(
        url_bytes=url.encode(),
        headers=Header(headers or {}),
        version="1.1",
        method=method,
        transport=Mock(),
        app=Mock(),
        **kwargs,
    )


async def parse_source_file(
    *,
    application_id: str | None = None,
    organization_id: str | None = None,
    source_file: Path,
    async_session_maker: async_sessionmaker[Any],
    target_folder: Path,
) -> None:
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided")

    file_content = await AsyncPath(source_file).read_bytes()
    file_dto = FileDTO(
        content=file_content,
        filename=source_file.name,
        mime_type="application/pdf"
        if source_file.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    async with async_session_maker() as session:
        file_id = await session.scalar(
            insert(RagFile)
            .values(
                {
                    "filename": file_dto.filename,
                    "mime_type": file_dto.mime_type,
                    "size": file_dto.size,
                    "indexing_status": FileIndexingStatusEnum.FINISHED,
                }
            )
            .returning(RagFile.id)
        )
        await session.execute(
            insert(GrantApplicationFile).values([{"grant_application_id": application_id, "rag_file_id": file_id}])
            if application_id
            else insert(OrganizationFile).values([{"funding_organization_id": organization_id, "rag_file_id": file_id}])
        )
        await session.commit()

    await parse_and_index_file(file_dto=file_dto, file_id=str(file_id))

    async with async_session_maker() as session:
        if application_id:
            stmt = (
                select(GrantApplicationFile)
                .options(selectinload(GrantApplicationFile.rag_file).selectinload(RagFile.text_vectors))
                .where(GrantApplicationFile.rag_file_id == file_id)
                .where(GrantApplicationFile.grant_application_id == application_id)
            )
        else:
            stmt = (
                select(OrganizationFile)  # type: ignore[assignment]
                .options(selectinload(OrganizationFile.rag_file).selectinload(RagFile.text_vectors))
                .where(OrganizationFile.rag_file_id == file_id)
                .where(OrganizationFile.funding_organization_id == organization_id)
            )

        file_datum = await session.scalar(stmt)
        assert file_datum is not None, f"File {source_file} not found in the database"

    await AsyncPath(target_folder).mkdir(parents=True, exist_ok=True)

    filename = source_file.name.replace("pdf", "json").replace("docx", "json")
    await AsyncPath(target_folder / filename).write_bytes(serialize(file_datum))


async def create_funding_application(
    async_session_maker: async_sessionmaker[Any],
    fixture_id: str,
    workspace_id: str,
    title: str,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
) -> str:
    application_id: str
    async with async_session_maker() as session:
        application_id = await session.scalar(
            insert(GrantApplication)
            .values(
                {
                    "id": fixture_id,
                    "workspace_id": workspace_id,
                    "title": title,
                    "research_objectives": research_objectives,
                    "form_inputs": form_inputs,
                }
            )
            .returning(GrantApplication.id)
        )
        await session.commit()
    return application_id


async def ensure_cfp_content_exists(cfp_markdown_file: Path, cfp_source_file: Path) -> None:
    if not cfp_markdown_file.exists():
        output, _ = await extract_file_content(content=cfp_source_file.read_bytes(), mime_type="application/pdf")
        content: str = output if isinstance(output, str) else output.content
        cfp_markdown_file.write_text(content)


def ensure_directory(directory: Path) -> None:
    if not directory.exists():
        directory.mkdir(parents=True)


async def ensure_grant_template(
    application_id: str, cfp_content_file: Path, data_fixture_folder: Path, async_session_maker: async_sessionmaker[Any]
) -> None:
    grant_template_file = data_fixture_folder / "grant_template.json"
    if not grant_template_file.exists():
        await grant_template_generation_pipeline_handler(
            cfp_content=cfp_content_file.read_text(), application_id=application_id
        )
        async with async_session_maker() as session:
            grant_template = await session.scalar(
                select(GrantTemplate).where(GrantTemplate.grant_application_id == application_id)
            )
        grant_template_file.write_bytes(serialize(grant_template))
    else:
        data = deserialize(grant_template_file.read_text(), dict[str, Any])
        async with async_session_maker() as session:
            await session.execute(
                insert(GrantTemplate).values(
                    {k: v for k, v in data.items() if v is not None and k not in {"created_at", "updated_at"}}
                )
            )
            await session.commit()


async def process_application_files(
    application_id: str,
    application_files_fixtures_dir: Path,
    source_files: list[Path],
    async_session_maker: async_sessionmaker[Any],
) -> None:
    if not list(application_files_fixtures_dir.glob("*.json")):
        await asyncio.gather(
            *[
                parse_source_file(
                    application_id=application_id,
                    source_file=source_file,
                    async_session_maker=async_session_maker,
                    target_folder=application_files_fixtures_dir,
                )
                for source_file in source_files
            ]
        )
    async with async_session_maker() as session, session.begin():
        for application_file in application_files_fixtures_dir.glob("*.json"):
            data = deserialize(application_file.read_bytes(), dict[str, Any])
            rag_file_data = data.pop("rag_file")
            rag_file_id = data.pop("rag_file_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_file_id,
                        **{
                            k: v
                            for k, v in rag_file_data.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        },
                    }
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(
                insert(GrantApplicationFile)
                .values({"grant_application_id": application_id, "rag_file_id": rag_file_id})
                .on_conflict_do_nothing(index_elements=["grant_application_id", "rag_file_id"])
            )
            await session.execute(
                insert(TextVector).values(
                    [
                        {
                            k: v
                            for k, v in text_vector.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        }
                        for text_vector in text_vectors
                    ]
                )
            )
        await session.commit()


async def create_grant_application_data(
    workspace: Workspace,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
    async_session_maker: async_sessionmaker[Any],
    fixture_id: str,
    cfp_markdown_file_name: str,
    source_file_names: list[str],
) -> str:
    application_id = await create_funding_application(
        async_session_maker, fixture_id, str(workspace.id), "Test Application", research_objectives, form_inputs
    )

    cfp_content_file = FIXTURES_FOLDER / "cfps" / cfp_markdown_file_name
    cfp_source_file = SOURCES_FOLDER / "cfps" / source_file_names[0]
    await ensure_cfp_content_exists(cfp_content_file, cfp_source_file)

    data_fixture_folder = FIXTURES_FOLDER / fixture_id
    ensure_directory(data_fixture_folder)
    await ensure_grant_template(application_id, cfp_content_file, data_fixture_folder, async_session_maker)

    application_files_fixtures_dir = data_fixture_folder / "files"
    ensure_directory(application_files_fixtures_dir)
    source_files = [SOURCES_FOLDER / "cfps" / name for name in source_file_names]

    await process_application_files(application_id, application_files_fixtures_dir, source_files, async_session_maker)

    return str(application_id)
