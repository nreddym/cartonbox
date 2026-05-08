from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from database import get_db
from repositories.user_repository import UserRepository
from auth.dependencies import get_current_user, require_roles
from models.user import User


router = APIRouter(prefix="/api/users", tags=["Users"])


class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    roles: List[str]


class UpdateRolesRequest(BaseModel):
    roles: List[str]


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    roles: List[str]
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """
    Create a new user (Admin only)
    Validates: Requirements 12.1
    """
    # Validate roles are from allowed set
    allowed_roles = ["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER", "SUPERVISOR"]
    for role in request.roles:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}. Allowed roles: {', '.join(allowed_roles)}"
            )
    
    user_repo = UserRepository(db)
    
    try:
        user = user_repo.create(
            username=request.username,
            email=request.email,
            password=request.password,
            roles=request.roles
        )
        return UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            roles=user.roles,
            is_active=user.is_active
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all users
    """
    user_repo = UserRepository(db)
    users = user_repo.get_all(skip=skip, limit=limit)
    return [
        UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            roles=user.roles,
            is_active=user.is_active
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user details by ID
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_uuid)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        roles=user.roles,
        is_active=user.is_active
    )


@router.put("/{user_id}/roles", response_model=UserResponse)
def update_user_roles(
    user_id: str,
    request: UpdateRolesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """
    Update user roles (Admin only)
    Validates: Requirements 12.4
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Validate roles are from allowed set
    allowed_roles = ["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER", "SUPERVISOR"]
    for role in request.roles:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}. Allowed roles: {', '.join(allowed_roles)}"
            )
    
    user_repo = UserRepository(db)
    user = user_repo.update_roles(user_uuid, request.roles)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        roles=user.roles,
        is_active=user.is_active
    )
