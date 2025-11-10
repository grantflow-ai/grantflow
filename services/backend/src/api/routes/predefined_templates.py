from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import NotFoundException, ValidationException
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.query_helpers import select_active_by_id, update_active_by_id
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


class CreatePredefinedTemplateBody(TypedDict):
    name: str
    grant_type: str
    grant_sections: list[dict[str, Any]]
    description: NotRequired[str]
    activity_code: NotRequired[str]
    guideline_source: NotRequired[str]
    guideline_version: NotRequired[str]


class UpdatePredefinedTemplateBody(TypedDict):
    name: NotRequired[str]
    description: NotRequired[str]
    grant_type: NotRequired[str]
    activity_code: NotRequired[str]
    guideline_source: NotRequired[str]
    guideline_version: NotRequired[str]
    granting_institution_id: NotRequired[UUID]
    grant_sections: NotRequired[list[dict[str, Any]]]


class PredefinedTemplateListItem(TypedDict):
    id: str
    name: str
    grant_type: str
    sections_count: int
    created_at: str
    updated_at: str
    activity_code: NotRequired[str]
    granting_institution: NotRequired[dict[str, str | None]]


class PredefinedTemplateResponse(PredefinedTemplateListItem):
    grant_sections: list[GrantLongFormSection | GrantElement]
    description: NotRequired[str]
    guideline_source: NotRequired[str]
    guideline_version: NotRequired[str]


def _serialize_template(
    template: PredefinedGrantTemplate,
    *,
    include_sections: bool,
) -> PredefinedTemplateResponse:
    response: PredefinedTemplateResponse = {
        "id": str(template.id),
        "name": template.name,
        "grant_type": template.grant_type.value if isinstance(template.grant_type, GrantType) else template.grant_type,
        "sections_count": len(template.grant_sections),
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
        "grant_sections": template.grant_sections if include_sections else [],
    }

    if template.granting_institution:
        response["granting_institution"] = {
            "id": str(template.granting_institution.id),
            "full_name": template.granting_institution.full_name,
            "abbreviation": template.granting_institution.abbreviation,
        }

    if template.description:
        response["description"] = template.description
    if template.activity_code:
        response["activity_code"] = template.activity_code
    if template.guideline_source:
        response["guideline_source"] = template.guideline_source
    if template.guideline_version:
        response["guideline_version"] = template.guideline_version

    return response


async def _fetch_template(
    session_maker: async_sessionmaker[Any],
    template_id: UUID,
    granting_institution_id: UUID,
) -> PredefinedGrantTemplate:
    async with session_maker() as session:
        template = await session.scalar(
            select_active_by_id(PredefinedGrantTemplate, template_id).options(
                selectinload(PredefinedGrantTemplate.granting_institution)
            )
        )

        if not template:
            raise NotFoundException("Predefined template not found")

        if template.granting_institution_id != granting_institution_id:
            raise NotFoundException("Predefined template not found")

        return cast("PredefinedGrantTemplate", template)


@post(
    "/granting-institutions/{granting_institution_id:uuid}/predefined-templates",
    requires_backoffice_admin=True,
    operation_id="CreateGrantingInstitutionPredefinedTemplate",
    status_code=HTTPStatus.CREATED,
)
async def handle_create_predefined_template(
    granting_institution_id: UUID,
    data: CreatePredefinedTemplateBody,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    if not data.get("grant_sections"):
        raise ValidationException("grant_sections cannot be empty")

    grant_type = GrantType(data["grant_type"])

    async with session_maker() as session, session.begin():
        # Validate granting institution exists
        institution = await session.scalar(select_active_by_id(GrantingInstitution, granting_institution_id))
        if not institution:
            raise NotFoundException("Granting institution not found")

        try:
            template = await session.scalar(
                insert(PredefinedGrantTemplate)
                .values({**data, "grant_type": grant_type, "granting_institution_id": granting_institution_id})
                .returning(PredefinedGrantTemplate)
            )
            await session.flush()
            await session.refresh(template, attribute_names=["granting_institution"])
        except SQLAlchemyError as exc:
            logger.error("Failed to create predefined template", exc_info=exc)
            raise DatabaseError("Failed to create predefined template", context=str(exc)) from exc

    return _serialize_template(template, include_sections=True)


@get(
    "/granting-institutions/{granting_institution_id:uuid}/predefined-templates",
    requires_backoffice_admin=True,
    operation_id="ListGrantingInstitutionPredefinedTemplates",
)
async def handle_list_predefined_templates(
    granting_institution_id: UUID,
    session_maker: async_sessionmaker[Any],
    activity_code: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[PredefinedTemplateListItem]:
    async with session_maker() as session:
        stmt = (
            select(PredefinedGrantTemplate, GrantingInstitution)
            .join(GrantingInstitution, GrantingInstitution.id == PredefinedGrantTemplate.granting_institution_id)
            .where(
                PredefinedGrantTemplate.deleted_at.is_(None),
                PredefinedGrantTemplate.granting_institution_id == granting_institution_id,
            )
            .order_by(PredefinedGrantTemplate.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        if activity_code:
            stmt = stmt.where(PredefinedGrantTemplate.activity_code == activity_code)

        result = await session.execute(stmt)

        items: list[PredefinedTemplateListItem] = []
        for template, institution in result:
            item: PredefinedTemplateListItem = {
                "id": str(template.id),
                "name": template.name,
                "grant_type": template.grant_type.value,
                "sections_count": len(template.grant_sections),
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat(),
            }

            if template.activity_code:
                item["activity_code"] = template.activity_code

            item["granting_institution"] = {
                "id": str(institution.id),
                "full_name": institution.full_name,
                "abbreviation": institution.abbreviation,
            }

            items.append(item)

        return items


@get(
    "/granting-institutions/{granting_institution_id:uuid}/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="GetGrantingInstitutionPredefinedTemplate",
)
async def handle_get_predefined_template(
    granting_institution_id: UUID,
    template_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    template = await _fetch_template(session_maker, template_id, granting_institution_id)
    return _serialize_template(template, include_sections=True)


@patch(
    "/granting-institutions/{granting_institution_id:uuid}/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="UpdateGrantingInstitutionPredefinedTemplate",
)
async def handle_update_predefined_template(
    granting_institution_id: UUID,
    template_id: UUID,
    data: UpdatePredefinedTemplateBody,
    session_maker: async_sessionmaker[Any],
) -> PredefinedTemplateResponse:
    if not data:
        raise ValidationException("Request body is empty")

    # Validate template belongs to granting institution
    await _fetch_template(session_maker, template_id, granting_institution_id)

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
                raise NotFoundException("Predefined template not found")

            await session.flush()
            await session.refresh(template, attribute_names=["granting_institution"])
        except SQLAlchemyError as exc:
            logger.error("Failed to update predefined template", exc_info=exc)
            raise DatabaseError("Failed to update predefined template", context=str(exc)) from exc

    return _serialize_template(template, include_sections=True)


@delete(
    "/granting-institutions/{granting_institution_id:uuid}/predefined-templates/{template_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="DeleteGrantingInstitutionPredefinedTemplate",
    status_code=HTTPStatus.NO_CONTENT,
)
async def handle_delete_predefined_template(
    granting_institution_id: UUID,
    template_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    # Validate template belongs to granting institution
    await _fetch_template(session_maker, template_id, granting_institution_id)

    async with session_maker() as session, session.begin():
        try:
            deleted = await session.scalar(
                update_active_by_id(PredefinedGrantTemplate, template_id)
                .values(deleted_at=datetime.now(UTC))
                .returning(PredefinedGrantTemplate.id)
            )
            if not deleted:
                raise NotFoundException("Predefined template not found")
        except SQLAlchemyError as exc:
            logger.error("Failed to delete predefined template", exc_info=exc)
            raise DatabaseError("Failed to delete predefined template", context=str(exc)) from exc
