from typing import overload

from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import ApplicationFile, ApplicationVector, GrantFormatFile, GrantFormatVector
from src.exceptions import DatabaseError, ExternalOperationError, FileParsingError, ValidationError
from src.indexer.chunking import chunk_text
from src.indexer.dto import FileDTO
from src.indexer.extraction import parse_file_data
from src.indexer.indexing import index_documents, logger


@overload
async def parse_and_index_file(
    *,
    application_id: str,
    file_dto: FileDTO,
    file_id: str,
) -> None: ...
@overload
async def parse_and_index_file(
    *,
    format_id: str,
    file_dto: FileDTO,
    file_id: str,
) -> None: ...


async def parse_and_index_file(
    *,
    application_id: str | None = None,
    format_id: str | None = None,
    file_dto: FileDTO,
    file_id: str,
) -> None:
    """Parse and index the given file.

    Args:
        application_id: The application ID, required if format_id is not provided.
        format_id: The format ID, required if application_id is not provided.
        file_dto: The file to parse and index.
        file_id: The ID of the file in the database.

    Raises:
        ValueError: If neither application_id nor format_id is provided.
        DatabaseError: If there was an issue inserting the vectors into the database.

    Returns:
        None
    """
    if not application_id and not format_id:
        raise ValueError("Either application_id or format_id must be provided.")

    file_table_cls = ApplicationFile if application_id else GrantFormatFile
    vector_table_cls = ApplicationVector if application_id else GrantFormatVector

    session_maker = get_session_maker()
    try:
        extracted_text, mime_type = await parse_file_data(file_dto)
        logger.info("Extracted text from file", filename=file_dto.filename)
        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        vectors = await index_documents(
            chunks=chunks,
            file_id=file_id,
        )
    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(file_table_cls).where(file_table_cls.id == file_id).values(status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()
        logger.error("Failed to parse file", filename=file_dto.filename, exec_info=e)
    else:
        async with session_maker() as session, session.begin():
            try:
                await session.execute(
                    insert(vector_table_cls).values(
                        [
                            {
                                "application_id": application_id,
                                **vector,
                            }
                            if application_id
                            else {
                                "format_id": format_id,
                                **vector,
                            }
                            for vector in vectors
                        ]
                    )
                )
                await session.execute(
                    update(file_table_cls)
                    .where(file_table_cls.id == file_id)
                    .values(status=FileIndexingStatusEnum.FINISHED)
                )
                await session.commit()
                logger.info("Successfully indexed file", filename=file_dto.filename)
            except SQLAlchemyError as e:
                logger.error(
                    "Error inserting vectors.",
                    exec_info=e,
                    filename=file_dto.filename,
                    application_id=application_id,
                    format_id=format_id,
                )
                await session.rollback()
                raise DatabaseError("Error inserting vectors", context=str(e)) from e
