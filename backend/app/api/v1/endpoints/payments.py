from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.order import Order, OrderStatus
from app.core.stripe_service import handle_webhook
from app.core.qr_service import generate_qr_code
from app.core.config import settings
import stripe

router = APIRouter()


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )
    
    try:
        event = handle_webhook(payload, sig_header)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    # Handle payment_intent.succeeded
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]
        
        # Find order by payment_intent_id
        order = db.query(Order).filter(
            Order.payment_intent_id == payment_intent_id
        ).first()
        
        if order:
            # Generate QR code
            qr_code = generate_qr_code()
            
            # Update order status to paid and set QR code
            order.status = OrderStatus.PAID
            order.qr_code = qr_code
            
            db.commit()
    
    # Handle payment_intent.payment_failed
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]
        
        # Find order and mark as cancelled
        order = db.query(Order).filter(
            Order.payment_intent_id == payment_intent_id
        ).first()
        
        if order:
            order.status = OrderStatus.CANCELLED
            db.commit()
    
    return {"status": "success"}

