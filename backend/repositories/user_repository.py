from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from models.user import User
from auth.jwt_handler import get_password_hash
import uuid


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, username: str, email: str, password: str, roles: List[str]) -> User:
        """Create a new user with hashed password"""
        password_hash = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            roles=roles,
            is_active=True
        )
        self.db.add(user)
        try:
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise ValueError(f"User with username '{username}' already exists")

    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        return self.db.query(User).offset(skip).limit(limit).all()

    def update_roles(self, user_id: uuid.UUID, roles: List[str]) -> Optional[User]:
        """Update user roles"""
        user = self.get_by_id(user_id)
        if user:
            user.roles = roles
            self.db.commit()
            self.db.refresh(user)
        return user

    def update_active_status(self, user_id: uuid.UUID, is_active: bool) -> Optional[User]:
        """Update user active status"""
        user = self.get_by_id(user_id)
        if user:
            user.is_active = is_active
            self.db.commit()
            self.db.refresh(user)
        return user

    def delete(self, user_id: uuid.UUID) -> bool:
        """Delete user by ID"""
        user = self.get_by_id(user_id)
        if user:
            self.db.delete(user)
            self.db.commit()
            return True
        return False
