from typing import Any, NotRequired, TypedDict

import stripe
from litestar import get, post
from litestar.exceptions import HTTPException
from packages.db.src.tables import Subscription, SubscriptionPlan, User
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)


stripe.api_key = get_env("STRIPE_SECRET_KEY", raise_on_missing=False) or ""


class SubscriptionPlanResponse(TypedDict):
    id: str
    stripe_plan_id: str
    name: str
    description: NotRequired[str]
    price: int
    currency: str
    interval: str
    interval_count: int
    features: NotRequired[list[str]]
    active: bool


class SubscriptionPlansResponse(TypedDict):
    plans: list[SubscriptionPlanResponse]


class CreateCheckoutSessionRequest(TypedDict):
    plan_id: str
    success_url: NotRequired[str]
    cancel_url: NotRequired[str]


class CreateCheckoutSessionResponse(TypedDict):
    checkout_url: str
    session_id: str


class CreatePortalSessionResponse(TypedDict):
    portal_url: str


class SubscriptionResponse(TypedDict):
    active: bool
    status: NotRequired[str]
    plan_id: NotRequired[str]
    plan_name: NotRequired[str]
    current_period_end: NotRequired[str]
    cancel_at_period_end: NotRequired[bool]
    stripe_subscription_id: NotRequired[str]


@get(
    "/billing/plans",
    operation_id="GetSubscriptionPlans",
    summary="Get available subscription plans",
    description="Retrieve all active subscription plans",
)
async def get_subscription_plans(
    session_maker: async_sessionmaker[Any],
) -> SubscriptionPlansResponse:
    """Get available subscription plans.

    Args:
        session_maker: Database session maker

    Returns:
        List of available subscription plans
    """
    logger.info("Fetching subscription plans")

    async with session_maker() as session:
        result = await session.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.active)
            .order_by(SubscriptionPlan.sort_order)
        )
        plans = result.scalars().all()

        response_plans: list[SubscriptionPlanResponse] = []
        for plan in plans:
            plan_response: SubscriptionPlanResponse = {
                "id": str(plan.id),
                "stripe_plan_id": plan.stripe_plan_id,
                "name": plan.name,
                "price": plan.price,
                "currency": plan.currency,
                "interval": plan.interval,
                "interval_count": plan.interval_count,
                "active": plan.active,
            }

            if plan.description:
                plan_response["description"] = plan.description
            if plan.features:
                plan_response["features"] = plan.features

            response_plans.append(plan_response)

        logger.info("Retrieved subscription plans", count=len(response_plans))
        return SubscriptionPlansResponse(plans=response_plans)


@post(
    "/billing/checkout/session",
    operation_id="CreateCheckoutSession",
    summary="Create Stripe checkout session",
    description="Create a new Stripe checkout session for subscription",
)
async def create_checkout_session(
    data: CreateCheckoutSessionRequest,
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> CreateCheckoutSessionResponse:
    """Create Stripe checkout session.

    Args:
        data: Checkout session request data
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Checkout session URL and ID

    Raises:
        HTTPException: If plan not found or Stripe error
    """
    logger.info(
        "Creating checkout session", firebase_uid=request.auth, plan_id=data["plan_id"]
    )

    if not stripe.api_key:
        logger.error("Stripe API key not configured")
        raise HTTPException(status_code=500, detail="Payment system not configured")

    async with session_maker() as session:
        result = await session.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.id == data["plan_id"],
                SubscriptionPlan.active,
            )
        )
        plan = result.scalar_one_or_none()

        if not plan:
            logger.warning("Subscription plan not found", plan_id=data["plan_id"])
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        user_result = await session.execute(
            select(User).where(User.firebase_uid == request.auth)
        )
        user = user_result.scalar_one_or_none()

        subscription_result = await session.execute(
            select(Subscription).where(
                Subscription.firebase_uid == request.auth,
                Subscription.status.in_(["active", "trialing"]),
            )
        )
        existing_subscription = subscription_result.scalar_one_or_none()

        if existing_subscription:
            logger.warning(
                "User already has active subscription", firebase_uid=request.auth
            )
            raise HTTPException(
                status_code=400, detail="User already has an active subscription"
            )

        try:
            checkout_params: dict[str, Any] = {
                "payment_method_types": ["card"],
                "mode": "subscription",
                "line_items": [
                    {
                        "price": plan.stripe_plan_id,
                        "quantity": 1,
                    }
                ],
                "client_reference_id": request.auth,
                "success_url": data.get("success_url")
                or get_env(
                    "STRIPE_SUCCESS_URL",
                    raise_on_missing=False,
                    fallback="https://app.grantflow.ai/billing/success",
                ),
                "cancel_url": data.get("cancel_url")
                or get_env(
                    "STRIPE_CANCEL_URL",
                    raise_on_missing=False,
                    fallback="https://app.grantflow.ai/billing",
                ),
                "metadata": {
                    "firebase_uid": request.auth,
                    "plan_id": str(plan.id),
                },
            }

            if user and user.email:
                checkout_params["customer_email"] = user.email

            checkout_session = stripe.checkout.Session.create(**checkout_params)

            logger.info(
                "Created checkout session",
                firebase_uid=request.auth,
                session_id=checkout_session.id,
            )

            if not checkout_session.url:
                logger.error(
                    "No checkout URL in session", session_id=checkout_session.id
                )
                raise HTTPException(
                    status_code=500, detail="Failed to create checkout session"
                )

            return CreateCheckoutSessionResponse(
                checkout_url=checkout_session.url,
                session_id=checkout_session.id,
            )

        except stripe.StripeError as e:
            logger.exception("Stripe error creating checkout session", error=str(e))
            raise HTTPException(status_code=400, detail=str(e))


class CreatePortalSessionRequest(TypedDict):
    return_url: NotRequired[str]


@post(
    "/billing/portal/session",
    operation_id="CreatePortalSession",
    summary="Create customer portal session",
    description="Create a Stripe customer portal session for subscription management",
)
async def create_portal_session(
    data: CreatePortalSessionRequest,
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> CreatePortalSessionResponse:
    """Create customer portal session.

    Args:
        data: Portal session request data
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Portal session URL

    Raises:
        HTTPException: If no subscription found or Stripe error
    """
    logger.info("Creating portal session", firebase_uid=request.auth)

    if not stripe.api_key:
        logger.error("Stripe API key not configured")
        raise HTTPException(status_code=500, detail="Payment system not configured")

    async with session_maker() as session:
        result = await session.execute(
            select(Subscription).where(
                Subscription.firebase_uid == request.auth,
                Subscription.stripe_customer_id.isnot(None),
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription or not subscription.stripe_customer_id:
            logger.warning(
                "No subscription found for portal session", firebase_uid=request.auth
            )
            raise HTTPException(status_code=404, detail="No subscription found")

        try:
            portal_params = {
                "customer": subscription.stripe_customer_id,
                "return_url": data.get("return_url")
                or get_env(
                    "STRIPE_PORTAL_RETURN_URL",
                    raise_on_missing=False,
                    fallback="https://app.grantflow.ai/billing",
                ),
            }

            configuration_id = get_env(
                "STRIPE_PORTAL_CONFIG_ID", raise_on_missing=False
            )
            if configuration_id:
                portal_params["configuration"] = configuration_id

            portal_session = stripe.billing_portal.Session.create(**portal_params)

            logger.info(
                "Created portal session",
                firebase_uid=request.auth,
                portal_id=portal_session.id,
            )

            return CreatePortalSessionResponse(portal_url=portal_session.url)

        except stripe.StripeError as e:
            logger.exception("Stripe error creating portal session", error=str(e))
            raise HTTPException(status_code=400, detail=str(e))


@get(
    "/billing/subscription",
    operation_id="GetSubscription",
    summary="Get current subscription",
    description="Get the authenticated user's current subscription status",
)
async def get_subscription(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> SubscriptionResponse:
    """Get current subscription status.

    Args:
        request: API request with authenticated user
        session_maker: Database session maker

    Returns:
        Subscription status information
    """
    logger.info("Getting subscription status", firebase_uid=request.auth)

    async with session_maker() as session:
        result = await session.execute(
            select(Subscription, SubscriptionPlan)
            .join(SubscriptionPlan)
            .where(Subscription.firebase_uid == request.auth)
            .order_by(Subscription.created_at.desc())
        )
        row = result.first()

        if not row:
            logger.info("No subscription found", firebase_uid=request.auth)
            return SubscriptionResponse(active=False)

        subscription, plan = row

        is_active = subscription.status in ["active", "trialing"]

        response: SubscriptionResponse = {
            "active": is_active,
        }

        if subscription.status:
            response["status"] = subscription.status
        if plan:
            response["plan_id"] = str(plan.id)
            response["plan_name"] = plan.name
        if subscription.current_period_end:
            response["current_period_end"] = subscription.current_period_end.isoformat()
        if subscription.cancel_at_period_end is not None:
            response["cancel_at_period_end"] = subscription.cancel_at_period_end
        if subscription.stripe_subscription_id:
            response["stripe_subscription_id"] = subscription.stripe_subscription_id

        logger.info(
            "Retrieved subscription status",
            firebase_uid=request.auth,
            status=subscription.status,
        )

        return response
