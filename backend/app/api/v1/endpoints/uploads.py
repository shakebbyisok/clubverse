"""
Image upload endpoint.
Currently stores to local filesystem, designed to be easily swapped to cloud storage.
"""
import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pathlib import Path

from app.db.base import get_db
from app.models.user import User
from app.core.dependencies import get_current_club_owner
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
UPLOAD_DIR = Path("uploads/images")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def get_upload_dir() -> Path:
    """Get and ensure upload directory exists."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    club_id: str = Query(..., description="Club ID for organizing uploads"),
    current_user: User = Depends(get_current_club_owner),
):
    """
    Upload an image and return its URL.
    
    Currently stores to local filesystem.
    Can be swapped to Supabase Storage / S3 / Cloudinary by changing this endpoint.
    """
    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{club_id}_{unique_id}{ext}"
    
    # Save to filesystem
    upload_dir = get_upload_dir()
    file_path = upload_dir / filename
    
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Return URL (relative path that frontend can use)
        # In production, this would be a CDN URL
        image_url = f"/uploads/images/{filename}"
        
        logger.info(f"Image uploaded: {filename} for club {club_id}")
        
        return {
            "url": image_url,
            "filename": filename,
            "size": len(content),
        }
        
    except Exception as e:
        logger.error(f"Failed to save image: {e}")
        raise HTTPException(status_code=500, detail="Failed to save image")

