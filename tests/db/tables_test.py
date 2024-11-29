from typing import Any

from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]

from src.db.tables import (
    ApplicationFile,
    ApplicationVector,
    GenerationResult,
    GrantApplication,
    ResearchAim,
    ResearchInnovation,
    ResearchSignificance,
    ResearchTask,
    User,
    Workspace,
    WorkspaceUser,
)
from tests.factories import (
    ApplicationVectorFactory,
    GenerationResultFactory,
    ResearchInnovationFactory,
    ResearchSignificanceFactory,
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
        assert result.role == user_data.role


async def test_create_workspace_user(async_session_maker: async_sessionmaker[Any], workspace: Workspace) -> None:
    user = UserFactory.build()
    workspace_user_data = WorkspaceUserFactory.build(user_id=user.id, workspace_id=workspace.id)

    async with async_session_maker() as session, session.begin():
        session.add(user)
        session.add(workspace_user_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(WorkspaceUser, {"workspace_id": workspace.id, "user_id": user.id})
        assert result is not None
        assert result.workspace_id == workspace_user_data.workspace_id
        assert result.user_id == workspace_user_data.user_id
        assert result.role == workspace_user_data.role


async def test_create_research_significance(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication
) -> None:
    significance_data = ResearchSignificanceFactory.build(application_id=application.id)

    async with async_session_maker() as session, session.begin():
        session.add(significance_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(ResearchSignificance, significance_data.id)
        assert result is not None
        assert result.id == significance_data.id
        assert result.application_id == significance_data.application_id
        assert result.text == significance_data.text


async def test_create_research_innovation(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication
) -> None:
    innovation_data = ResearchInnovationFactory.build(application_id=application.id)

    async with async_session_maker() as session, session.begin():
        session.add(innovation_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(ResearchInnovation, innovation_data.id)
        assert result is not None
        assert result.id == innovation_data.id
        assert result.application_id == innovation_data.application_id
        assert result.text == innovation_data.text


async def test_create_research_task(async_session_maker: async_sessionmaker[Any], research_aim: ResearchAim) -> None:
    task_data = ResearchTaskFactory.build(aim_id=research_aim.id)

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


async def test_create_generation_result(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication
) -> None:
    result_data = GenerationResultFactory.build(application_id=application.id)

    async with async_session_maker() as session, session.begin():
        session.add(result_data)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        result = await session.get(GenerationResult, result_data.id)
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
        assert result.section_name == vector_data.section_name
        assert result.embedding is not None
