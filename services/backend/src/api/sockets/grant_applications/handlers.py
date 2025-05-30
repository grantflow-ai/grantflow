from datetime import timedelta
from typing import Any, cast
from uuid import UUID

from litestar.exceptions import ValidationException
from litestar.stores.valkey import ValkeyStore
from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import GrantApplication, GrantApplicationRagSource, GrantTemplate
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize
from services.backend.src.dto import WebsocketDataMessage, WebsocketInfoMessage
from services.backend.src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.backend.src.rag.grant_template.handler import grant_template_generation_pipeline_handler
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import now

from .constants import (
    EVENT_APPLICATION_CANCELLED,
    EVENT_APPLICATION_SETUP,
    EVENT_APPLICATION_SETUP_SUCCESS,
    EVENT_APPLICATION_STATUS_UPDATE,
    EVENT_CANCEL_APPLICATION,
    EVENT_GENERATE_APPLICATION,
    EVENT_GENERATION_COMPLETE,
    EVENT_GENERATION_STARTED,
    EVENT_KNOWLEDGE_BASE,
    EVENT_KNOWLEDGE_BASE_SUCCESS,
    EVENT_RESEARCH_DEEP_DIVE,
    EVENT_RESEARCH_DEEP_DIVE_SUCCESS,
    EVENT_RESEARCH_PLAN,
    EVENT_RESEARCH_PLAN_SUCCESS,
    EVENT_TEMPLATE_GENERATION_SUCCESS,
    EVENT_TEMPLATE_REVIEW,
    EVENT_TEMPLATE_UPDATE_SUCCESS,
    WIZARD_STEPS_COMPLETED_VALKEY_KEY,
)
from .dto import (
    ApplicationSetupInput,
    ResearchDeepDiveInput,
    ResearchObjectiveInput,
    ResearchPlanInput,
    ResearchTask,
    TemplateReviewInput,
)
from .utils import MessageHandler, prepare_wizard_response, store_wizard_state

logger = get_logger(__name__)


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
