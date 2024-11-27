from __future__ import annotations

from typing import Final

CONTENT_TYPE_JSON: Final[str] = "application/json"

ONE_MINUTE_SECONDS: Final[int] = 60


# Field name constants
FIELD_NAME_APPLICATION_ID: Final[str] = "application_id"
FIELD_NAME_CONTENT: Final[str] = "content"
FIELD_NAME_ELEMENT_TYPE: Final[str] = "element_type"
FIELD_NAME_CONTENT_VECTOR: Final[str] = "content_vector"
FIELD_NAME_FILENAME: Final[str] = "filename"
FIELD_NAME_ID: Final[str] = "id"
FIELD_NAME_PAGE_NUMBER: Final[str] = "page_number"
FIELD_NAME_SECTION_NAME: Final[str] = "section_name"
FIELD_NAME_WORKSPACE_ID: Final[str] = "workspace_id"
FIELD_NAME_KEYWORDS: Final[str] = "keywords"
FIELD_NAME_LABELS: Final[str] = "labels"


# Model constants
EMBEDDINGS_MODEL: Final[str] = "text-embedding-005"
EMBEDDING_DIMENSIONS: Final[int] = 256
FAST_TEXT_GENERATION_MODEL: Final[str] = "gemini-1.5-flash-002"
PREMIUM_TEXT_GENERATION_MODEL: Final[str] = "gemini-1.5-pro-002"
