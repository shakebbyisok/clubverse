from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.user import User
from app.core.dependencies import get_current_club_owner
from app.core.stripe_connect_service import (
    create_connect_account,
    get_account_link,
    get_account_status,
    update_account_status
)
from app.models.order import Order, OrderStatus
from app.core.qr_service import generate_qr_code
from pydantic import BaseModel
from typing import Optional
import stripe
from app.core.config import settings

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY


class ConnectOnboardRequest(BaseModel):
    return_url: str
    refresh_url: str


class ConnectStatusResponse(BaseModel):
    stripe_account_id: Optional[str] = None
    stripe_account_status: Optional[str] = None
    stripe_charges_enabled: bool = False
    stripe_payouts_enabled: bool = False
    details_submitted: bool = False
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
    """Get Stripe Connect account status. Fetches fresh data from Stripe."""
    if not current_user.stripe_account_id:
        return ConnectStatusResponse()
    
    # Fetch fresh status from Stripe
    try:
        status_data = update_account_status(current_user.stripe_account_id)
        
        # Update local database with fresh status
        current_user.stripe_account_status = status_data["stripe_account_status"]
        current_user.stripe_charges_enabled = status_data["stripe_charges_enabled"]
        current_user.stripe_payouts_enabled = status_data["stripe_payouts_enabled"]
        db.commit()
        
        return ConnectStatusResponse(
            stripe_account_id=current_user.stripe_account_id,
            stripe_account_status=status_data["stripe_account_status"],
            stripe_charges_enabled=status_data["stripe_charges_enabled"],
            stripe_payouts_enabled=status_data["stripe_payouts_enabled"],
            details_submitted=status_data["details_submitted"],
        )
    except stripe.error.InvalidRequestError:
        # Account doesn't exist in Stripe (deleted or invalid)
        current_user.stripe_account_status = "invalid"
        current_user.stripe_charges_enabled = False
        current_user.stripe_payouts_enabled = False
        db.commit()
        
        return ConnectStatusResponse(
            stripe_account_id=current_user.stripe_account_id,
            stripe_account_status="invalid",
            stripe_charges_enabled=False,
            stripe_payouts_enabled=False,
        )
    except Exception as e:
        # Other errors - return cached status
        return ConnectStatusResponse(
            stripe_account_id=current_user.stripe_account_id,
            stripe_account_status=current_user.stripe_account_status,
            stripe_charges_enabled=current_user.stripe_charges_enabled or False,
            stripe_payouts_enabled=current_user.stripe_payouts_enabled or False,
        )


@router.post("/refresh", response_model=ConnectStatusResponse)
def refresh_connect_status(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Force refresh Stripe Connect account status. Same as GET /status but explicit."""
    return get_connect_status(current_user, db)


@router.post("/disconnect")
def disconnect_stripe_account(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Disconnect Stripe account from user. 
    This removes the local reference but does NOT delete the Stripe account.
    User can reconnect with a different account.
    """
    if not current_user.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account connected",
        )
    
    # Clear local Stripe data
    current_user.stripe_account_id = None
    current_user.stripe_account_status = None
    current_user.stripe_charges_enabled = False
    current_user.stripe_payouts_enabled = False
    db.commit()
    
    return {"status": "disconnected"}


@router.post("/webhook")
async def handle_connect_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe Connect webhook events.
    
    Important: This endpoint uses STRIPE_CONNECT_WEBHOOK_SECRET, 
    which is different from the regular payment webhook secret.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )
    
    # Use Connect-specific webhook secret
    webhook_secret = settings.STRIPE_CONNECT_WEBHOOK_SECRET or settings.STRIPE_WEBHOOK_SECRET
    
    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured",
        )
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
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
    
    # Handle checkout.session.completed (payment success for Connect direct charges)
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        
        # Find order by session ID
        order = db.query(Order).filter(Order.payment_intent_id == session_id).first()
        
        if order:
            # Generate QR code
            qr_code = generate_qr_code()
            order.status = OrderStatus.PAID
            order.qr_code = qr_code
            db.commit()
            print(f"[Connect Webhook] Order {order.id} marked as PAID with QR: {qr_code}")
    
    # Handle checkout.session.expired
    elif event["type"] == "checkout.session.expired":
        session = event["data"]["object"]
        session_id = session["id"]
        
        order = db.query(Order).filter(Order.payment_intent_id == session_id).first()
        if order:
            order.status = OrderStatus.CANCELLED
            db.commit()
            print(f"[Connect Webhook] Order {order.id} cancelled (session expired)")
    
    # Handle account.updated event
    elif event["type"] == "account.updated":
        account = event["data"]["object"]
        account_id = account["id"]
        
        # Find user by stripe_account_id
        user = db.query(User).filter(User.stripe_account_id == account_id).first()
        if user:
            # Determine status based on account state
            charges_enabled = account.get("charges_enabled", False)
            payouts_enabled = account.get("payouts_enabled", False)
            details_submitted = account.get("details_submitted", False)
            
            if charges_enabled:
                new_status = "active"
            elif details_submitted:
                new_status = "pending_verification"
            else:
                new_status = "pending"
            
            user.stripe_account_status = new_status
            user.stripe_charges_enabled = charges_enabled
            user.stripe_payouts_enabled = payouts_enabled
            db.commit()
    
    # Handle account.application.deauthorized (user disconnected)
    elif event["type"] == "account.application.deauthorized":
        account = event["data"]["object"]
        account_id = account.get("id")
        
        if account_id:
            user = db.query(User).filter(User.stripe_account_id == account_id).first()
            if user:
                user.stripe_account_status = "disconnected"
                user.stripe_charges_enabled = False
                user.stripe_payouts_enabled = False
                db.commit()
    
    return {"status": "success"}
