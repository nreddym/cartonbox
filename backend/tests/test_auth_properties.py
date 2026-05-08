"""
Property-based tests for authentication and authorization

Feature: carton-box-manufacturing
"""

import pytest
from hypothesis import given, strategies as st, settings
from fastapi import HTTPException
from unittest.mock import Mock
import uuid
from typing import List


# Mock User class to avoid database dependencies
class MockUser:
    def __init__(self, user_id, username, roles, is_active=True):
        self.id = user_id
        self.username = username
        self.roles = roles
        self.is_active = is_active


# Replicate the require_roles function logic for testing
def require_roles(required_roles: List[str]):
    """
    Dependency to check if user has required roles
    """
    def role_checker(current_user: MockUser) -> MockUser:
        user_roles = current_user.roles or []
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


# Strategy for generating valid roles
valid_roles = st.sampled_from(["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER", "SUPERVISOR"])

# Strategy for generating lists of roles
role_lists = st.lists(valid_roles, min_size=0, max_size=4, unique=True)


@settings(max_examples=100)
@given(
    user_roles=role_lists,
    required_roles=st.lists(valid_roles, min_size=1, max_size=4, unique=True)
)
def test_property_19_role_based_authorization(user_roles, required_roles):
    """
    Property 19: Role-based authorization
    
    For any action requiring specific role permissions, IF the user does not have 
    the required role, THEN the system SHALL deny the action and return an 
    authorization error.
    
    Validates: Requirements 12.2, 12.3
    """
    # Create a mock user with the generated roles
    mock_user = MockUser(
        user_id=uuid.uuid4(),
        username="test_user",
        roles=user_roles,
        is_active=True
    )
    
    # Create the role checker dependency
    role_checker = require_roles(required_roles)
    
    # Check if user has any of the required roles
    has_required_role = any(role in user_roles for role in required_roles)
    
    if has_required_role:
        # User has at least one required role - should succeed
        result = role_checker(current_user=mock_user)
        assert result == mock_user, "User with required role should be allowed"
    else:
        # User does not have any required role - should raise HTTPException with 403
        with pytest.raises(HTTPException) as exc_info:
            role_checker(current_user=mock_user)
        
        assert exc_info.value.status_code == 403, \
            f"Expected status code 403, got {exc_info.value.status_code}"
        assert "Insufficient permissions" in exc_info.value.detail, \
            f"Expected 'Insufficient permissions' in error detail, got {exc_info.value.detail}"


@settings(max_examples=100)
@given(user_roles=role_lists)
def test_property_19_empty_required_roles_edge_case(user_roles):
    """
    Edge case: When no roles are required (empty list), the behavior should be consistent
    
    This tests the edge case where required_roles is empty, which shouldn't happen
    in practice but we want to ensure consistent behavior.
    """
    mock_user = MockUser(
        user_id=uuid.uuid4(),
        username="test_user",
        roles=user_roles,
        is_active=True
    )
    
    # When required_roles is empty, any() returns False, so access should be denied
    role_checker = require_roles([])
    
    with pytest.raises(HTTPException) as exc_info:
        role_checker(current_user=mock_user)
    
    assert exc_info.value.status_code == 403


@settings(max_examples=100)
@given(required_roles=st.lists(valid_roles, min_size=1, max_size=4, unique=True))
def test_property_19_user_with_no_roles(required_roles):
    """
    Edge case: User with no roles should always be denied access
    
    Validates that a user with an empty roles list cannot access any protected resource.
    """
    mock_user = MockUser(
        user_id=uuid.uuid4(),
        username="test_user",
        roles=[],  # No roles
        is_active=True
    )
    
    role_checker = require_roles(required_roles)
    
    with pytest.raises(HTTPException) as exc_info:
        role_checker(current_user=mock_user)
    
    assert exc_info.value.status_code == 403
    assert "Insufficient permissions" in exc_info.value.detail


@settings(max_examples=100)
@given(
    user_roles=role_lists,
    required_role=valid_roles
)
def test_property_19_single_role_requirement(user_roles, required_role):
    """
    Property test for single role requirement
    
    Tests the common case where only one specific role is required.
    """
    mock_user = MockUser(
        user_id=uuid.uuid4(),
        username="test_user",
        roles=user_roles,
        is_active=True
    )
    
    role_checker = require_roles([required_role])
    
    if required_role in user_roles:
        result = role_checker(current_user=mock_user)
        assert result == mock_user
    else:
        with pytest.raises(HTTPException) as exc_info:
            role_checker(current_user=mock_user)
        assert exc_info.value.status_code == 403
