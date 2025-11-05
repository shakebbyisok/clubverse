import stripe
from app.core.config import settings
from typing import Dict, Any

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(amount: int, currency: str = "usd", metadata: Dict[str, Any] = None) -> stripe.PaymentIntent:
    """Create a Stripe Payment Intent."""
    intent_data = {
        "amount": amount,
        "currency": currency,
        "payment_method_types": ["card"],
        "metadata": metadata or {},
    }
    
    # Enable Apple Pay and Google Pay if available
    intent_data["payment_method_types"].extend(["apple_pay", "google_pay"])
    
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

