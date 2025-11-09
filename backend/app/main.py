from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.base import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Clubverse API",
    description="Nightlife drink ordering platform API",
    version="1.0.0",
)

# CORS middleware - must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using wildcard
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"},
        headers={"Access-Control-Allow-Origin": "*"},
    )

@app.get("/")
def root():
    return {"message": "Clubverse API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

