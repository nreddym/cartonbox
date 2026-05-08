#!/bin/bash
# Script to run property-based tests for authentication module

echo "Running property-based tests for authentication and authorization..."
echo ""
echo "Property 19: Role-based authorization"
echo "Validates: Requirements 12.2, 12.3"
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the property tests with verbose output
pytest tests/test_auth_properties.py -v --tb=short

echo ""
echo "Property tests completed."
