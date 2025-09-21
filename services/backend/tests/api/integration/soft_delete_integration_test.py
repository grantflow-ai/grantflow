from collections.abc import AsyncIterator
from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.enums import NotificationTypeEnum, UserRoleEnum
from packages.db.src.tables import (
    Grant,
    GrantApplication,
    GrantingInstitution,
    GrantMatchingSubscription,
    Notification,
    Organization,
    OrganizationInvitation,
    Project,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload


@pytest.fixture
async def comprehensive_test_data(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
) -> dict[str, Any]:
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(
            full_name="Test Research Institute",
            abbreviation="TRI",
        )
        session.add(institution)
        await session.flush()

        active_project = Project(
            organization_id=organization.id,
            name="Active Project",
            description="An active research project",
        )
        deleted_project = Project(
            organization_id=organization.id,
            name="Deleted Project",
            description="A soft-deleted research project",
        )
        deleted_project.soft_delete()

        session.add(active_project)
        session.add(deleted_project)
        await session.flush()

        active_application = GrantApplication(
            project_id=active_project.id,
            title="Active Grant Application",
            description="An active grant application",
        )
        deleted_application = GrantApplication(
            project_id=active_project.id,
            title="Deleted Grant Application",
            description="A soft-deleted grant application",
        )
        deleted_application.soft_delete()

        session.add(active_application)
        session.add(deleted_application)
        await session.flush()

        active_grant = Grant(
            granting_institution_id=institution.id,
            title="Active Public Grant",
            description="An active public grant",
            release_date="2024-01-01",
            expired_date="2024-12-31",
            activity_code="R01",
            organization="NIH",
            parent_organization="HHS",
            participating_orgs="Universities",
            document_number="PA-24-ACTIVE",
            document_type="Program Announcement",
            clinical_trials="Not Applicable",
            url="https://grants.nih.gov/active",
            amount="$100,000 - $500,000",
            amount_min=100000,
            amount_max=500000,
            category="Research",
            eligibility="Universities",
        )
        deleted_grant = Grant(
            granting_institution_id=institution.id,
            title="Deleted Public Grant",
            description="A soft-deleted public grant",
            release_date="2024-01-01",
            expired_date="2024-12-31",
            activity_code="R02",
            organization="NIH",
            parent_organization="HHS",
            participating_orgs="Universities",
            document_number="PA-24-DELETED",
            document_type="Program Announcement",
            clinical_trials="Not Applicable",
            url="https://grants.nih.gov/deleted",
            amount="$50,000 - $200,000",
            amount_min=50000,
            amount_max=200000,
            category="Research",
            eligibility="Universities",
        )
        deleted_grant.soft_delete()

        session.add(active_grant)
        session.add(deleted_grant)
        await session.flush()

        firebase_uid = "test_user_123"
        active_notification = Notification(
            firebase_uid=firebase_uid,
            project_id=active_project.id,
            type=NotificationTypeEnum.DEADLINE,
            title="Active Notification",
            message="An active notification",
            project_name=active_project.name,
            read=False,
            dismissed=False,
        )
        deleted_notification = Notification(
            firebase_uid=firebase_uid,
            project_id=active_project.id,
            type=NotificationTypeEnum.WARNING,
            title="Deleted Notification",
            message="A soft-deleted notification",
            project_name=active_project.name,
            read=False,
            dismissed=False,
        )
        deleted_notification.soft_delete()

        session.add(active_notification)
        session.add(deleted_notification)
        await session.flush()

        active_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="active@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        deleted_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="deleted@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        deleted_invitation.soft_delete()

        session.add(active_invitation)
        session.add(deleted_invitation)
        await session.flush()

        active_subscription = GrantMatchingSubscription(
            email="active-subscriber@example.com",
            search_params={"category": "Research"},
            frequency="weekly",
        )
        deleted_subscription = GrantMatchingSubscription(
            email="deleted-subscriber@example.com",
            search_params={"category": "Health"},
            frequency="daily",
        )
        deleted_subscription.soft_delete()

        session.add(active_subscription)
        session.add(deleted_subscription)

        await session.flush()

        for obj in [
            institution,
            active_project,
            deleted_project,
            active_application,
            deleted_application,
            active_grant,
            deleted_grant,
            active_notification,
            deleted_notification,
            active_invitation,
            deleted_invitation,
            active_subscription,
            deleted_subscription,
        ]:
            await session.refresh(obj)

        await session.commit()

        return {
            "institution": institution,
            "active_project": active_project,
            "deleted_project": deleted_project,
            "active_application": active_application,
            "deleted_application": deleted_application,
            "active_grant": active_grant,
            "deleted_grant": deleted_grant,
            "active_notification": active_notification,
            "deleted_notification": deleted_notification,
            "active_invitation": active_invitation,
            "deleted_invitation": deleted_invitation,
            "active_subscription": active_subscription,
            "deleted_subscription": deleted_subscription,
            "firebase_uid": firebase_uid,
        }


@pytest.fixture
async def public_grants_client(async_session_maker: async_sessionmaker[Any]) -> AsyncIterator[Any]:
    from litestar import Litestar
    from litestar.di import Provide
    from litestar.testing import AsyncTestClient

    from services.backend.src.api.routes.grants import (
        handle_create_subscription,
        handle_get_grant_details,
        handle_search_grants,
        handle_unsubscribe,
    )

    def provide_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    app = Litestar(
        route_handlers=[
            handle_search_grants,
            handle_get_grant_details,
            handle_create_subscription,
            handle_unsubscribe,
        ],
        debug=True,
        dependencies={"session_maker": Provide(provide_session_maker, sync_to_thread=False)},
    )

    async with AsyncTestClient(app=app, raise_server_exceptions=False) as client:
        yield client


async def test_soft_delete_integration_public_grant_endpoints_security(
    public_grants_client: Any,
    comprehensive_test_data: dict[str, Any],
) -> None:
    data = comprehensive_test_data

    response = await public_grants_client.get("/grants")
    assert response.status_code == HTTPStatus.OK
    grants = response.json()

    grant_ids = {grant["id"] for grant in grants}
    assert str(data["active_grant"].id) in grant_ids
    assert str(data["deleted_grant"].id) not in grant_ids

    response = await public_grants_client.get(f"/grants/{data['active_grant'].document_number}")
    assert response.status_code == HTTPStatus.OK
    grant_detail = response.json()
    assert grant_detail["title"] == "Active Public Grant"

    response = await public_grants_client.get(f"/grants/{data['deleted_grant'].document_number}")
    assert response.status_code == HTTPStatus.NOT_FOUND

    response = await public_grants_client.post("/grants/unsubscribe", json={"email": "active-subscriber@example.com"})
    assert response.status_code in [HTTPStatus.OK, HTTPStatus.CREATED]

    response = await public_grants_client.post("/grants/unsubscribe", json={"email": "deleted-subscriber@example.com"})
    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "No active subscription found" in response.json()["detail"]


async def test_soft_delete_integration_cross_entity_consistency(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    data = comprehensive_test_data

    async with async_session_maker() as session:
        projects = list(await session.scalars(select(Project).where(Project.deleted_at.is_(None))))
        project_ids = {p.id for p in projects}
        assert data["active_project"].id in project_ids
        assert data["deleted_project"].id not in project_ids

        applications = list(
            await session.scalars(select(GrantApplication).where(GrantApplication.deleted_at.is_(None)))
        )
        app_ids = {a.id for a in applications}
        assert data["active_application"].id in app_ids
        assert data["deleted_application"].id not in app_ids

        grants = list(await session.scalars(select(Grant).where(Grant.deleted_at.is_(None))))
        grant_ids = {g.id for g in grants}
        assert data["active_grant"].id in grant_ids
        assert data["deleted_grant"].id not in grant_ids

        notifications = list(await session.scalars(select(Notification).where(Notification.deleted_at.is_(None))))
        notif_ids = {n.id for n in notifications}
        assert data["active_notification"].id in notif_ids
        assert data["deleted_notification"].id not in notif_ids

        invitations = list(
            await session.scalars(select(OrganizationInvitation).where(OrganizationInvitation.deleted_at.is_(None)))
        )
        inv_ids = {i.id for i in invitations}
        assert data["active_invitation"].id in inv_ids
        assert data["deleted_invitation"].id not in inv_ids

        subscriptions = list(
            await session.scalars(
                select(GrantMatchingSubscription).where(GrantMatchingSubscription.deleted_at.is_(None))
            )
        )
        sub_ids = {s.id for s in subscriptions}
        assert data["active_subscription"].id in sub_ids
        assert data["deleted_subscription"].id not in sub_ids


async def test_soft_delete_integration_relationship_loading_respects_soft_delete(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    data = comprehensive_test_data

    async with async_session_maker() as session:
        project = await session.scalar(
            select(Project)
            .where(Project.id == data["active_project"].id)
            .options(selectinload(Project.grant_applications))
        )

        assert project is not None
        active_applications = [app for app in project.grant_applications if app.deleted_at is None]
        app_ids = {app.id for app in active_applications}

        assert data["active_application"].id in app_ids
        assert data["deleted_application"].id not in app_ids


async def test_soft_delete_integration_update_operations_ignore_soft_deleted(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    from sqlalchemy import update

    data = comprehensive_test_data

    async with async_session_maker() as session:
        result = await session.execute(
            update(Grant).where(Grant.deleted_at.is_(None)).values(organization="Updated NIH")
        )

        assert result.rowcount == 1
        await session.commit()

        active_grant = await session.scalar(select(Grant).where(Grant.id == data["active_grant"].id))
        deleted_grant = await session.scalar(select(Grant).where(Grant.id == data["deleted_grant"].id))

        assert active_grant is not None
        assert deleted_grant is not None
        assert active_grant.organization == "Updated NIH"
        assert deleted_grant.organization == "NIH"


async def test_soft_delete_integration_join_queries_filter_all_tables(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    data = comprehensive_test_data

    async with async_session_maker() as session:
        results = list(
            await session.scalars(
                select(GrantApplication)
                .join(Project)
                .where(
                    GrantApplication.deleted_at.is_(None),
                    Project.deleted_at.is_(None),
                )
            )
        )

        app_ids = {app.id for app in results}
        assert data["active_application"].id in app_ids
        assert data["deleted_application"].id not in app_ids


async def test_soft_delete_integration_count_queries_exclude_soft_deleted(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    from sqlalchemy import func

    async with async_session_maker() as session:
        active_project_count = await session.scalar(select(func.count(Project.id)).where(Project.deleted_at.is_(None)))

        assert active_project_count == 1

        total_project_count = await session.scalar(select(func.count(Project.id)))

        assert total_project_count == 2

        assert total_project_count > active_project_count


async def test_soft_delete_integration_audit_trail_preserved_for_soft_deleted(
    async_session_maker: async_sessionmaker[Any],
    comprehensive_test_data: dict[str, Any],
) -> None:
    data = comprehensive_test_data

    async with async_session_maker() as session:
        deleted_grant = await session.scalar(select(Grant).where(Grant.id == data["deleted_grant"].id))

        assert deleted_grant is not None
        assert deleted_grant.deleted_at is not None
        assert deleted_grant.title == "Deleted Public Grant"

        assert deleted_grant.document_number == "PA-24-DELETED"
        assert deleted_grant.category == "Research"
