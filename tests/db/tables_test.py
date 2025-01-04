from typing import Any

from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import (
    ApplicationVector,
    GrantApplication,
    GrantApplicationFile,
    ResearchAim,
    ResearchTask,
    Workspace,
    WorkspaceUser,
)
from tests.factories import (
    ApplicationVectorFactory,
    ResearchTaskFactory,
    WorkspaceUserFactory,
)


async def test_create_workspace_user(
    async_session_maker: async_sessionmaker[Any], workspace: Workspace, firebase_uid: str
) -> None:
    workspace_user_data = WorkspaceUserFactory.build(
        workspace_id=workspace.id, workspace=workspace, firebase_uid=firebase_uid
    )

    async with async_session_maker() as session, session.begin():
        session.add(workspace_user_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(WorkspaceUser, {"workspace_id": workspace.id, "firebase_uid": firebase_uid})
        assert result is not None
        assert result.workspace_id == workspace_user_data.workspace_id
        assert result.firebase_uid == workspace_user_data.firebase_uid
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


async def test_create_application_vector(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication, application_file: GrantApplicationFile
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
                "application_id": vector_data.grant_application_id,
                "chunk_index": vector_data.chunk["index"],
                "file_id": vector_data.file_id,
            },
        )
        assert result is not None
        assert result.grant_application_id == vector_data.grant_application_id
        assert result.chunk["index"] == vector_data.chunk["index"]
        assert result.chunk["content"] == vector_data.chunk["content"]
        assert result.file_id == vector_data.file_id
        assert result.embedding is not None
