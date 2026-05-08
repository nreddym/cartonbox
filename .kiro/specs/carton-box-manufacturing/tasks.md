# Implementation Plan

- [x] 1. Set up project structure and development environment





  - Create directory structure for backend (services, repositories, models, controllers) and frontend (components, services, pages)
  - Initialize Spring Boot or FastAPI project with required dependencies
  - Set up PostgreSQL database with Docker Compose
  - Configure JWT authentication framework
  - Initialize React project with TypeScript, React Router, and Axios
  - _Requirements: 15.1, 15.2, 15.3_

- [x] 2. Implement database schema and migrations





  - Create database migration scripts for all tables (User, PaperRoll, RawMaterialInventory, InventoryInward, JobCard, MaterialIssue, FinishedGoods, FinishedGoodsInventory, FinishedGoodsInward, FinishedGoodsOutward, InventoryAdjustment, AuditLog)
  - Add indexes on foreign keys, status fields, and date fields
  - Set up database connection pooling
  - _Requirements: 1.1, 2.1, 3.1, 16.1_

- [x] 3. Implement authentication and authorization module




  - [x] 3.1 Create User model and repository


    - Implement User entity with roles array
    - Create user repository with CRUD operations
    - Implement password hashing with bcrypt
    - _Requirements: 12.1_

  - [x] 3.2 Implement JWT authentication


    - Create login endpoint that validates credentials and returns JWT token
    - Implement JWT token generation and validation
    - Create middleware for token verification
    - _Requirements: 12.2_

  - [x] 3.3 Implement role-based authorization


    - Create authorization middleware that checks user roles
    - Implement permission validation for each action type
    - _Requirements: 12.2_

  - [x] 3.4 Write property test for role-based authorization



    - **Property 19: Role-based authorization**
    - **Validates: Requirements 12.2, 12.3**


- [x] 4. Implement raw material management module


  - [x] 4.1 Create PaperRoll model and repository

    - Implement PaperRoll entity with all required fields
    - Create repository with CRUD operations
    - Add unique constraint on materialCode
    - _Requirements: 1.1_

  - [x] 4.2 Create RawMaterialInventory model and repository


    - Implement inventory tracking with opening and current stock
    - Create repository with stock query methods
    - _Requirements: 1.2_

  - [x] 4.3 Implement paper roll API endpoints


    - POST /api/materials - Create paper roll type
    - GET /api/materials - List all paper roll types
    - GET /api/materials/{id} - Get paper roll details
    - PUT /api/materials/{id} - Update paper roll type
    - GET /api/materials/{id}/stock - Get stock level and history
    - _Requirements: 1.1, 1.2_

  - [x] 4.4 Write property test for entity creation completeness












    - **Property 2: Entity creation completeness**
    - **Validates: Requirements 1.1, 2.1, 3.1, 6.1, 8.1**

  - [x] 4.5 Write property test for inventory isolation
    - **Property 3: Inventory isolation**
    - **Validates: Requirements 1.4**

- [x] 5. Implement inventory inward module
  - [x] 5.1 Create InventoryInward model and repository
    - Implement InventoryInward entity with approval workflow fields
    - Create repository with status filtering
    - _Requirements: 2.1_

  - [x] 5.2 Implement inventory inward service
    - Create method to record raw material receipt
    - Implement approval workflow logic
    - Implement stock balance update on approval
    - _Requirements: 2.2, 2.3_

  - [x] 5.3 Implement inventory inward API endpoints
    - POST /api/inventory/inward - Create inward request
    - GET /api/inventory/inward - List inward requests with filters
    - GET /api/inventory/inward/{id} - Get inward request details
    - POST /api/inventory/inward/{id}/approve - Approve inward request
    - POST /api/inventory/inward/{id}/reject - Reject inward request
    - _Requirements: 2.1, 2.2_

  - [x] 5.4 Write property test for approval workflow enforcement
    - **Property 4: Approval workflow enforcement**
    - **Validates: Requirements 2.2, 4.2, 7.3, 8.2, 13.4**

  - [x] 5.5 Write property test for inventory balance consistency
    - **Property 1: Inventory balance consistency**
    - **Validates: Requirements 2.3, 4.3, 7.2, 8.3, 9.3**

- [x] 6. Implement job card management module
  - [x] 6.1 Create JobCard model and repository
    - Implement JobCard entity with all production fields
    - Create repository with status filtering
    - Add unique constraint on jobCardNumber
    - _Requirements: 3.1_

  - [x] 6.2 Implement material requirement calculation service
    - Create method to calculate paper area from box dimensions
    - Implement formula: area = 2 × (L×W + W×H + H×L) × ply_count × quantity
    - Convert units appropriately (mm to sq.m)
    - _Requirements: 3.2, 3.3_

  - [x] 6.3 Write property test for material requirement calculation
    - **Property 5: Material requirement calculation accuracy**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 6.4 Implement job card approval with stock validation
    - Create method to validate sufficient raw material stock
    - Implement approval logic that checks stock availability
    - Return error if stock is insufficient
    - _Requirements: 3.4, 3.5_

  - [x] 6.5 Write property test for stock availability validation
    - **Property 6: Stock availability validation**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 6.6 Implement job card API endpoints
    - POST /api/jobcards - Create job card
    - GET /api/jobcards - List job cards with status filters
    - GET /api/jobcards/{id} - Get job card details
    - PUT /api/jobcards/{id} - Update job card
    - POST /api/jobcards/{id}/calculate-materials - Calculate material requirements
    - POST /api/jobcards/{id}/approve - Approve job card
    - POST /api/jobcards/{id}/start - Start production
    - POST /api/jobcards/{id}/complete - Complete production
    - _Requirements: 3.1, 3.2, 3.4, 5.1, 5.2, 5.3, 5.4_

  - [x] 6.7 Write property test for job card state machine
    - **Property 8: Job card state machine correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement material issue module
  - [x] 8.1 Create MaterialIssue model and repository
    - Implement MaterialIssue entity with approval workflow
    - Create repository with job card filtering
    - _Requirements: 4.1_

  - [x] 8.2 Implement material issue service
    - Create method to link material issue to approved job card
    - Implement approval workflow logic
    - Implement stock deduction on approval
    - Support partial issues against job card
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.3 Write property test for partial material issue support
    - **Property 7: Partial material issue support**
    - **Validates: Requirements 4.4**

  - [x] 8.4 Implement material issue API endpoints
    - POST /api/material-issues - Create material issue request
    - GET /api/material-issues - List material issues
    - GET /api/material-issues/{id} - Get issue details
    - POST /api/material-issues/{id}/approve - Approve material issue
    - POST /api/material-issues/{id}/reject - Reject material issue
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Implement production tracking and finished goods module
  - [x] 9.1 Create FinishedGoods and FinishedGoodsInventory models
    - Implement FinishedGoods master entity
    - Implement FinishedGoodsInventory tracking entity
    - Create repositories for both
    - _Requirements: 7.1_

  - [x] 9.2 Implement production completion service
    - Create method to record actual production quantity
    - Support optional wastage entry
    - Calculate net finished goods (produced - rejected)
    - Validate job card is in "In Production" status
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.3 Write property test for net finished goods calculation
    - **Property 9: Net finished goods calculation**
    - **Validates: Requirements 6.3**

  - [x] 9.4 Write property test for production completion precondition
    - **Property 10: Production completion precondition**
    - **Validates: Requirements 6.4**

  - [x] 9.5 Implement automatic finished goods inward
    - Create method that triggers on job card completion
    - Automatically create FinishedGoodsInward transaction
    - Update finished goods stock with net quantity
    - Require supervisor confirmation
    - Link to originating job card
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.6 Write property test for automatic finished goods creation
    - **Property 11: Automatic finished goods creation**
    - **Validates: Requirements 7.1**

  - [x] 9.7 Write property test for finished goods traceability
    - **Property 12: Finished goods traceability**
    - **Validates: Requirements 7.4**

- [x] 10. Implement finished goods outward module
  - [x] 10.1 Create FinishedGoodsOutward model and repository
    - Implement FinishedGoodsOutward entity with approval workflow
    - Create repository with filtering
    - _Requirements: 8.1_

  - [x] 10.2 Implement finished goods outward service
    - Create method to initiate outward transaction
    - Implement approval workflow
    - Validate stock sufficiency before approval
    - Update stock on approval
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 10.3 Write property test for stock sufficiency validation
    - **Property 13: Stock sufficiency validation**
    - **Validates: Requirements 8.4**

  - [x] 10.4 Implement finished goods outward API endpoints
    - POST /api/finished-goods/outward - Create outward request
    - GET /api/finished-goods/outward - List outward requests
    - POST /api/finished-goods/outward/{id}/approve - Approve outward
    - POST /api/finished-goods/outward/{id}/reject - Reject outward
    - _Requirements: 8.1, 8.2_

- [x] 11. Implement inventory adjustment module
  - [x] 11.1 Create InventoryAdjustment model and repository
    - Implement InventoryAdjustment entity with reason field
    - Create repository with filtering
    - _Requirements: 9.1_

  - [x] 11.2 Implement inventory adjustment service
    - Validate mandatory reason field (minimum 10 characters)
    - Implement approval workflow with different approver constraint
    - Support both positive and negative adjustments
    - Update stock on approval
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 11.3 Write property test for adjustment reason mandatory
    - **Property 14: Adjustment reason mandatory**
    - **Validates: Requirements 9.1**

  - [x] 11.4 Write property test for adjustment approver independence
    - **Property 15: Adjustment approver independence**
    - **Validates: Requirements 9.2**

  - [x] 11.5 Write property test for bidirectional adjustment support
    - **Property 16: Bidirectional adjustment support**
    - **Validates: Requirements 9.4**

  - [x] 11.6 Implement inventory adjustment API endpoints
    - POST /api/inventory/adjustments - Create adjustment request
    - GET /api/inventory/adjustments - List adjustments
    - POST /api/inventory/adjustments/{id}/approve - Approve adjustment
    - POST /api/inventory/adjustments/{id}/reject - Reject adjustment
    - _Requirements: 9.1, 9.2_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement audit logging module
  - [x] 13.1 Create AuditLog model and repository
    - Implement AuditLog entity with all required fields
    - Create repository with query methods
    - Ensure audit logs are immutable (no update/delete methods)
    - _Requirements: 16.1, 16.2_

  - [x] 13.2 Implement audit logging service
    - Create method to automatically log all inventory transactions
    - Capture transaction type, entity ID, action, user, timestamp, before/after data
    - Integrate with all transaction services
    - _Requirements: 2.4, 4.5, 8.5, 9.5, 16.1_

  - [x] 13.3 Write property test for audit log immutability
    - **Property 20: Audit log immutability**
    - **Validates: Requirements 16.2**

  - [x] 13.4 Write property test for audit trail completeness
    - **Property 21: Audit trail completeness**
    - **Validates: Requirements 2.4, 4.5, 8.5, 9.5, 16.1**

  - [x] 13.5 Implement audit log API endpoints
    - GET /api/audit-logs - Query audit logs with filters
    - GET /api/audit-logs/transaction/{id} - Get audit trail for transaction
    - _Requirements: 16.3_

- [x] 14. Implement reporting module
  - [x] 14.1 Implement raw material stock report service
    - Create method to retrieve all paper rolls with current stock
    - Implement low stock threshold detection
    - Support filtering by paper type, GSM, supplier
    - Include stock movement history
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Write property test for low stock threshold detection
    - **Property 17: Low stock threshold detection**
    - **Validates: Requirements 10.2**

  - [x] 14.3 Implement material consumption report service
    - Create method to compare planned vs actual material consumption
    - Calculate wastage percentage for each job card
    - Support filtering by date range, job card, box type
    - Aggregate wastage data across job cards
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 14.4 Write property test for wastage percentage calculation
    - **Property 18: Wastage percentage calculation**
    - **Validates: Requirements 11.2**

  - [x] 14.5 Implement finished goods stock report service
    - Create method to retrieve all finished goods with stock
    - Show quantity produced, dispatched, and current balance
    - Support filtering by box type, size, date range
    - Display source job card for traceability
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 14.6 Implement reporting API endpoints
    - GET /api/reports/raw-material-stock - Raw material stock report
    - GET /api/reports/finished-goods-stock - Finished goods stock report
    - GET /api/reports/material-consumption - Material consumption analysis
    - GET /api/reports/wastage-analysis - Wastage trends
    - GET /api/reports/low-stock-alerts - Items below threshold
    - _Requirements: 10.1, 11.1, 14.1_

- [x] 15. Implement user and role management
  - [x] 15.1 Implement user management service
    - Create method to create users with role assignment
    - Implement role modification for existing users
    - Validate roles are from allowed set (Admin, Production Manager, Store Manager, Supervisor)
    - _Requirements: 12.1, 12.4_

  - [x] 15.2 Implement approval workflow configuration
    - Create configuration for which roles can approve each transaction type
    - Store workflow configuration in database or configuration file
    - _Requirements: 13.1, 13.2_

  - [x] 15.3 Implement user management API endpoints
    - POST /api/users - Create user (Admin only)
    - GET /api/users - List users
    - PUT /api/users/{id}/roles - Update user roles (Admin only)
    - GET /api/users/{id} - Get user details
    - _Requirements: 12.1, 12.4_

- [x] 16. Implement frontend - Authentication and layout
  - [x] 16.1 Create authentication pages
    - Implement login page with form validation
    - Create authentication service with JWT token management
    - Implement protected route wrapper
    - Store JWT token in localStorage
    - _Requirements: 12.2_

  - [x] 16.2 Create main layout and navigation
    - Implement navigation menu with role-based visibility
    - Create header with user profile and logout
    - Implement responsive layout
    - _Requirements: 12.2_

- [x] 17. Implement frontend - Raw material management
  - [x] 17.1 Create paper roll management pages
    - Implement paper roll list page with search and filters
    - Create paper roll creation form
    - Implement paper roll edit form
    - Create stock level display component
    - _Requirements: 1.1, 1.2_

  - [x] 17.2 Create inventory inward pages
    - Implement inward request list with status filters
    - Create inward request form
    - Implement approval/rejection interface
    - _Requirements: 2.1, 2.2_

- [x] 18. Implement frontend - Job card management
  - [x] 18.1 Create job card pages
    - Implement job card list with status filters
    - Create job card creation form with material calculation
    - Display calculated material requirements
    - Implement job card approval interface
    - Create production tracking dashboard
    - _Requirements: 3.1, 3.2, 3.4, 5.1, 5.5_

  - [x] 18.2 Create material issue pages
    - Implement material issue request form
    - Create material issue list with filters
    - Implement approval interface
    - _Requirements: 4.1, 4.2_

  - [x] 18.3 Create production completion form
    - Implement form to record actual quantity and wastage
    - Display net finished goods calculation
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 19. Implement frontend - Finished goods management
  - [x] 19.1 Create finished goods pages
    - Implement finished goods list with stock levels
    - Create finished goods outward request form
    - Implement outward approval interface
    - _Requirements: 8.1, 8.2, 14.1_

  - [x] 19.2 Create inventory adjustment pages
    - Implement adjustment request form with reason field
    - Create adjustment list with filters
    - Implement approval interface
    - _Requirements: 9.1, 9.2_

- [x] 20. Implement frontend - Reporting and audit
  - [x] 20.1 Create report pages
    - Implement raw material stock report with low stock highlights
    - Create finished goods stock report
    - Implement material consumption report with wastage analysis
    - Add filtering and export capabilities
    - _Requirements: 10.1, 10.2, 11.1, 11.2, 14.1_

  - [x] 20.2 Create audit log viewer
    - Implement audit log query interface with filters
    - Display transaction history with before/after values
    - _Requirements: 16.3_

- [x] 21. Implement frontend - User management
  - [x] 21.1 Create user management pages (Admin only)
    - Implement user list page
    - Create user creation form with role selection
    - Implement role modification interface
    - _Requirements: 12.1, 12.4_

- [x] 22. Final checkpoint - Integration testing and deployment
  - Run all unit tests and property-based tests
  - Perform end-to-end integration testing of complete workflows
  - Test approval workflows across all transaction types
  - Verify audit logging for all operations
  - Test role-based access control
  - Ensure all tests pass, ask the user if questions arise.
