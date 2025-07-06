from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any
from unittest.mock import Mock, patch

from packages.db.src.tables import User
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import SubscriptionFactory, SubscriptionPlanFactory

from services.backend.tests.conftest import TestingClientType


async def test_get_subscription_plans_empty(
    test_client: TestingClientType,
) -> None:
    """Test getting subscription plans when none exist."""
    response = await test_client.get(
        "/billing/plans",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["plans"] == []


async def test_get_subscription_plans_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test successfully getting subscription plans."""

    plans = [
        SubscriptionPlanFactory.build(
            name="Starter",
            price=900,
            sort_order=0,
            active=True,
        ),
        SubscriptionPlanFactory.build(
            name="Professional",
            price=2900,
            sort_order=1,
            active=True,
        ),
        SubscriptionPlanFactory.build(
            name="Inactive",
            price=9900,
            sort_order=2,
            active=False,
        ),
    ]

    async with async_session_maker() as session, session.begin():
        for plan in plans:
            session.add(plan)
        await session.commit()

    response = await test_client.get(
        "/billing/plans",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert len(data["plans"]) == 2
    assert data["plans"][0]["name"] == "Starter"
    assert data["plans"][0]["price"] == 900
    assert data["plans"][1]["name"] == "Professional"
    assert data["plans"][1]["price"] == 2900


async def test_create_checkout_session_no_stripe_key(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test creating checkout session without Stripe key configured."""
    plan = SubscriptionPlanFactory.build()

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        session.add(plan)
        await session.commit()

    with patch("services.backend.src.api.routes.billing.stripe.api_key", ""):
        response = await test_client.post(
            "/billing/checkout/session",
            headers={"Authorization": "Bearer some_token"},
            json={"plan_id": str(plan.id)},
        )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "Payment system not configured" in response.text


async def test_create_checkout_session_plan_not_found(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test creating checkout session with non-existent plan."""

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        await session.commit()

    with patch(
        "services.backend.src.api.routes.billing.stripe.api_key", "sk_test_mock"
    ):
        response = await test_client.post(
            "/billing/checkout/session",
            headers={"Authorization": "Bearer some_token"},
            json={"plan_id": "00000000-0000-0000-0000-000000000000"},
        )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "Subscription plan not found" in response.text


@patch("services.backend.src.api.routes.billing.stripe.api_key", "sk_test_mock")
@patch("services.backend.src.api.routes.billing.stripe.checkout.Session")
async def test_create_checkout_session_success(
    mock_session: Mock,
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test successfully creating checkout session."""
    plan = SubscriptionPlanFactory.build(
        stripe_plan_id="price_test123",
        active=True,
    )

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid, email="test@example.com")
        session.add(user)
        session.add(plan)
        await session.commit()

    mock_checkout = Mock()
    mock_checkout.id = "cs_test123"
    mock_checkout.url = "https://checkout.stripe.com/test"
    mock_session.create.return_value = mock_checkout

    response = await test_client.post(
        "/billing/checkout/session",
        headers={"Authorization": "Bearer some_token"},
        json={
            "plan_id": str(plan.id),
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()
    assert data["checkout_url"] == "https://checkout.stripe.com/test"
    assert data["session_id"] == "cs_test123"

    mock_session.create.assert_called_once()
    call_args = mock_session.create.call_args[1]
    assert call_args["payment_method_types"] == ["card"]
    assert call_args["mode"] == "subscription"
    assert call_args["customer_email"] == "test@example.com"
    assert call_args["metadata"]["firebase_uid"] == firebase_uid
    assert call_args["metadata"]["plan_id"] == str(plan.id)


async def test_create_checkout_session_existing_subscription(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test creating checkout session when user already has active subscription."""
    plan = SubscriptionPlanFactory.build(active=True)
    subscription = SubscriptionFactory.build(
        firebase_uid=firebase_uid,
        plan_id=plan.id,
        status="active",
    )

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        session.add(plan)
        session.add(subscription)
        await session.commit()

    with patch(
        "services.backend.src.api.routes.billing.stripe.api_key", "sk_test_mock"
    ):
        response = await test_client.post(
            "/billing/checkout/session",
            headers={"Authorization": "Bearer some_token"},
            json={"plan_id": str(plan.id)},
        )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "already has an active subscription" in response.text


async def test_create_portal_session_no_subscription(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test creating portal session without subscription."""

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        await session.commit()

    with patch(
        "services.backend.src.api.routes.billing.stripe.api_key", "sk_test_mock"
    ):
        response = await test_client.post(
            "/billing/portal/session",
            headers={"Authorization": "Bearer some_token"},
            json={},
        )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "No subscription found" in response.text


@patch("services.backend.src.api.routes.billing.stripe.api_key", "sk_test_mock")
@patch("services.backend.src.api.routes.billing.stripe.billing_portal.Session")
async def test_create_portal_session_success(
    mock_portal_session: Mock,
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test successfully creating portal session."""
    plan = SubscriptionPlanFactory.build()
    subscription = SubscriptionFactory.build(
        firebase_uid=firebase_uid,
        plan_id=plan.id,
        stripe_customer_id="cus_test123",
    )

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        session.add(plan)
        session.add(subscription)
        await session.commit()

    mock_portal = Mock()
    mock_portal.id = "bps_test123"
    mock_portal.url = "https://billing.stripe.com/session/test"
    mock_portal_session.create.return_value = mock_portal

    response = await test_client.post(
        "/billing/portal/session",
        headers={"Authorization": "Bearer some_token"},
        json={"return_url": "https://example.com/billing"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()
    assert data["portal_url"] == "https://billing.stripe.com/session/test"

    mock_portal_session.create.assert_called_once()
    call_args = mock_portal_session.create.call_args[1]
    assert call_args["customer"] == "cus_test123"
    assert call_args["return_url"] == "https://example.com/billing"


async def test_get_subscription_no_subscription(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test getting subscription status when none exists."""

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        await session.commit()
    response = await test_client.get(
        "/billing/subscription",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["active"] is False
    assert "status" not in data


async def test_get_subscription_active(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test getting active subscription status."""
    plan = SubscriptionPlanFactory.build(name="Professional")
    subscription = SubscriptionFactory.build(
        firebase_uid=firebase_uid,
        plan_id=plan.id,
        status="active",
        current_period_end=datetime.now(UTC),
        cancel_at_period_end=False,
    )

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        session.add(plan)
        session.add(subscription)
        await session.commit()

    response = await test_client.get(
        "/billing/subscription",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["active"] is True
    assert data["status"] == "active"
    assert data["plan_name"] == "Professional"
    assert data["cancel_at_period_end"] is False
    assert "current_period_end" in data
    assert "stripe_subscription_id" in data


async def test_get_subscription_canceled(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    """Test getting canceled subscription status."""
    plan = SubscriptionPlanFactory.build()
    subscription = SubscriptionFactory.build(
        firebase_uid=firebase_uid,
        plan_id=plan.id,
        status="canceled",
        cancel_at_period_end=True,
    )

    async with async_session_maker() as session, session.begin():
        user = User(firebase_uid=firebase_uid)
        session.add(user)
        session.add(plan)
        session.add(subscription)
        await session.commit()

    response = await test_client.get(
        "/billing/subscription",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["active"] is False
    assert data["status"] == "canceled"
    assert data["cancel_at_period_end"] is True
