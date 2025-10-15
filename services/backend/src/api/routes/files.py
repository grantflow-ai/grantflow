from typing import Literal, TypedDict

from html_to_markdown import PreprocessingOptions, convert
from litestar import Response, post
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from packages.shared_utils.src.logger import get_logger

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.backend.src.utils.docx import html_to_docx
from services.backend.src.utils.pdf import html_to_pdf

logger = get_logger(__name__)


class FileConversionRequest(TypedDict):
    html_content: str
    output_format: Literal["docx", "pdf", "md"]
    filename: str


@post(
    "/files/convert",
)
async def handle_convert_file(
    data: FileConversionRequest,
    request: APIRequest,
) -> Response[bytes]:
    trace_id = get_trace_id(request)
    html_content = data["html_content"]
    output_format = data["output_format"].lower()
    filename = data.get("filename", "converted_document")

    if not html_content.strip():
        raise ValidationError("HTML content cannot be empty")

    try:
        if not filename.endswith(f".{output_format}"):
            filename = f"{filename}.{output_format}"

        if output_format == "pdf":
            content_type = "application/pdf"
            file_content = await html_to_pdf(html_content)
        elif output_format == "docx":
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            file_content = html_to_docx(html_content)
        elif output_format == "md":
            content_type = "text/markdown"
            file_content = convert(
                html_content,
                preprocessing=PreprocessingOptions(enabled=True),
            ).encode()

        return Response[bytes](
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(file_content)),
            },
        )

    except Exception as e:
        logger.exception(
            "File conversion failed",
            output_format=output_format,
            filename=filename,
            error_type=type(e).__name__,
            error=str(e),
            trace_id=trace_id,
        )
        raise BackendError(f"Failed to convert file to {output_format}", context={"error": str(e)}) from e
