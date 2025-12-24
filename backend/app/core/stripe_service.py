import stripe
from app.core.config import settings
from typing import Dict, Any, Optional, List

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    amount: int,
    currency: str = "usd",
    order_id: str = None,
    club_name: str = None,
    items_description: str = None,
    success_url: str = None,
    cancel_url: str = None,
    metadata: Dict[str, Any] = None,
    stripe_account_id: Optional[str] = None
) -> stripe.checkout.Session:
    """
    Create a Stripe Checkout Session for payment.
    Redirects user to Stripe's hosted payment page.
    """
    session_data = {
        "mode": "payment",
        "payment_method_types": ["card"],  # Checkout handles Apple/Google Pay automatically
        "line_items": [{
            "price_data": {
                "currency": currency,
                "unit_amount": amount,
                "product_data": {
                    "name": f"Order at {club_name}" if club_name else "Order",
                    "description": items_description or "Drinks order",
                },
            },
            "quantity": 1,
        }],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": metadata or {},
    }
    
    if stripe_account_id:
        # Direct charge to connected account
        session = stripe.checkout.Session.create(
            **session_data,
            stripe_account=stripe_account_id
        )
    else:
        session = stripe.checkout.Session.create(**session_data)
    
    return session


def create_payment_intent(
    amount: int,
    currency: str = "usd",
    metadata: Dict[str, Any] = None,
    stripe_account_id: Optional[str] = None
) -> stripe.PaymentIntent:
    """
    Create a Stripe Payment Intent with optional Connect passthrough.
    
    Uses automatic_payment_methods to enable all payment methods configured
    in Stripe Dashboard (Card, Apple Pay, Google Pay, Link, etc.)
    """
    intent_data = {
        "amount": amount,
        "currency": currency,
        "automatic_payment_methods": {
            "enabled": True,  # Automatically enables Card, Apple Pay, Google Pay, Link, etc.
        },
        "metadata": metadata or {},
    }
    
    # If Connect account provided, route payment to that account using direct charges
    if stripe_account_id:
        # Use direct charges - payment goes directly to connected account
        payment_intent = stripe.PaymentIntent.create(
            **intent_data,
            stripe_account=stripe_account_id
        )
    else:
        payment_intent = stripe.PaymentIntent.create(**intent_data)
    
    return payment_intent


def confirm_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    """Confirm a payment intent (called after successful payment)."""
    return stripe.PaymentIntent.retrieve(payment_intent_id)


def handle_webhook(payload: str, signature: str) -> Dict[str, Any]:
    """Handle Stripe webhook events."""
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError as e:
        raise ValueError(f"Invalid payload: {e}")
    except stripe.error.SignatureVerificationError as e:
        raise ValueError(f"Invalid signature: {e}")

