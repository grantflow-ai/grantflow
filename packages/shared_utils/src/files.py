from dataclasses import dataclass
from mimetypes import guess_type

from litestar.datastructures.upload_file import UploadFile
from pathvalidate import sanitize_filename

from packages.shared_utils.src.exceptions import ValidationError

SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP = {
    "md": "text/markdown",
    "bmp": "image/bmp",
    "csv": "text/csv",
    "doc": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "gif": "image/gif",
    "heic": "image/heif",
    "heif": "image/heif",
    "jfif": "image/jpeg",
    "jif": "image/jpeg",
    "jpe": "image/jpeg",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "latex": "application/latex",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "png": "image/png",
    "ppt": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "application/rtf",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "tsv": "text/tab-separated-values",
    "xls": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@dataclass
class FileDTO:
    content: bytes
    filename: str
    mime_type: str

    @property
    def size(self) -> int:
        return len(self.content)

    @classmethod
    async def from_file(cls, file: UploadFile | list[UploadFile], filename: str) -> "FileDTO":
        file = file[0] if isinstance(file, list) else file
        ext = filename.split(".")[-1]

        if mime_type := (SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP.get(ext) or guess_type(filename)[0]):
            filename = sanitize_filename(filename)
            content = await file.read()
            return cls(content=content, filename=filename, mime_type=mime_type)

        raise ValidationError("Could not determine the mime type of the file")
