from fastapi import APIRouter
from app.api.v1.endpoints import auth, clubs, orders, bartender, payments, bartenders, brands, drinks, drink_lists, stripe_connect

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(clubs.router, prefix="/clubs", tags=["clubs"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(bartender.router, prefix="/bartender", tags=["bartender"])
api_router.include_router(bartenders.router, prefix="/bartenders", tags=["bartenders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(drinks.router, prefix="/drinks", tags=["drinks"])
api_router.include_router(drink_lists.router, prefix="/drink-lists", tags=["drink-lists"])
api_router.include_router(stripe_connect.router, prefix="/stripe-connect", tags=["stripe-connect"])

