from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.query_helpers import select_active_by_id, update_active_by_id
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import to_builtins
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


class CreatePredefinedTemplateBody(TypedDict):
    name: str
    grant_type: str
    granting_institution_id: UUID
    grant_sections: list[dict[str, Any]]
    description: NotRequired[str | None]
    activity_code: NotRequired[str | None]
    guideline_source: NotRequired[str | None]
    guideline_version: NotRequired[str | None]
    guideline_hash: NotRequired[str | None]
    additional_metadata: NotRequired[dict[str, Any] | None]


class UpdatePredefinedTemplateBody(TypedDict):
    name: NotRequired[str]
    description: NotRequired[str | None]
    grant_type: NotRequired[str | None]
    activity_code: NotRequired[str | None]
    guideline_source: NotRequired[str | None]
    guideline_version: NotRequired[str | None]
    guideline_hash: NotRequired[str | None]
    granting_institution_id: NotRequired[UUID]
    grant_sections: NotRequired[list[dict[str, Any]]]
    additional_metadata: NotRequired[dict[str, Any] | None]


class PredefinedTemplateListItem(TypedDict):
    id: str
    name: str
    grant_type: str
    activity_code: str | None
    granting_institution: dict[str, str | None] | None
    sections_count: int
    created_at: str
    updated_at: str


class PredefinedTemplateResponse(PredefinedTemplateListItem):
    description: str | None
    guideline_source: str | None
    guideline_version: str | None
    guideline_hash: str | None
    grant_sections: list[GrantLongFormSection | GrantElement]
    additional_metadata: dict[str, Any] | None


def _serialize_template(
    template: PredefinedGrantTemplate,
    *,
    include_sections: bool,
) -> PredefinedTemplateResponse:
    granting_institution: dict[str, str | None] | None = None
    if template.granting_institution:
        granting_institution = {
            "id": str(template.granting_institution.id),
            "full_name": template.granting_institution.full_name,
            "abbreviation": template.granting_institution.abbreviation,
        }

    response: PredefinedTemplateResponse = {
        "id": str(template.id),
        "name": template.name,
        "description": template.description,
        "grant_type": template.grant_type.value if isinstance(template.grant_type, GrantType) else template.grant_type,
        "activity_code": template.activity_code,
        "guideline_source": template.guideline_source,
        "guideline_version": template.guideline_version,
        "guideline_hash": template.guideline_hash,
        "granting_institution": granting_institution,
        "sections_count": len(template.grant_sections),
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "grant_sections": template.grant_sections if include_sections else [],
        "additional_metadata": to_builtins(template.additional_metadata),
    }

    if not include_sections:
        response["grant_sections"] = []

    return response


async def _fetch_template(
    session_maker: async_sessionmaker[Any],
    template_id: UUID,
) -> PredefinedGrantTemplate:
    async with session_maker() as session:
        template = await session.scalar(
            select_active_by_id(PredefinedGrantTemplate, template_id).options(
                selectinload(PredefinedGrantTemplate.granting_institution)
            )
        )

        if not template:
            raise ValidationException("Predefined template not found")

        return cast("PredefinedGrantTemplate", template)


@post(
    "/predefined-templates",
    requires_backoffice_admin=True,
    operation_id="CreatePredefinedGrantTemplate",
    status_code=HTTPStatus.CREATED,
)
async def handle_create_predefined_template(
    data: CreatePredefinedTemplateBody,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    grant_type = GrantType(data["grant_type"])

    async with session_maker() as session, session.begin():
        try:
            template = await session.scalar(
                insert(PredefinedGrantTemplate)
                .values({**data, "grant_type": grant_type})
                .returning(PredefinedGrantTemplate)
            )
            await session.flush()
            await session.refresh(template, attribute_names=["granting_institution"])
        except IntegrityError as exc:
            if "uq_predefined_templates_institution_activity" in str(exc):
                logger.warning("Duplicate predefined template creation attempted", exc_info=exc)
                raise ValidationException(
                    "A template with this granting institution and activity code already exists"
                ) from exc
            logger.error("Failed to create predefined template", exc_info=exc)
            raise DatabaseError("Failed to create predefined template", context=str(exc)) from exc
        except SQLAlchemyError as exc:
            logger.error("Failed to create predefined template", exc_info=exc)
            raise DatabaseError("Failed to create predefined template", context=str(exc)) from exc

    return _serialize_template(template, include_sections=True)


@get("/predefined-templates", requires_backoffice_admin=True, operation_id="ListPredefinedGrantTemplates")
async def handle_list_predefined_templates(
    session_maker: async_sessionmaker[Any],
    granting_institution_id: UUID | None = None,
    activity_code: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[PredefinedTemplateListItem]:
    async with session_maker() as session:
        stmt = (
            select(PredefinedGrantTemplate, GrantingInstitution)
            .join(GrantingInstitution, GrantingInstitution.id == PredefinedGrantTemplate.granting_institution_id)
            .where(PredefinedGrantTemplate.deleted_at.is_(None))
            .order_by(PredefinedGrantTemplate.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        if granting_institution_id:
            stmt = stmt.where(PredefinedGrantTemplate.granting_institution_id == granting_institution_id)

        if activity_code:
            stmt = stmt.where(PredefinedGrantTemplate.activity_code == activity_code)

        result = await session.execute(stmt)

        items: list[PredefinedTemplateListItem] = []
        for template, institution in result:
            items.append(
                PredefinedTemplateListItem(
                    id=str(template.id),
                    name=template.name,
                    grant_type=template.grant_type.value,
                    activity_code=template.activity_code,
                    granting_institution={
                        "id": str(institution.id),
                        "full_name": institution.full_name,
                        "abbreviation": institution.abbreviation,
                    },
                    sections_count=len(template.grant_sections),
                    created_at=template.created_at.isoformat(),
                    updated_at=template.updated_at.isoformat(),
                )
            )

        return items


@get(
    "/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="GetPredefinedGrantTemplate",
)
async def handle_get_predefined_template(
    template_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    template = await _fetch_template(session_maker, template_id)
    return _serialize_template(template, include_sections=True)


@patch(
    "/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="UpdatePredefinedGrantTemplate",
)
async def handle_update_predefined_template(
    template_id: UUID,
    data: UpdatePredefinedTemplateBody,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    if not data:
        raise ValidationException("Request body is empty")

    if "grant_type" in data and data["grant_type"] is not None:
        data["grant_type"] = GrantType(data["grant_type"])

    async with session_maker() as session, session.begin():
        try:
            template = await session.scalar(
                update_active_by_id(PredefinedGrantTemplate, template_id)
                .values(data)
                .returning(PredefinedGrantTemplate)
            )
            if not template:
                raise ValidationException("Predefined template not found")

            await session.flush()
            await session.refresh(template, attribute_names=["granting_institution"])
        except IntegrityError as exc:
            if "uq_predefined_templates_institution_activity" in str(exc):
                logger.warning("Duplicate predefined template update attempted", exc_info=exc)
                raise ValidationException(
                    "A template with this granting institution and activity code already exists"
                ) from exc
            logger.error("Failed to update predefined template", exc_info=exc)
            raise DatabaseError("Failed to update predefined template", context=str(exc)) from exc
        except SQLAlchemyError as exc:
            logger.error("Failed to update predefined template", exc_info=exc)
            raise DatabaseError("Failed to update predefined template", context=str(exc)) from exc

    return _serialize_template(template, include_sections=True)


@delete(
    "/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="DeletePredefinedGrantTemplate",
    status_code=HTTPStatus.NO_CONTENT,
)
async def handle_delete_predefined_template(
    template_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    async with session_maker() as session, session.begin():
        try:
            deleted = await session.scalar(
                update_active_by_id(PredefinedGrantTemplate, template_id)
                .values(deleted_at=datetime.now(UTC))
                .returning(PredefinedGrantTemplate.id)
            )
            if not deleted:
                raise ValidationException("Predefined template not found")
        except SQLAlchemyError as exc:
            logger.error("Failed to delete predefined template", exc_info=exc)
            raise DatabaseError("Failed to delete predefined template", context=str(exc)) from exc
