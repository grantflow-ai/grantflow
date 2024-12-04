from typing import Any

from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]

from src.db.tables import (
    ApplicationDraft,
    ApplicationFile,
    ApplicationVector,
    GrantApplication,
    ResearchAim,
    ResearchTask,
    User,
    Workspace,
    WorkspaceUser,
)
from tests.factories import (
    ApplicationDraftFactory,
    ApplicationVectorFactory,
    ResearchTaskFactory,
    UserFactory,
    WorkspaceUserFactory,
)


async def test_create_user(async_session_maker: async_sessionmaker[Any]) -> None:
    user_data = UserFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(user_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(User, user_data.id)
        assert result is not None
        assert result.id == user_data.id
        assert result.email == user_data.email
        assert result.display_name == user_data.display_name
        assert result.photo_url == user_data.photo_url


async def test_create_workspace_user(
    async_session_maker: async_sessionmaker[Any], workspace: Workspace, user: User
) -> None:
    workspace_user_data = WorkspaceUserFactory.build(
        user_id=user.id, workspace_id=workspace.id, workspace=workspace, user=user
    )

    async with async_session_maker() as session, session.begin():
        session.add(workspace_user_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(WorkspaceUser, {"workspace_id": workspace.id, "user_id": user.id})
        assert result is not None
        assert result.workspace_id == workspace_user_data.workspace_id
        assert result.user_id == workspace_user_data.user_id
        assert result.role == workspace_user_data.role


async def test_create_research_task(async_session_maker: async_sessionmaker[Any], research_aim: ResearchAim) -> None:
    task_data = ResearchTaskFactory.build(aim_id=research_aim.id, research_aim=research_aim)

    async with async_session_maker() as session, session.begin():
        session.add(task_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(ResearchTask, task_data.id)
        assert result is not None
        assert result.id == task_data.id
        assert result.aim_id == task_data.aim_id
        assert result.title == task_data.title
        assert result.description == task_data.description


async def test_application_draft_result(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication
) -> None:
    result_data = ApplicationDraftFactory.build(application_id=application.id, grant_application=application)

    async with async_session_maker() as session, session.begin():
        session.add(result_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(ApplicationDraft, result_data.id)
        assert result is not None
        assert result.id == result_data.id
        assert result.application_id == result_data.application_id
        assert result.duration == result_data.duration
        assert result.text == result_data.text


async def test_create_application_vector(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication, application_file: ApplicationFile
) -> None:
    vector_data = ApplicationVectorFactory.build(
        application_id=application.id,
        file_id=application_file.id,
    )

    async with async_session_maker() as session, session.begin():
        session.add(vector_data)
        await session.commit()

    async with async_session_maker() as session:
        result = await session.get(
            ApplicationVector,
            {
                "application_id": vector_data.application_id,
                "chunk_index": vector_data.chunk_index,
                "file_id": vector_data.file_id,
            },
        )
        assert result is not None
        assert result.application_id == vector_data.application_id
        assert result.chunk_index == vector_data.chunk_index
        assert result.content == vector_data.content
        assert result.element_type == vector_data.element_type
        assert result.file_id == vector_data.file_id
        assert result.page_number == vector_data.page_number
        assert result.embedding is not None
