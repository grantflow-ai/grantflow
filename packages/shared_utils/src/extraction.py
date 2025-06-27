from kreuzberg import KreuzbergError, extract_bytes

from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


async def extract_file_content(*, content: bytes, mime_type: str) -> tuple[str, str]:
    import time

    start_time = time.time()
    logger.debug(
        "Starting file content extraction",
        mime_type=mime_type,
        content_size=len(content),
    )

    try:
        result = await extract_bytes(content=content, mime_type=mime_type)
        extraction_duration = time.time() - start_time

        logger.debug(
            "File content extraction successful",
            original_mime_type=mime_type,
            detected_mime_type=result.mime_type,
            content_size=len(content),
            extracted_length=len(result.content),
            extraction_duration_ms=round(extraction_duration * 1000, 2),
        )

        return result.content, result.mime_type
    except KreuzbergError as e:
        extraction_duration = time.time() - start_time
        logger.warning(
            "File content extraction failed",
            mime_type=mime_type,
            content_size=len(content),
            error_type=type(e).__name__,
            error_message=str(e),
            extraction_duration_ms=round(extraction_duration * 1000, 2),
        )

        raise FileParsingError(
            "Error extracting content from file",
            context={
                "mime_type": mime_type,
                "error": str(e),
                "content_size": len(content),
            },
        ) from e
