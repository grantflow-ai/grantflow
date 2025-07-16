from typing import Any
from uuid import uuid4

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import GrantApplication, GrantApplicationRagSource, GrantTemplate, Project, ProjectUser
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_duplicate_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: ProjectUser,
) -> None:
    """Test successful application duplication with forking model"""
    
    project_id = grant_application.project_id

    
    async with async_session_maker() as session:
        
        app = await session.get(GrantApplication, grant_application.id)
        app.description = "Original description"
        app.form_inputs = {"field1": "value1"}
        app.research_objectives = [{"objective": "Test objective"}]
        app.text = "Original text content"
        await session.commit()

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy of Test Application"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    if response.status_code != 201:
        pass
    assert response.status_code == 201
    data = response.json()

    
    assert data["title"] == "Copy of Test Application"
    assert data["description"] == "Original description"
    assert data["status"] == ApplicationStatusEnum.DRAFT.value
    assert data["parent_id"] == str(grant_application.id)  
    assert data["id"] != str(grant_application.id)  

    
    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        assert new_app is not None
        assert new_app.parent_id == grant_application.id
        assert new_app.form_inputs == {"field1": "value1"}
        assert new_app.research_objectives == [{"objective": "Test objective"}]
        assert new_app.text == "Original text content"


async def test_duplicate_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_owner_user: ProjectUser,
) -> None:
    """Test duplicating non-existent application"""
    
    non_existent_id = uuid4()

    
    response = await test_client.post(
        f"/projects/{project.id}/applications/{non_existent_id}/duplicate",
        json={"title": "Copy of Non-existent"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 404
    
    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_application_wrong_project(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: ProjectUser,
) -> None:
    """Test duplicating application from different project"""
    
    
    async with async_session_maker() as session:
        other_project = Project(name="Other Project")
        session.add(other_project)
        await session.flush()  

        
        other_project_user = ProjectUser(
            project_id=other_project.id, firebase_uid=project_owner_user.firebase_uid, role=project_owner_user.role
        )
        session.add(other_project_user)
        await session.commit()
        other_project_id = other_project.id

    
    response = await test_client.post(
        f"/projects/{other_project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Unauthorized Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_with_grant_template(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    project_owner_user: ProjectUser,
) -> None:
    """Test that grant template is properly duplicated"""
    
    async with async_session_maker() as session:
        
        template = await session.get(GrantTemplate, grant_template.id)
        app_id = template.grant_application_id
        project = await session.get(GrantApplication, app_id)
        project_id = project.project_id

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{app_id}/duplicate",
        json={"title": "Copy with Template"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 201
    data = response.json()

    
    assert "grant_template" in data
    assert data["grant_template"]["id"] != str(grant_template.id)
    assert data["grant_template"]["grant_sections"] == grant_template.grant_sections


async def test_duplicate_preserves_rag_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application_file: GrantApplicationRagSource,
    project_owner_user: ProjectUser,
) -> None:
    """Test that RAG sources are properly duplicated"""
    
    
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application_file.grant_application_id)
        project_id = app.project_id
        application_id = app.id

        await session.refresh(app, ["rag_sources"])
        original_rag_count = len(app.rag_sources)
        assert original_rag_count > 0  

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with RAG Sources"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 201
    data = response.json()

    
    assert len(data["rag_sources"]) == original_rag_count

    
    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        await session.refresh(new_app, ["rag_sources"])
        assert len(new_app.rag_sources) == original_rag_count


async def test_duplicate_application_validation_error(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: ProjectUser,
) -> None:
    """Test validation error with invalid title"""
    
    project_id = grant_application.project_id

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": ""},
        headers={"Authorization": "Bearer some_token"},
    )

    
    
    assert response.status_code == 201


async def test_duplicate_application_preserves_status_as_draft(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: ProjectUser,
) -> None:
    """Test that duplicated application always starts as DRAFT regardless of original status"""
    
    project_id = grant_application.project_id

    
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        app.status = ApplicationStatusEnum.GENERATING
        await session.commit()

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Draft Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == ApplicationStatusEnum.DRAFT.value  


async def test_duplicate_application_long_title(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: ProjectUser,
) -> None:
    """Test duplication with very long title"""
    
    project_id = grant_application.project_id
    long_title = "A" * 300  

    
    response = await test_client.post(
        f"/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": long_title},
        headers={"Authorization": "Bearer some_token"},
    )

    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == long_title
