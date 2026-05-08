"""User management service.

Provides centralized user creation and role management with role validation.

Validates: Requirements 12.1, 12.4
"""
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from models.user import User
from repositories.user_repository import UserRepository


# Allowed roles per Requirement 12.1
ROLE_ADMIN = "ADMIN"
ROLE_PRODUCTION_MANAGER = "PRODUCTION_MANAGER"
ROLE_STORE_MANAGER = "STORE_MANAGER"
ROLE_SUPERVISOR = "SUPERVISOR"
ROLE_AUDITOR = "AUDITOR"

ALLOWED_ROLES = {
    ROLE_ADMIN,
    ROLE_PRODUCTION_MANAGER,
    ROLE_STORE_MANAGER,
    ROLE_SUPERVISOR,
    ROLE_AUDITOR,
}


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    @staticmethod
    def validate_roles(roles: List[str]) -> None:
        if not roles:
            raise ValueError("At least one role is required")
        invalid = [r for r in roles if r not in ALLOWED_ROLES]
        if invalid:
            raise ValueError(
                f"Invalid role(s): {', '.join(invalid)}. "
                f"Allowed: {', '.join(sorted(ALLOWED_ROLES))}"
            )

    def create_user(
        self,
        username: str,
        email: str,
        password: str,
        roles: List[str],
    ) -> User:
        """Create a user after validating role assignment (Req 12.1)."""
        self.validate_roles(roles)
        return self.repo.create(
            username=username,
            email=email,
            password=password,
            roles=roles,
        )

    def update_user_roles(
        self,
        user_id: uuid.UUID,
        roles: List[str],
    ) -> Optional[User]:
        """Modify roles for an existing user (Req 12.4)."""
        self.validate_roles(roles)
        return self.repo.update_roles(user_id, roles)

    def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repo.get_all(skip=skip, limit=limit)

    def get_user(self, user_id: uuid.UUID) -> Optional[User]:
        return self.repo.get_by_id(user_id)
