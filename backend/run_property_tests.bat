@echo off
REM Script to run property-based tests for authentication module

echo Running property-based tests for authentication and authorization...
echo.
echo Property 19: Role-based authorization
echo Validates: Requirements 12.2, 12.3
echo.

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Run the property tests with verbose output
pytest tests/test_auth_properties.py -v --tb=short

echo.
echo Property tests completed.
