from asyncio import gather
from typing import Final

from sqlalchemy import update

from src.db.connection import get_session_maker
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import ApplicationFile
from src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.indexer.chunking import chunk_text
from src.indexer.db import upsert_application_vectors
from src.indexer.dto import Chunk, FileDTO, VectorDTO
from src.indexer.extraction import parse_file_data
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logging import get_logger

logger = get_logger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
    file_id: str,
) -> VectorDTO:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        file_id: The ID of the file from which the chunk is derived.

    Returns:
        VectorDTO

    """
    embedding = await generate_embeddings([chunk["content"]], task=TaskType.RetrievalDocument)

    return VectorDTO(
        chunk_index=chunk["index"],
        content=chunk["content"],
        element_type=chunk["element_type"],
        embedding=embedding,
        file_id=file_id,
        page_number=chunk["page_number"],
    )


async def index_documents(
    *,
    chunks: list[Chunk],
    file_id: str,
    application_id: str,
) -> None:
    """Create embeddings for the given chunks.

    Args:
        chunks: The list of chunks to index.
        file_id: The ID of the file from which the chunks are derived.
        application_id: The ID of the application the chunks belong to.

    Returns:
        The list of documents to index.
    """
    data: list[VectorDTO] = []
    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                    file_id=file_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        data.extend([result for result in results if result is not None])

    await upsert_application_vectors(vectors=data, application_id=application_id)
    logger.info("Successfully indexed file_id", file_id=file_id)


async def parse_and_index_file(
    *,
    application_id: str,
    file_dto: FileDTO,
    file_id: str,
) -> None:
    """Parse and index the given file.

    Args:
        application_id: The application ID.
        file_dto: The file to parse and index.
        file_id: The ID of the file in the database.


    Returns:
        None
    """
    session_maker = get_session_maker()
    try:
        extracted_text, mime_type = await parse_file_data(file_dto)
        logger.info("Extracted text from file", filename=file_dto.filename)

        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        await index_documents(
            chunks=chunks,
            file_id=file_id,
            application_id=application_id,
        )

        async with session_maker() as session, session.begin():
            await session.execute(
                update(ApplicationFile)
                .where(ApplicationFile.id == file_id)
                .values(status=FileIndexingStatusEnum.FINISHED)
            )
            await session.commit()

        logger.info("Successfully indexed file", filename=file_dto.filename)

    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(ApplicationFile)
                .where(ApplicationFile.id == file_id)
                .values(status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()
        logger.error("Failed to parse file", filename=file_dto.filename, exec_info=e)
