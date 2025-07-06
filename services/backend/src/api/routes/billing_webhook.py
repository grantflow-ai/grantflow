from datetime import UTC, datetime
from typing import Any

import stripe
from litestar import Request, post
from litestar.enums import RequestEncodingType
from litestar.exceptions import HTTPException
from litestar.params import Body
from litestar.response import Response
from packages.db.src.tables import Subscription, User
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


stripe.api_key = get_env("STRIPE_SECRET_KEY", raise_on_missing=False) or ""
WEBHOOK_SECRET = get_env("STRIPE_WEBHOOK_SECRET", raise_on_missing=False) or ""


@post(
    "/billing/webhooks/stripe",
    operation_id="StripeWebhook",
    summary="Handle Stripe webhooks",
    description="Process Stripe webhook events for subscription management",
    exclude_from_auth=True,
)
async def stripe_webhook(
    request: Request[Any, Any, Any],
    data: dict[str, Any] = Body(media_type=RequestEncodingType.JSON),
    session_maker: async_sessionmaker[Any] | None = None,
) -> Response[str]:
    """Handle Stripe webhook events.

    Args:
        request: Raw request with headers
        data: Request body (used for typing, actual body from request)
        session_maker: Database session maker

    Returns:
        Success response

    Raises:
        HTTPException: If signature verification fails
    """

    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        logger.warning("Missing Stripe signature header")
        raise HTTPException(status_code=400, detail="Missing signature header")

    if not WEBHOOK_SECRET:
        logger.error("Stripe webhook secret not configured")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    raw_body = await request.body()

    try:
        event = stripe.Webhook.construct_event(raw_body, sig_header, WEBHOOK_SECRET)  # type: ignore[no-untyped-call]
    except ValueError:
        logger.warning("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(
        "Processing webhook event", event_type=event["type"], event_id=event["id"]
    )

    if not session_maker:
        logger.error("No session_maker provided to webhook handler")
        raise HTTPException(status_code=500, detail="Database not configured")

    if event["type"] == "checkout.session.completed":
        await handle_checkout_completed(event, session_maker)
    elif event["type"] == "customer.subscription.created":
        await handle_subscription_created(event, session_maker)
    elif event["type"] == "customer.subscription.updated":
        await handle_subscription_updated(event, session_maker)
    elif event["type"] == "customer.subscription.deleted":
        await handle_subscription_deleted(event, session_maker)
    elif event["type"] == "invoice.payment_succeeded":
        await handle_invoice_payment_succeeded(event, session_maker)
    elif event["type"] == "invoice.payment_failed":
        await handle_invoice_payment_failed(event, session_maker)
    elif event["type"] == "payment_method.attached":
        await handle_payment_method_attached(event, session_maker)
    elif event["type"] == "payment_method.detached":
        await handle_payment_method_detached(event, session_maker)
    elif event["type"] == "customer.updated":
        await handle_customer_updated(event, session_maker)
    else:
        logger.info("Unhandled webhook event type", event_type=event["type"])

    return Response(content="", status_code=200)


async def handle_checkout_completed(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle successful checkout session completion.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    checkout_session = event["data"]["object"]
    firebase_uid = checkout_session["metadata"].get("firebase_uid")
    plan_id = checkout_session["metadata"].get("plan_id")
    customer_id = checkout_session["customer"]
    subscription_id = checkout_session["subscription"]

    if not firebase_uid or not plan_id:
        logger.error(
            "Missing metadata in checkout session",
            session_id=checkout_session["id"],
        )
        return

    logger.info(
        "Processing checkout completion",
        firebase_uid=firebase_uid,
        customer_id=customer_id,
        subscription_id=subscription_id,
    )

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        if result.scalar_one_or_none():
            logger.info(
                "Subscription already exists",
                subscription_id=subscription_id,
            )
            return

        subscription = Subscription(
            firebase_uid=firebase_uid,
            plan_id=plan_id,
            stripe_subscription_id=subscription_id,
            stripe_customer_id=customer_id,
            status="active",
            current_period_start=datetime.now(UTC),
            cancel_at_period_end=False,
        )
        session.add(subscription)

        if checkout_session.get("customer_details", {}).get("email"):
            user_result = await session.execute(
                select(User).where(User.firebase_uid == firebase_uid)
            )
            user = user_result.scalar_one_or_none()
            if user and not user.email:
                user.email = checkout_session["customer_details"]["email"]

        await session.commit()

    logger.info(
        "Created subscription from checkout",
        firebase_uid=firebase_uid,
        subscription_id=subscription_id,
    )


async def handle_subscription_created(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle subscription created event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    stripe_subscription = event["data"]["object"]
    await update_subscription_from_stripe(stripe_subscription, session_maker)


async def handle_subscription_updated(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle subscription updated event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    stripe_subscription = event["data"]["object"]
    await update_subscription_from_stripe(stripe_subscription, session_maker)


async def handle_subscription_deleted(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle subscription deleted/canceled event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    stripe_subscription = event["data"]["object"]
    subscription_id = stripe_subscription["id"]

    logger.info("Processing subscription deletion", subscription_id=subscription_id)

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.status = "canceled"
            subscription.canceled_at = datetime.now(UTC)
            await session.commit()

            logger.info(
                "Subscription canceled",
                firebase_uid=subscription.firebase_uid,
                subscription_id=subscription_id,
            )


async def handle_invoice_payment_succeeded(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle successful invoice payment.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    invoice = event["data"]["object"]
    subscription_id = invoice["subscription"]

    if not subscription_id:
        return

    logger.info(
        "Processing successful payment",
        subscription_id=subscription_id,
        invoice_id=invoice["id"],
    )

    try:
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        await update_subscription_from_stripe(stripe_subscription, session_maker)
    except stripe.StripeError as e:
        logger.error(
            "Failed to retrieve subscription",
            subscription_id=subscription_id,
            error=str(e),
        )


async def handle_invoice_payment_failed(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle failed invoice payment.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    invoice = event["data"]["object"]
    subscription_id = invoice["subscription"]

    if not subscription_id:
        return

    logger.info(
        "Processing failed payment",
        subscription_id=subscription_id,
        invoice_id=invoice["id"],
    )

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.status = "past_due"
            await session.commit()

            logger.info(
                "Subscription marked as past due",
                firebase_uid=subscription.firebase_uid,
                subscription_id=subscription_id,
            )


async def update_subscription_from_stripe(
    stripe_subscription: Any, session_maker: async_sessionmaker[Any]
) -> None:
    """Update subscription record from Stripe data.

    Args:
        stripe_subscription: Stripe subscription object
        session_maker: Database session maker
    """
    subscription_id = stripe_subscription["id"]

    logger.info(
        "Updating subscription from Stripe",
        subscription_id=subscription_id,
        status=stripe_subscription["status"],
    )

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(
                "Subscription not found for update",
                subscription_id=subscription_id,
            )
            return

        subscription.status = stripe_subscription["status"]
        subscription.cancel_at_period_end = stripe_subscription["cancel_at_period_end"]

        if stripe_subscription["current_period_start"]:
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription["current_period_start"], UTC
            )

        if stripe_subscription["current_period_end"]:
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription["current_period_end"], UTC
            )

        if stripe_subscription["canceled_at"]:
            subscription.canceled_at = datetime.fromtimestamp(
                stripe_subscription["canceled_at"], UTC
            )

        if stripe_subscription["trial_start"]:
            subscription.trial_start = datetime.fromtimestamp(
                stripe_subscription["trial_start"], UTC
            )

        if stripe_subscription["trial_end"]:
            subscription.trial_end = datetime.fromtimestamp(
                stripe_subscription["trial_end"], UTC
            )

        await session.commit()

        logger.info(
            "Subscription updated",
            firebase_uid=subscription.firebase_uid,
            subscription_id=subscription_id,
            status=subscription.status,
        )


async def handle_payment_method_attached(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle payment method attached event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    payment_method = event["data"]["object"]
    customer_id = payment_method["customer"]

    logger.info(
        "Payment method attached",
        customer_id=customer_id,
        payment_method_id=payment_method["id"],
        type=payment_method["type"],
    )

    async with session_maker() as session:
        result = await session.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            logger.info(
                "Updated payment method for subscription",
                firebase_uid=subscription.firebase_uid,
                customer_id=customer_id,
            )


async def handle_payment_method_detached(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle payment method detached event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    payment_method = event["data"]["object"]
    customer_id = payment_method["customer"]

    logger.info(
        "Payment method detached",
        customer_id=customer_id,
        payment_method_id=payment_method["id"],
    )


async def handle_customer_updated(
    event: dict[str, Any], session_maker: async_sessionmaker[Any]
) -> None:
    """Handle customer updated event.

    Args:
        event: Stripe webhook event
        session_maker: Database session maker
    """
    customer = event["data"]["object"]
    customer_id = customer["id"]

    logger.info(
        "Customer updated",
        customer_id=customer_id,
        default_payment_method=customer.get("invoice_settings", {}).get(
            "default_payment_method"
        ),
    )

    if customer.get("email"):
        async with session_maker() as session:
            result = await session.execute(
                select(Subscription).where(
                    Subscription.stripe_customer_id == customer_id
                )
            )
            subscription = result.scalar_one_or_none()

            if subscription:
                user_result = await session.execute(
                    select(User).where(User.firebase_uid == subscription.firebase_uid)
                )
                user = user_result.scalar_one_or_none()

                if user and user.email != customer["email"]:
                    user.email = customer["email"]
                    await session.commit()
                    logger.info(
                        "Updated user email from Stripe",
                        firebase_uid=subscription.firebase_uid,
                        email=customer["email"],
                    )
