from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Final, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import websocket
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from litestar.status_codes import WS_1006_ABNORMAL_CLOSURE
from litestar.stores.valkey import ValkeyStore
from packages.db.src.enums import ApplicationStatusEnum, UserRoleEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantApplicationRagSource, GrantTemplate
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize, serialize
from services.backend.src.common_types import APIWebsocket, WebsocketMessage
from services.backend.src.dto import WebsocketDataMessage, WebsocketErrorMessage, WebsocketInfoMessage
from services.backend.src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.backend.src.rag.grant_template.handler import grant_template_generation_pipeline_handler
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import now

EVENT_APPLICATION_SETUP: Final[str] = "application_setup"
EVENT_TEMPLATE_REVIEW: Final[str] = "template_review"
EVENT_KNOWLEDGE_BASE: Final[str] = "knowledge_base"
EVENT_RESEARCH_PLAN: Final[str] = "research_plan"
EVENT_RESEARCH_DEEP_DIVE: Final[str] = "research_deep_dive"
EVENT_GENERATE_APPLICATION: Final[str] = "generate_application"
EVENT_CANCEL_APPLICATION: Final[str] = "cancel_application"

EVENT_APPLICATION_CREATED: Final[str] = "application_creation_success"
EVENT_APPLICATION_SETUP_SUCCESS: Final[str] = "application_setup_success"
EVENT_APPLICATION_STATUS_UPDATE: Final[str] = "application_status_update"
EVENT_TEMPLATE_GENERATION_SUCCESS: Final[str] = "template_generation_success"
EVENT_TEMPLATE_UPDATE_SUCCESS: Final[str] = "template_update_success"
EVENT_KNOWLEDGE_BASE_SUCCESS: Final[str] = "knowledge_base_success"
EVENT_RESEARCH_PLAN_SUCCESS: Final[str] = "research_plan_success"
EVENT_RESEARCH_DEEP_DIVE_SUCCESS: Final[str] = "research_deep_dive_success"
EVENT_GENERATION_STARTED: Final[str] = "generation_started"
EVENT_GENERATION_COMPLETE: Final[str] = "generation_complete"
EVENT_APPLICATION_CANCELLED: Final[str] = "application_cancelled"

WIZARD_STEPS_COMPLETED_VALKEY_KEY: Final[str] = "wizard_completed_steps"


class ApplicationUpdateDTO(TypedDict):
    title: NotRequired[str]
    status: NotRequired[ApplicationStatusEnum]
    research_objectives: NotRequired[list[ResearchObjective]]


class FundingOrganizationDTO(TypedDict):
    id: str
    full_name: str
    abbreviation: str | None


class GrantTemplateDTO(TypedDict):
    id: str
    grant_sections: list[GrantElement | GrantLongFormSection]
    funding_organization: NotRequired[FundingOrganizationDTO | None]
    grant_application_id: str


class ApplicationResponseDTO(TypedDict):
    id: str
    title: str
    status: ApplicationStatusEnum
    research_objectives: list[ResearchObjective] | None
    form_inputs: dict[str, str] | None
    text: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    grant_template: NotRequired[GrantTemplateDTO | None]


class ApplicationWizardResponseDTO(TypedDict):
    data: ApplicationResponseDTO
    completed_steps: NotRequired[list[str]]


@dataclass
class ApplicationSetupInput:
    title: str

    def __post_init__(self) -> None:
        if not self.title:
            raise ValidationException("Application title is required")


@dataclass
class ResearchTask:
    title: str
    description: str | None = None

    def __post_init__(self) -> None:
        if not self.title or len(self.title) < 10:
            raise ValidationException("Each task must have a title of at least 10 characters")


@dataclass
class ResearchObjectiveInput:
    title: str
    description: str | None = None
    research_tasks: list[ResearchTask] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.title or len(self.title) < 10:
            raise ValidationException("Each objective must have a title of at least 10 characters")

        if not self.research_tasks or len(self.research_tasks) == 0:
            raise ValidationException("Each objective must have at least one research task")


@dataclass
class ResearchPlanInput:
    research_objectives: list[ResearchObjectiveInput]

    def __post_init__(self) -> None:
        if not self.research_objectives or len(self.research_objectives) == 0:
            raise ValidationException("At least one research objective is required")


@dataclass
class TemplateReviewInput:
    grant_template: dict[str, Any]
    funding_organization_id: str | None = None

    def __post_init__(self) -> None:
        if not self.grant_template:
            raise ValidationException("Grant template data is required")


@dataclass
class ResearchDeepDiveInput:
    research_deep_dive: dict[str, str] = field(default_factory=dict)


logger = get_logger(__name__)


async def store_wizard_state(
    store: ValkeyStore,
    current_step: str,
) -> list[str]:
    serialized_state = await store.get(WIZARD_STEPS_COMPLETED_VALKEY_KEY)
    completed_steps: list[str] = deserialize(serialized_state, list[str]) if serialized_state else []

    if current_step not in completed_steps:
        completed_steps.append(current_step)
        await store.set(WIZARD_STEPS_COMPLETED_VALKEY_KEY, serialize(completed_steps), expires_in=timedelta(weeks=8))

    return completed_steps


def prepare_wizard_response(
    application: GrantApplication, completed_steps: list[str] | None = None
) -> ApplicationWizardResponseDTO:
    application_dto = ApplicationResponseDTO(
        id=str(application.id),
        title=application.title,
        status=application.status if hasattr(application, "status") else ApplicationStatusEnum.DRAFT,
        research_objectives=application.research_objectives,
        form_inputs=application.form_inputs,
        text=application.text,
        completed_at=application.completed_at,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )

    if application.grant_template:
        funding_org_data = (
            FundingOrganizationDTO(
                id=str(application.grant_template.funding_organization.id),
                full_name=application.grant_template.funding_organization.full_name,
                abbreviation=application.grant_template.funding_organization.abbreviation,
            )
            if application.grant_template.funding_organization
            else None
        )

        template_dto = GrantTemplateDTO(
            id=str(application.grant_template.id),
            grant_sections=application.grant_template.grant_sections,
            grant_application_id=str(application.id),
            funding_organization=funding_org_data,
        )

        application_dto["grant_template"] = template_dto
    response = ApplicationWizardResponseDTO(
        data=application_dto,
    )

    if completed_steps:
        response["completed_steps"] = completed_steps

    return response


async def get_cfp_content(cfp_file_upload: UploadFile | None, cfp_url: str | None) -> str:
    from packages.shared_utils.src.extraction import extract_file_content

    if cfp_file_upload:
        output, _ = await extract_file_content(
            content=await cfp_file_upload.read(),
            mime_type=cfp_file_upload.content_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url:
        # TODO:
        pass
    raise ValidationException("Either one file or a CFP URL is required")


class MessageHandler:
    __slots__ = ("_debug", "_socket")

    def __init__(self, socket: APIWebsocket) -> None:
        self._socket = socket
        self._debug = get_env("DEBUG", raise_on_missing=False)

    async def send_message(self, message: WebsocketMessage) -> None:
        await self._socket.send_json(message)


async def handle_create_application(
    workspace_id: UUID, session_maker: async_sessionmaker[Any], store: ValkeyStore
) -> UUID:
    async with session_maker() as session, session.begin():
        try:
            application_id = await session.scalar(
                insert(GrantApplication)
                .values(
                    {
                        "workspace_id": workspace_id,
                        "title": "",
                        "status": ApplicationStatusEnum.DRAFT,
                    }
                )
                .returning(GrantApplication.id)
            )

            await store.set(WIZARD_STEPS_COMPLETED_VALKEY_KEY, serialize([]), expires_in=timedelta(weeks=8))

            await session.commit()
            return cast("UUID", application_id)

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e


async def handle_application_setup(
    *,
    application_id: UUID,
    data: dict[str, Any],
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    setup_input = ApplicationSetupInput(
        title=data.get("title", ""),
    )

    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        completed_steps = await store_wizard_state(
            store=store,
            current_step=EVENT_APPLICATION_SETUP,
        )

        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == application_id)
            .values(
                title=setup_input.title,
                status=ApplicationStatusEnum.IN_PROGRESS,
            )
        )

        await session.commit()

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_APPLICATION_SETUP_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=completed_steps),  # type: ignore
            message=f"Application '{setup_input.title}' updated successfully",
        ),
    )

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_APPLICATION_STATUS_UPDATE,
            content={"status": "processing_cfp"},
            message="Processing CFP data...",
        ),
    )

    await grant_template_generation_pipeline_handler(
        application_id=str(application_id),
        cfp_content="",  # TODO: reimplement once crawling is done
        message_handler=handler.send_message,
    )

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_TEMPLATE_GENERATION_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=[]),  # type: ignore
            message="Template generated successfully",
        ),
    )


async def handle_template_review(
    *,
    application_id: UUID,
    data: dict[str, Any],
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    template_input = TemplateReviewInput(
        grant_template=data.get("grant_template", {}),
        funding_organization_id=data.get("funding_organization_id"),
    )

    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        existing_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == application_id)
        )

        if existing_template:
            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == existing_template.id)
                .values(
                    grant_sections=template_input.grant_template.get("grant_sections", []),
                    funding_organization_id=template_input.funding_organization_id,
                )
            )
        else:
            await session.execute(
                insert(GrantTemplate).values(
                    grant_application_id=application_id,
                    funding_organization_id=template_input.funding_organization_id,
                    grant_sections=template_input.grant_template.get("grant_sections", []),
                )
            )

        completed_steps = await store_wizard_state(
            store=store,
            current_step=EVENT_TEMPLATE_REVIEW,
        )

        await session.commit()

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_TEMPLATE_UPDATE_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=completed_steps),  # type: ignore
            message="Template updated successfully",
        ),
    )


async def handle_research_plan(
    *,
    application_id: UUID,
    data: dict[str, Any],
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    raw_objectives = data.get("research_objectives", [])

    research_tasks_list = []
    for objective in raw_objectives:
        tasks = [
            ResearchTask(
                title=task.get("title", ""),
                description=task.get("description"),
            )
            for task in objective.get("research_tasks", [])
        ]
        research_tasks_list.append(
            ResearchObjectiveInput(
                title=objective.get("title", ""),
                description=objective.get("description"),
                research_tasks=tasks,
            )
        )

    plan_input = ResearchPlanInput(research_objectives=research_tasks_list)

    objectives_for_db = []
    for objective in plan_input.research_objectives:
        tasks_for_db = []
        for task in objective.research_tasks:
            task_dict = {"title": task.title}
            if task.description:
                task_dict["description"] = task.description
            tasks_for_db.append(task_dict)

        objective_dict = {"title": objective.title, "research_tasks": tasks_for_db}
        if objective.description:
            objective_dict["description"] = objective.description
        objectives_for_db.append(objective_dict)

    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == application_id)
            .values(research_objectives=objectives_for_db)
        )
        completed_steps = await store_wizard_state(
            store=store,
            current_step=EVENT_RESEARCH_PLAN,
        )
        await session.commit()

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_RESEARCH_PLAN_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=completed_steps),  # type: ignore
            message="Research plan saved successfully",
        ),
    )


async def handle_research_deep_dive(
    *,
    application_id: UUID,
    data: dict[str, Any],
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    deep_dive_input = ResearchDeepDiveInput(research_deep_dive=data.get("research_deep_dive", {}))

    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        form_inputs = application.form_inputs or {}
        form_inputs.update(deep_dive_input.research_deep_dive)

        completed_steps = await store_wizard_state(
            store=store,
            current_step=EVENT_RESEARCH_DEEP_DIVE,
        )

        await session.execute(
            update(GrantApplication).where(GrantApplication.id == application_id).values(form_inputs=form_inputs)
        )
        await session.commit()

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_RESEARCH_DEEP_DIVE_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=completed_steps),  # type: ignore
            message="Research deep dive saved successfully",
        ),
    )


async def handle_generate_application(
    *,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    await handler.send_message(
        WebsocketInfoMessage(
            type="info",
            event=EVENT_GENERATION_STARTED,
            content="Starting application generation...",
        ),
    )

    application_text, section_texts = await grant_application_text_generation_pipeline_handler(
        application_id=str(application_id),
        message_handler=handler.send_message,
    )

    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == application_id)
            .values(
                status=ApplicationStatusEnum.COMPLETED,
                text=application_text,
                completed_at=now(),
            )
        )
        await session.commit()
        await store.delete(WIZARD_STEPS_COMPLETED_VALKEY_KEY)

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_GENERATION_COMPLETE,
            content=prepare_wizard_response(application=application),  # type: ignore
            message="Application generated successfully",
        ),
    )


async def handle_cancel_application(
    *,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        await session.execute(delete(GrantApplication).where(GrantApplication.id == application_id))

        await store.delete(WIZARD_STEPS_COMPLETED_VALKEY_KEY)

        await session.commit()

    await handler.send_message(
        WebsocketInfoMessage(
            type="info",
            event=EVENT_APPLICATION_CANCELLED,
            content="Application cancelled successfully",
        ),
    )


async def handle_knowledge_base(
    *,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    async with session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == application_id))

        if not application:
            raise ValidationException(f"Application with ID {application_id} not found")

        file_count = await session.scalar(
            select(func.count())
            .select_from(GrantApplicationRagSource)
            .where(GrantApplicationRagSource.grant_application_id == application_id)
        )

        if file_count == 0:
            raise ValidationException("At least one file must be uploaded before proceeding")

        completed_steps = await store_wizard_state(
            store=store,
            current_step=EVENT_KNOWLEDGE_BASE,
        )

        await session.commit()

    application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    await handler.send_message(
        WebsocketDataMessage(
            type="data",
            event=EVENT_KNOWLEDGE_BASE_SUCCESS,
            content=prepare_wizard_response(application=application, completed_steps=completed_steps),  # type: ignore
            message="Knowledge base files validated successfully",
        ),
    )


async def handle_user_data_message(
    *,
    application_id: UUID,
    event_type: str,
    data: dict[str, Any],
    session_maker: async_sessionmaker[Any],
    handler: MessageHandler,
    store: ValkeyStore,
) -> None:
    if event_type == EVENT_APPLICATION_SETUP:
        await handle_application_setup(
            application_id=application_id, data=data, session_maker=session_maker, handler=handler, store=store
        )
    elif event_type == EVENT_TEMPLATE_REVIEW:
        await handle_template_review(
            application_id=application_id,
            data=data,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )
    elif event_type == EVENT_KNOWLEDGE_BASE:
        await handle_knowledge_base(
            application_id=application_id,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )
    elif event_type == EVENT_RESEARCH_PLAN:
        await handle_research_plan(
            application_id=application_id,
            data=data,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )
    elif event_type == EVENT_RESEARCH_DEEP_DIVE:
        await handle_research_deep_dive(
            application_id=application_id,
            data=data,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )
    elif event_type == EVENT_GENERATE_APPLICATION:
        await handle_generate_application(
            application_id=application_id,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )
    elif event_type == EVENT_CANCEL_APPLICATION:
        await handle_cancel_application(
            application_id=application_id,
            session_maker=session_maker,
            handler=handler,
            store=store,
        )


@websocket(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
        "/workspaces/{workspace_id:uuid}/applications/new",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GrantApplicationWebsocket",
)
async def handle_application_websocket(
    session_maker: async_sessionmaker[Any],
    socket: APIWebsocket,
    workspace_id: UUID,
    application_id: UUID | None = None,
) -> None:
    await socket.accept()
    handler = MessageHandler(socket)

    try:
        store = cast("ValkeyStore", socket.app.stores.get(str(application_id if application_id else "temp")))

        if not application_id:
            application_id = await handle_create_application(
                workspace_id=workspace_id, session_maker=session_maker, store=store
            )
            application = await retrieve_application(application_id=application_id, session_maker=session_maker)

            await handler.send_message(
                WebsocketDataMessage(
                    type="data",
                    event=EVENT_APPLICATION_CREATED,
                    content=prepare_wizard_response(application),  # type: ignore
                    message="Application created successfully",
                ),
            )

            store = cast("ValkeyStore", socket.app.stores.get(str(application_id)))

        while data := await socket.receive_json():
            if data.get("type") == "data":
                message = WebsocketDataMessage(**data)
                await handle_user_data_message(
                    event_type=message.event,
                    data=message.content,
                    handler=handler,
                    application_id=application_id,
                    session_maker=session_maker,
                    store=store,
                )
    except ValidationException as e:
        await socket.close(
            code=WS_1006_ABNORMAL_CLOSURE, reason=f"WebSocket disconnected due to an validation error {e!s}"
        )
    except BackendError as e:
        logger.error("Backend error in grant application websocket", error=e)
        await handler.send_message(
            WebsocketErrorMessage(
                type="error",
                event="pipeline_error",
                content=f"Error in grant application websocket: {e!s}",
                context={"error_type": e.__class__.__name__, **e.context},
            )
        )
