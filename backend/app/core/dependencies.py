from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.db.base import get_db
from app.models.user import User, UserRole
from app.core.security import decode_access_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


async def get_current_club_owner(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is a club owner."""
    if current_user.role != UserRole.CLUB_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Club owner access required.",
        )
    return current_user


async def get_current_bartender(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Ensure current user is a bartender."""
    from app.models.bartender import Bartender
    
    if current_user.role != UserRole.BARTENDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Bartender access required.",
        )
    
    # Verify bartender profile exists
    bartender = db.query(Bartender).filter(Bartender.user_id == current_user.id).first()
    if not bartender or not bartender.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bartender profile not found or inactive.",
        )
    
    return current_user

