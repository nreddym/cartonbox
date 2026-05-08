# Property-Based Tests for Authentication Module

## Overview

This directory contains property-based tests for the authentication and authorization module using the Hypothesis framework.

## Test: Property 19 - Role-based Authorization

**File**: `test_auth_properties.py`

**Property Statement**: For any action requiring specific role permissions, IF the user does not have the required role, THEN the system SHALL deny the action and return an authorization error.

**Validates**: Requirements 12.2, 12.3

### Test Coverage

The property test generates random combinations of:
- User roles (from: ADMIN, PRODUCTION_MANAGER, STORE_MANAGER, SUPERVISOR)
- Required roles for accessing a resource
- Edge cases: empty role lists, single role requirements

### Running the Tests

#### Prerequisites
1. Ensure Python 3.11+ is installed
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

#### Run All Property Tests
```bash
pytest tests/test_auth_properties.py -v
```

#### Run with Coverage
```bash
pytest tests/test_auth_properties.py -v --cov=auth --cov-report=html
```

#### Run Specific Test
```bash
pytest tests/test_auth_properties.py::test_property_19_role_based_authorization -v
```

### Test Configuration

- **Max Examples**: 100 iterations per property test
- **Framework**: Hypothesis 6.98.3+
- **Test Strategy**: Generates random role combinations and validates authorization logic

### Expected Behavior

1. **User with required role**: Access granted, returns user object
2. **User without required role**: Access denied, raises HTTPException with status 403
3. **User with no roles**: Always denied access
4. **Empty required roles**: Access denied (edge case)

### Interpreting Results

- **All tests pass**: Authorization logic correctly enforces role-based access control
- **Test failures**: Indicates a bug in the authorization implementation or test logic

### Troubleshooting

If tests fail, check:
1. The `require_roles` function in `auth/dependencies.py`
2. Role validation logic in controllers
3. User model roles field structure
4. Test data generation strategies

## Adding New Property Tests

When adding new property tests:
1. Follow the naming convention: `test_property_N_description`
2. Include the property statement in docstring
3. Reference the requirements being validated
4. Use appropriate Hypothesis strategies
5. Run minimum 100 examples
6. Tag with feature name in module docstring
