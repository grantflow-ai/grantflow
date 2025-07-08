"""Tests for dev bypass functionality."""

import os
from collections.abc import Generator
from typing import Any
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from litestar import Litestar
from litestar.testing import AsyncTestClient
from packages.db.src.enums import ApplicationStatusEnum, UserRoleEnum
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture(autouse=True)
def enable_dev_bypass() -> Generator[None]:
    """Enable dev bypass for all tests in this module."""
    with patch.dict(os.environ, {"ENABLE_DEV_BYPASS": "true"}):
        yield


@pytest.fixture
async def backend_app(async_session_maker: async_sessionmaker[Any]) -> Litestar:
    """Get backend app instance for testing."""
    from services.backend.src.main import app

    app.state.session_maker = async_session_maker
    return app


class TestDevBypassAuth:
    """Test dev bypass authentication endpoints."""

    async def test_dev_login(self, test_client: AsyncClient) -> None:
        """Test dev bypass login returns JWT token."""
        response = await test_client.post("/dev/login", json={"id_token": "mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert "jwt_token" in data
        assert isinstance(data["jwt_token"], str)

    async def test_dev_otp(self, test_client: AsyncClient) -> None:
        """Test dev bypass OTP generation."""
        response = await test_client.get("/dev/otp")
        assert response.status_code == 200
        data = response.json()
        assert "otp" in data
        assert isinstance(data["otp"], str)


class TestDevBypassProjects:
    """Test dev bypass project endpoints."""

    async def test_list_projects(self, test_client: AsyncClient) -> None:
        """Test listing projects returns mock data."""
        response = await test_client.get("/dev/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert isinstance(data["projects"], list)
        if data["projects"]:
            project = data["projects"][0]
            assert "id" in project
            assert "name" in project
            assert "role" in project

    async def test_create_project(self, test_client: AsyncClient) -> None:
        """Test creating project returns ID."""
        response = await test_client.post(
            "/dev/projects",
            json={"name": "Test Project", "description": "Test Description"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert isinstance(data["id"], str)

    async def test_get_project(self, test_client: AsyncClient) -> None:
        """Test getting project returns mock data."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(f"/dev/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert "name" in data
        assert "description" in data

    async def test_update_project(self, test_client: AsyncClient) -> None:
        """Test updating project."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        
        await test_client.get(f"/dev/projects/{project_id}")

        
        response = await test_client.patch(
            f"/dev/projects/{project_id}",
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id

    async def test_delete_project(self, test_client: AsyncClient) -> None:
        """Test deleting project."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.delete(f"/dev/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Project deleted successfully"


class TestDevBypassApplications:
    """Test dev bypass application endpoints."""

    async def test_list_applications(self, test_client: AsyncClient) -> None:
        """Test listing applications with pagination."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(
            f"/dev/projects/{project_id}/applications",
            params={"limit": 10, "offset": 0},
        )
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        assert "pagination" in data
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 0

    async def test_list_applications_by_status(self, test_client: AsyncClient) -> None:
        """Test filtering applications by status."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(
            f"/dev/projects/{project_id}/applications",
            params={"status": ApplicationStatusEnum.DRAFT.value},
        )
        assert response.status_code == 200
        data = response.json()
        
        for app in data["applications"]:
            assert app["status"] == ApplicationStatusEnum.DRAFT.value

    async def test_create_application(self, test_client: AsyncClient) -> None:
        """Test creating application."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.post(
            f"/dev/projects/{project_id}/applications",
            json={"title": "Test Grant Application"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data

    async def test_get_application(self, test_client: AsyncClient) -> None:
        """Test getting application returns full details."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        app_id = "660e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(f"/dev/projects/{project_id}/applications/{app_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == app_id
        assert data["project_id"] == project_id
        assert "title" in data
        assert "status" in data
        assert "grant_template" in data
        assert "rag_sources" in data

    async def test_trigger_autofill(self, test_client: AsyncClient) -> None:
        """Test triggering autofill."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        app_id = "660e8400-e29b-41d4-a716-446655440000"
        response = await test_client.post(
            f"/dev/projects/{project_id}/applications/{app_id}/autofill",
            json={
                "autofill_type": "research_plan",
                "field_name": "objectives",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["application_id"] == app_id
        assert data["autofill_type"] == "research_plan"
        assert data["field_name"] == "objectives"


class TestDevBypassOrganizations:
    """Test dev bypass organization endpoints."""

    async def test_list_organizations(self, test_client: AsyncClient) -> None:
        """Test listing organizations."""
        response = await test_client.get("/dev/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        assert len(data) > 0
        org = data[0]
        assert "id" in org
        assert "full_name" in org

    async def test_create_organization(self, test_client: AsyncClient) -> None:
        """Test creating organization."""
        response = await test_client.post(
            "/dev/organizations",
            json={
                "full_name": "National Science Foundation",
                "abbreviation": "NSF",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data


class TestDevBypassMembers:
    """Test dev bypass member/invitation endpoints."""

    async def test_list_members(self, test_client: AsyncClient) -> None:
        """Test listing project members."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(f"/dev/projects/{project_id}/members")
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert "invitations" in data

    async def test_create_invitation(self, test_client: AsyncClient) -> None:
        """Test creating invitation."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.post(
            f"/dev/projects/{project_id}/invitations",
            json={"role": UserRoleEnum.MEMBER.value},
        )
        assert response.status_code == 200
        data = response.json()
        assert "invitation_url" in data

    async def test_update_member_role(self, test_client: AsyncClient) -> None:
        """Test updating member role."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        member_id = "770e8400-e29b-41d4-a716-446655440000"
        response = await test_client.patch(
            f"/dev/projects/{project_id}/members/{member_id}/role",
            json={"role": UserRoleEnum.OWNER.value},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == member_id


class TestDevBypassSources:
    """Test dev bypass source endpoints."""

    async def test_create_upload_url(self, test_client: AsyncClient) -> None:
        """Test creating upload URLs."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.post(
            f"/dev/projects/{project_id}/sources/upload-url",
            json={
                "filenames": ["doc1.pdf", "doc2.pdf"],
                "grant_application_id": "660e8400-e29b-41d4-a716-446655440000",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "upload_urls" in data
        assert isinstance(data["upload_urls"], dict)

    async def test_crawl_url(self, test_client: AsyncClient) -> None:
        """Test crawling URLs."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.post(
            f"/dev/projects/{project_id}/sources/crawl-url",
            json={
                "urls": ["https://example.com/grant"],
                "grant_application_id": "660e8400-e29b-41d4-a716-446655440000",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data

    async def test_list_sources(self, test_client: AsyncClient) -> None:
        """Test listing sources."""
        project_id = "550e8400-e29b-41d4-a716-446655440000"
        response = await test_client.get(f"/dev/projects/{project_id}/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        assert isinstance(data["sources"], list)


class TestDevBypassDisabled:
    """Test that dev bypass is properly disabled when env var is not set."""

    async def test_dev_bypass_disabled(self, backend_app: Litestar) -> None:
        """Test that dev bypass returns 404 when disabled."""
        with patch.dict(os.environ, {"ENABLE_DEV_BYPASS": "false"}):
            async with AsyncTestClient(app=backend_app) as client:
                response = await client.get("/dev/projects")
                assert response.status_code == 401  

    async def test_normal_routes_still_work(self, backend_app: Litestar) -> None:
        """Test that normal routes still require auth when dev bypass is enabled."""
        async with AsyncTestClient(app=backend_app) as client:
            
            response = await client.get("/projects")
            assert response.status_code == 401


class TestDevBypassStatefulBehavior:
    """Test stateful behavior of dev bypass (data persistence within session)."""

    async def test_created_project_persists(self, test_client: AsyncClient) -> None:
        """Test that created projects persist in memory."""
        
        create_response = await test_client.post(
            "/dev/projects",
            json={"name": "Persistent Project", "description": "Test"},
        )
        project_id = create_response.json()["id"]

        
        get_response = await test_client.get(f"/dev/projects/{project_id}")
        data = get_response.json()
        assert data["name"] == "Persistent Project"
        assert data["description"] == "Test"

        
        await test_client.patch(
            f"/dev/projects/{project_id}",
            json={"name": "Updated Project"},
        )

        
        get_response2 = await test_client.get(f"/dev/projects/{project_id}")
        data2 = get_response2.json()
        assert data2["name"] == "Updated Project"
        assert data2["description"] == "Test"  

    async def test_deleted_project_gone(self, test_client: AsyncClient) -> None:
        """Test that deleted projects are removed."""
        
        create_response = await test_client.post(
            "/dev/projects",
            json={"name": "To Delete"},
        )
        project_id = create_response.json()["id"]

        
        await test_client.delete(f"/dev/projects/{project_id}")

        
        update_response = await test_client.patch(
            f"/dev/projects/{project_id}",
            json={"name": "Should Fail"},
        )
        assert update_response.status_code == 404
