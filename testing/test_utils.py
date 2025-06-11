import asyncio
from pathlib import Path
from typing import Any

from anyio import Path as AsyncPath
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import (
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    RagFile,
    RagSource,
    TextVector,
    Workspace,
)
from packages.shared_utils.src.extraction import extract_file_content
from packages.shared_utils.src.serialization import deserialize, serialize
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from testing import FIXTURES_FOLDER, SOURCES_FOLDER


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

            rag_file_data = data.pop(RAG_FILE)
            rag_source_id = data.pop("rag_source_id")

            indexing_status = rag_file_data.pop("indexing_status")
            text_content = rag_file_data.pop("text_content", "")

            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            rag_file_data["bucket_name"] = "test_bucket"
            rag_file_data["object_path"] = "test_path"

            await session.execute(
                insert(RagSource)
                .values(
                    {
                        "id": rag_source_id,
                        "source_type": RAG_FILE,
                        "text_content": text_content,
                        "indexing_status": indexing_status,
                    }
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_source_id,
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
                insert(FundingOrganizationRagSource)
                .values(
                    {
                        "funding_organization_id": funding_organization.id,
                        "rag_source_id": rag_source_id,
                    }
                )
                .on_conflict_do_nothing(index_elements=["funding_organization_id", "rag_source_id"])
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

    async with async_session_maker() as session:
        file_id = await session.scalar(
            insert(RagFile)
            .values(
                {
                    "filename": source_file.name,
                    "mime_type": "application/pdf"
                    if source_file.suffix == ".pdf"
                    else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "size": len(file_content),
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                }
            )
            .returning(RagFile.id)
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                [{"grant_application_id": application_id, "rag_source_id": file_id}]
            )
            if application_id
            else insert(FundingOrganizationRagSource).values(
                [{"funding_organization_id": organization_id, "rag_source_id": file_id}]
            )
        )
        await session.commit()

    async with async_session_maker() as session:
        if application_id:
            stmt = (
                select(GrantApplicationRagSource)
                .options(selectinload(GrantApplicationRagSource.rag_source).selectinload(RagFile.text_vectors))
                .where(GrantApplicationRagSource.rag_source_id == file_id)
                .where(GrantApplicationRagSource.grant_application_id == application_id)
            )
        else:
            stmt = (
                select(FundingOrganizationRagSource)  # type: ignore[assignment]
                .options(selectinload(FundingOrganizationRagSource.rag_source).selectinload(RagFile.text_vectors))
                .where(FundingOrganizationRagSource.rag_source_id == file_id)
                .where(FundingOrganizationRagSource.funding_organization_id == organization_id)
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
    form_inputs: ResearchDeepDive,
) -> str:
    application_id: str
    async with async_session_maker() as session:
        application_id = str(
            await session.scalar(
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
        )
        await session.commit()
    return application_id


async def ensure_cfp_content_exists(cfp_markdown_file: Path, cfp_source_file: Path) -> None:
    if not cfp_markdown_file.exists():
        content, _ = await extract_file_content(content=cfp_source_file.read_bytes(), mime_type="application/pdf")
        cfp_markdown_file.write_text(content)


def ensure_directory(directory: Path) -> None:
    if not directory.exists():
        directory.mkdir(parents=True)


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
            rag_file_data = data.pop(RAG_FILE)
            rag_source_id = data.pop("rag_source_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_source_id,
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
                insert(GrantApplicationRagSource)
                .values({"grant_application_id": application_id, "rag_source_id": rag_source_id})
                .on_conflict_do_nothing(index_elements=["grant_application_id", "rag_source_id"])
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
    form_inputs: ResearchDeepDive,
    async_session_maker: async_sessionmaker[Any],
    fixture_id: str,
    cfp_markdown_file_name: str,
    source_file_names: list[str],
    title: str = "Test Application",
) -> str:
    application_id = await create_funding_application(
        async_session_maker, fixture_id, str(workspace.id), title, research_objectives, form_inputs
    )

    cfp_content_file = FIXTURES_FOLDER / "cfps" / cfp_markdown_file_name
    cfp_source_file = SOURCES_FOLDER / "cfps" / source_file_names[0]
    await ensure_cfp_content_exists(cfp_content_file, cfp_source_file)

    data_fixture_folder = FIXTURES_FOLDER / fixture_id
    ensure_directory(data_fixture_folder)

    application_files_fixtures_dir = data_fixture_folder / "files"
    ensure_directory(application_files_fixtures_dir)
    source_files = list((SOURCES_FOLDER / "application_sources").glob("*.*"))

    await process_application_files(application_id, application_files_fixtures_dir, source_files, async_session_maker)

    return str(application_id)
