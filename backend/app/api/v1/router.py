from fastapi import APIRouter
from app.api.v1.endpoints import auth, clubs, orders, bartender, payments, bartenders

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(clubs.router, prefix="/clubs", tags=["clubs"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(bartender.router, prefix="/bartender", tags=["bartender"])
api_router.include_router(bartenders.router, prefix="/bartenders", tags=["bartenders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])

