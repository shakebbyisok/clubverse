from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.user import User
from app.core.dependencies import get_current_club_owner
from app.core.stripe_connect_service import (
    create_connect_account,
    get_account_link,
    get_account,
    update_account_status
)
from pydantic import BaseModel
from typing import Optional
import stripe
from app.core.config import settings

router = APIRouter()


class ConnectOnboardRequest(BaseModel):
    return_url: str
    refresh_url: str


class ConnectStatusResponse(BaseModel):
    stripe_account_id: Optional[str] = None
    stripe_account_status: Optional[str] = None
    stripe_charges_enabled: bool = False
    stripe_payouts_enabled: bool = False
    onboarding_url: Optional[str] = None


@router.post("/onboard", response_model=dict)
def start_connect_onboarding(
    request: ConnectOnboardRequest,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Start Stripe Connect onboarding for club owner."""
    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for Stripe Connect",
        )
    
    # If account already exists, return existing link
    if current_user.stripe_account_id:
        account_link = get_account_link(
            current_user.stripe_account_id,
            request.return_url,
            request.refresh_url
        )
        return {"onboarding_url": account_link.url}
    
    # Create new Connect account
    account, account_link = create_connect_account(
        current_user.email,
        request.return_url,
        request.refresh_url
    )
    
    # Save account ID to user
    current_user.stripe_account_id = account.id
    current_user.stripe_account_status = "pending"
    db.commit()
    
    return {"onboarding_url": account_link.url}


@router.get("/status", response_model=ConnectStatusResponse)
def get_connect_status(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get Stripe Connect account status."""
    if not current_user.stripe_account_id:
        return ConnectStatusResponse()
    
    # Update status from Stripe
    try:
        status_data = update_account_status(current_user.stripe_account_id)
        current_user.stripe_account_status = status_data["stripe_account_status"]
        current_user.stripe_charges_enabled = status_data["stripe_charges_enabled"]
        current_user.stripe_payouts_enabled = status_data["stripe_payouts_enabled"]
        db.commit()
    except Exception as e:
        # If account doesn't exist or error, mark as restricted
        current_user.stripe_account_status = "restricted"
        db.commit()
    
    return ConnectStatusResponse(
        stripe_account_id=current_user.stripe_account_id,
        stripe_account_status=current_user.stripe_account_status,
        stripe_charges_enabled=current_user.stripe_charges_enabled,
        stripe_payouts_enabled=current_user.stripe_payouts_enabled,
    )


@router.post("/webhook")
async def handle_connect_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe Connect webhook events."""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload: {e}",
        )
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid signature: {e}",
        )
    
    # Handle account.updated event
    if event["type"] == "account.updated":
        account = event["data"]["object"]
        account_id = account["id"]
        
        # Find user by stripe_account_id
        user = db.query(User).filter(User.stripe_account_id == account_id).first()
        if user:
            user.stripe_account_status = (
                "active" if account.get("charges_enabled") and account.get("payouts_enabled") else "pending"
            )
            user.stripe_charges_enabled = account.get("charges_enabled", False)
            user.stripe_payouts_enabled = account.get("payouts_enabled", False)
            db.commit()
    
    return {"status": "success"}

