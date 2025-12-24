import stripe
from app.core.config import settings
from typing import Dict, Any

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_connect_account(email: str, return_url: str, refresh_url: str):
    """Create a Stripe Connect Express account and return account and account link."""
    account = stripe.Account.create(
        type="express",
        country="US",  # Default, can be made configurable
        email=email,
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
    )
    
    # Create account link for onboarding
    account_link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=refresh_url,
        return_url=return_url,
        type="account_onboarding",
    )
    
    return account, account_link


def get_account_link(account_id: str, return_url: str, refresh_url: str) -> stripe.AccountLink:
    """Get account link for existing Connect account."""
    account_link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=refresh_url,
        return_url=return_url,
        type="account_onboarding",
    )
    return account_link


def get_account(account_id: str) -> stripe.Account:
    """Retrieve a Connect account."""
    return stripe.Account.retrieve(account_id)


def get_account_status(account: stripe.Account) -> str:
    """
    Determine account status based on Stripe account state.
    
    Status values:
    - "active": charges_enabled is True, can accept payments
    - "pending_verification": details submitted, waiting for Stripe verification
    - "pending": still needs to complete onboarding
    - "restricted": account has issues/restrictions
    """
    if account.charges_enabled:
        return "active"
    elif account.details_submitted:
        return "pending_verification"
    elif account.requirements and account.requirements.get("disabled_reason"):
        return "restricted"
    else:
        return "pending"


def update_account_status(user_stripe_account_id: str) -> Dict[str, Any]:
    """Fetch account from Stripe and return status data."""
    account = get_account(user_stripe_account_id)
    
    return {
        "stripe_account_id": account.id,
        "stripe_account_status": get_account_status(account),
        "stripe_charges_enabled": account.charges_enabled or False,
        "stripe_payouts_enabled": account.payouts_enabled or False,
        "details_submitted": account.details_submitted or False,
    }
