from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from repositories.user_repository import UserRepository
from auth.jwt_handler import verify_password, create_access_token
from auth.dependencies import get_current_user
from models.user import User
from datetime import timedelta
from config import settings


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    roles: List[str]


class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    roles: List[str]
    is_active: bool


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(request.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Create JWT token with user information
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "roles": user.roles},
        expires_delta=timedelta(hours=settings.jwt_expiration_hours)
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        username=user.username,
        roles=user.roles
    )


@router.post("/logout")
def logout():
    """
    Logout endpoint (client-side token invalidation)
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user profile
    """
    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        roles=current_user.roles,
        is_active=current_user.is_active
    )
