from kreuzberg import KreuzbergError, extract_bytes

from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


async def extract_file_content(*, content: bytes, mime_type: str) -> tuple[str, str]:
    try:
        result = await extract_bytes(content=content, mime_type=mime_type)
        return result.content, result.mime_type
    except KreuzbergError as e:
        raise FileParsingError(
            "Error extracting content from file",
            context={
                "mime_type": mime_type,
                "error": str(e),
            },
        ) from e
