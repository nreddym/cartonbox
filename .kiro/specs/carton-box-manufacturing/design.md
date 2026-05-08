# Design Document

## Overview

The Carton Box Manufacturing Management System is a web-based application that manages the complete production lifecycle from raw material procurement to finished goods dispatch. The system enforces approval-based workflows for all inventory movements, automatically calculates material requirements for production jobs, and maintains comprehensive audit trails for compliance and operational transparency.

The architecture follows a three-tier pattern with a React frontend, RESTful API backend (Spring Boot or FastAPI), and PostgreSQL database. The system emphasizes role-based access control, transactional integrity, and real-time inventory updates.

## Architecture

### System Architecture

The system follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│         (React Web App)                 │
└─────────────────────────────────────────┘
                  │
                  │ REST API (HTTPS)
                  │
┌─────────────────────────────────────────┐
│         Application Layer               │
│    ┌──────────────────────────────┐    │
│    │  API Gateway / Auth          │    │
│    └──────────────────────────────┘    │
│    ┌──────────────────────────────┐    │
│    │  Business Logic Services     │    │
│    │  - Inventory Service         │    │
│    │  - Job Card Service          │    │
│    │  - Approval Service          │    │
│    │  - Reporting Service         │    │
│    └──────────────────────────────┘    │
└─────────────────────────────────────────┘
                  │
                  │ Database Queries
                  │
┌─────────────────────────────────────────┐
│         Data Layer                      │
│         (PostgreSQL)                    │
│    - Transactional Tables               │
│    - Audit Tables                       │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React with TypeScript, React Router, Axios for API calls
- **Backend**: Spring Boot (Java) or FastAPI (Python)
- **Database**: PostgreSQL 14+
- **Authentication**: JWT-based authentication
- **Deployment**: Docker containers with docker-compose

## Components and Interfaces

### 1. Authentication & Authorization Module

**Responsibilities:**
- User authentication with JWT tokens
- Role-based access control (RBAC)
- Permission validation for actions

**Key Interfaces:**
- `POST /api/auth/login` - User login, returns JWT token
- `POST /api/auth/logout` - Invalidate token
- `GET /api/auth/me` - Get current user profile and permissions
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/{id}/roles` - Update user roles (Admin only)

### 2. Raw Material Management Module

**Responsibilities:**
- Paper roll master data management
- Raw material inventory tracking
- Stock level calculations

**Key Interfaces:**
- `POST /api/materials` - Create paper roll type
- `GET /api/materials` - List all paper roll types
- `GET /api/materials/{id}` - Get paper roll details
- `PUT /api/materials/{id}` - Update paper roll type
- `GET /api/materials/{id}/stock` - Get current stock level and history

### 3. Inventory Inward Module

**Responsibilities:**
- Record raw material receipts
- Approval workflow for inward transactions
- Stock balance updates

**Key Interfaces:**
- `POST /api/inventory/inward` - Create inward request
- `GET /api/inventory/inward` - List inward requests (with filters)
- `GET /api/inventory/inward/{id}` - Get inward request details
- `POST /api/inventory/inward/{id}/approve` - Approve inward request
- `POST /api/inventory/inward/{id}/reject` - Reject inward request

### 4. Job Card Management Module

**Responsibilities:**
- Job card creation and lifecycle management
- Automatic material requirement calculation
- Stock availability validation

**Key Interfaces:**
- `POST /api/jobcards` - Create job card
- `GET /api/jobcards` - List job cards (with status filters)
- `GET /api/jobcards/{id}` - Get job card details
- `PUT /api/jobcards/{id}` - Update job card
- `POST /api/jobcards/{id}/calculate-materials` - Calculate material requirements
- `POST /api/jobcards/{id}/approve` - Approve job card
- `POST /api/jobcards/{id}/start` - Start production
- `POST /api/jobcards/{id}/complete` - Complete production

### 5. Material Issue Module

**Responsibilities:**
- Issue raw materials against job cards
- Approval workflow for material issues
- Stock deduction and tracking

**Key Interfaces:**
- `POST /api/material-issues` - Create material issue request
- `GET /api/material-issues` - List material issues
- `GET /api/material-issues/{id}` - Get issue details
- `POST /api/material-issues/{id}/approve` - Approve material issue
- `POST /api/material-issues/{id}/reject` - Reject material issue

### 6. Finished Goods Management Module

**Responsibilities:**
- Finished goods inventory tracking
- Automatic stock updates from production
- Outward transaction management

**Key Interfaces:**
- `POST /api/finished-goods` - Create finished goods type
- `GET /api/finished-goods` - List finished goods types
- `GET /api/finished-goods/{id}/stock` - Get stock level
- `POST /api/finished-goods/outward` - Create outward request
- `POST /api/finished-goods/outward/{id}/approve` - Approve outward

### 7. Inventory Adjustment Module

**Responsibilities:**
- Manual stock adjustments
- Approval workflow with mandatory reasons
- Audit trail maintenance

**Key Interfaces:**
- `POST /api/inventory/adjustments` - Create adjustment request
- `GET /api/inventory/adjustments` - List adjustments
- `POST /api/inventory/adjustments/{id}/approve` - Approve adjustment

### 8. Reporting Module

**Responsibilities:**
- Generate inventory and production reports
- Calculate wastage analytics
- Low stock alerts

**Key Interfaces:**
- `GET /api/reports/raw-material-stock` - Raw material stock report
- `GET /api/reports/finished-goods-stock` - Finished goods stock report
- `GET /api/reports/material-consumption` - Material consumption analysis
- `GET /api/reports/wastage-analysis` - Wastage trends
- `GET /api/reports/low-stock-alerts` - Items below threshold

### 9. Audit Log Module

**Responsibilities:**
- Record all transactions immutably
- Provide audit trail queries
- Maintain compliance records

**Key Interfaces:**
- `GET /api/audit-logs` - Query audit logs with filters
- `GET /api/audit-logs/transaction/{id}` - Get audit trail for specific transaction

## Data Models

### User
```
{
  id: UUID
  username: String (unique)
  email: String
  passwordHash: String
  roles: Array<String> // ["ADMIN", "PRODUCTION_MANAGER", etc.]
  isActive: Boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### PaperRoll (Raw Material Master)
```
{
  id: UUID
  materialCode: String (unique)
  paperType: String // "Kraft", "Duplex", etc.
  gsm: Integer
  rollWidth: Decimal // in mm
  rollLength: Decimal // in meters (optional)
  rollWeight: Decimal // in kg (optional)
  supplier: String
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### RawMaterialInventory
```
{
  id: UUID
  paperRollId: UUID (FK)
  openingStock: Decimal
  currentStock: Decimal
  unit: String // "kg", "meters", "rolls"
  lastUpdated: Timestamp
}
```

### InventoryInward
```
{
  id: UUID
  paperRollId: UUID (FK)
  supplier: String
  purchaseReference: String
  quantityReceived: Decimal
  unit: String
  receiptDate: Date
  status: String // "PENDING", "APPROVED", "REJECTED"
  requestedBy: UUID (FK to User)
  approvedBy: UUID (FK to User, nullable)
  approvalDate: Timestamp (nullable)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### JobCard
```
{
  id: UUID
  jobCardNumber: String (unique)
  boxType: String
  boxLength: Decimal // in mm
  boxWidth: Decimal // in mm
  boxHeight: Decimal // in mm
  plyType: String // "3-ply", "5-ply", etc.
  plyCount: Integer
  quantityToProduce: Integer
  plannedStartDate: Date
  plannedEndDate: Date
  actualStartDate: Date (nullable)
  actualEndDate: Date (nullable)
  status: String // "CREATED", "APPROVED", "IN_PRODUCTION", "COMPLETED"
  calculatedPaperArea: Decimal // in sq.m
  requiredPaperQuantity: Decimal
  actualQuantityProduced: Integer (nullable)
  rejectedQuantity: Integer (nullable)
  wastageQuantity: Decimal (nullable)
  createdBy: UUID (FK to User)
  approvedBy: UUID (FK to User, nullable)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### MaterialIssue
```
{
  id: UUID
  jobCardId: UUID (FK)
  paperRollId: UUID (FK)
  requestedQuantity: Decimal
  issuedQuantity: Decimal
  unit: String
  issueDate: Date
  status: String // "PENDING", "APPROVED", "REJECTED"
  requestedBy: UUID (FK to User)
  approvedBy: UUID (FK to User, nullable)
  approvalDate: Timestamp (nullable)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### FinishedGoods (Master)
```
{
  id: UUID
  boxType: String
  boxLength: Decimal
  boxWidth: Decimal
  boxHeight: Decimal
  plyType: String
  specification: String (optional)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### FinishedGoodsInventory
```
{
  id: UUID
  finishedGoodsId: UUID (FK)
  currentStock: Integer
  unit: String // "boxes"
  lastUpdated: Timestamp
}
```

### FinishedGoodsInward
```
{
  id: UUID
  finishedGoodsId: UUID (FK)
  jobCardId: UUID (FK)
  quantityProduced: Integer
  quantityRejected: Integer
  netQuantity: Integer
  confirmedBy: UUID (FK to User)
  confirmationDate: Timestamp
  createdAt: Timestamp
}
```

### FinishedGoodsOutward
```
{
  id: UUID
  finishedGoodsId: UUID (FK)
  quantity: Integer
  destination: String
  dispatchDate: Date
  status: String // "PENDING", "APPROVED", "REJECTED"
  requestedBy: UUID (FK to User)
  approvedBy: UUID (FK to User, nullable)
  approvalDate: Timestamp (nullable)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### InventoryAdjustment
```
{
  id: UUID
  inventoryType: String // "RAW_MATERIAL", "FINISHED_GOODS"
  itemId: UUID // paperRollId or finishedGoodsId
  adjustmentQuantity: Decimal // positive or negative
  reason: String (mandatory)
  status: String // "PENDING", "APPROVED", "REJECTED"
  requestedBy: UUID (FK to User)
  approvedBy: UUID (FK to User, nullable)
  approvalDate: Timestamp (nullable)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### AuditLog
```
{
  id: UUID
  transactionType: String // "INWARD", "ISSUE", "OUTWARD", "ADJUSTMENT", etc.
  transactionId: UUID
  entityType: String
  entityId: UUID
  action: String // "CREATE", "UPDATE", "APPROVE", "REJECT"
  beforeData: JSON (nullable)
  afterData: JSON
  performedBy: UUID (FK to User)
  performedAt: Timestamp
  ipAddress: String
  userAgent: String
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- **Stock update properties** (2.3, 4.3, 7.2, 8.3, 9.3) all follow the same pattern of stock balance calculations and can be unified into a single comprehensive inventory transaction property
- **Audit trail properties** (2.4, 4.5, 8.5, 9.5, 16.1) all verify audit log completeness and can be combined into one property
- **Workflow approval properties** (2.2, 4.2, 7.3, 8.2, 13.4) all enforce the same approval-before-action pattern
- **Data capture properties** for entity creation (1.1, 2.1, 3.1, 6.1, 8.1) verify required fields are stored and can be consolidated
- **State transition properties** (5.1-5.4) form a cohesive state machine that should be tested as a whole

The consolidated properties below provide comprehensive coverage while avoiding redundant tests.

### Correctness Properties

**Property 1: Inventory balance consistency**
*For any* inventory transaction (inward, issue, outward, or adjustment), the stock balance after the transaction SHALL equal the stock balance before the transaction plus the transaction quantity (where outward and issue quantities are negative).
**Validates: Requirements 2.3, 4.3, 7.2, 8.3, 9.3**

**Property 2: Entity creation completeness**
*For any* entity creation operation (paper roll, job card, inward request, material issue, finished goods, outward request, adjustment), all mandatory fields specified in the requirements SHALL be stored and retrievable.
**Validates: Requirements 1.1, 2.1, 3.1, 6.1, 8.1**

**Property 3: Inventory isolation**
*For any* two distinct paper roll types, transactions affecting one paper roll's inventory SHALL NOT affect the other paper roll's inventory balance.
**Validates: Requirements 1.4**

**Property 4: Approval workflow enforcement**
*For any* transaction requiring approval (inward, material issue, outward, adjustment), the transaction SHALL remain in pending status and SHALL NOT update inventory balances until an authorized user approves it.
**Validates: Requirements 2.2, 4.2, 7.3, 8.2, 13.4**

**Property 5: Material requirement calculation accuracy**
*For any* job card with box dimensions (length, width, height), ply count, and quantity to produce, the calculated paper area SHALL equal the surface area of the box multiplied by ply count multiplied by quantity, with appropriate unit conversions.
**Validates: Requirements 3.2, 3.3**

**Property 6: Stock availability validation**
*For any* job card approval attempt, IF the required paper quantity exceeds available stock, THEN the system SHALL reject the approval and return an error message.
**Validates: Requirements 3.4, 3.5**

**Property 7: Partial material issue support**
*For any* job card, the sum of all approved material issues SHALL be less than or equal to the calculated required quantity, and multiple partial issues SHALL be allowed until the total reaches the required quantity.
**Validates: Requirements 4.4**

**Property 8: Job card state machine correctness**
*For any* job card, the status transitions SHALL follow the sequence: Created → Approved → In Production → Completed, and no transition SHALL skip a state or move backward.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 9: Net finished goods calculation**
*For any* production completion, the net finished goods quantity SHALL equal the actual quantity produced minus the rejected quantity.
**Validates: Requirements 6.3**

**Property 10: Production completion precondition**
*For any* production completion attempt, the job card status MUST be "In Production", otherwise the system SHALL reject the operation.
**Validates: Requirements 6.4**

**Property 11: Automatic finished goods creation**
*For any* job card that transitions to "Completed" status, the system SHALL automatically create a finished goods inward transaction with the net quantity.
**Validates: Requirements 7.1**

**Property 12: Finished goods traceability**
*For any* finished goods inventory record, it SHALL reference a valid job card ID, establishing traceability from finished goods back to production.
**Validates: Requirements 7.4**

**Property 13: Stock sufficiency validation**
*For any* outward transaction request, IF the requested quantity exceeds the current stock balance, THEN the system SHALL reject the transaction and return an insufficient stock error.
**Validates: Requirements 8.4**

**Property 14: Adjustment reason mandatory**
*For any* inventory adjustment request, the reason field SHALL be non-empty and SHALL contain at least 10 characters.
**Validates: Requirements 9.1**

**Property 15: Adjustment approver independence**
*For any* inventory adjustment, the approving user SHALL be different from the requesting user.
**Validates: Requirements 9.2**

**Property 16: Bidirectional adjustment support**
*For any* inventory adjustment, the system SHALL accept both positive quantities (additions) and negative quantities (reductions) and update stock accordingly.
**Validates: Requirements 9.4**

**Property 17: Low stock threshold detection**
*For any* raw material stock report, items with current stock below the configured threshold SHALL be flagged as low stock.
**Validates: Requirements 10.2**

**Property 18: Wastage percentage calculation**
*For any* job card with recorded wastage, the wastage percentage SHALL equal (wastage quantity / total material issued) × 100.
**Validates: Requirements 11.2**

**Property 19: Role-based authorization**
*For any* action requiring specific role permissions, IF the user does not have the required role, THEN the system SHALL deny the action and return an authorization error.
**Validates: Requirements 12.2, 12.3**

**Property 20: Audit log immutability**
*For any* audit log entry, once created, it SHALL NOT be modifiable or deletable through any system operation.
**Validates: Requirements 16.2**

**Property 21: Audit trail completeness**
*For any* inventory transaction (inward, issue, outward, adjustment), an audit log entry SHALL be created containing transaction type, entity ID, action, user ID, timestamp, and data changes.
**Validates: Requirements 2.4, 4.5, 8.5, 9.5, 16.1**

## Error Handling

### Error Categories

1. **Validation Errors** (HTTP 400)
   - Missing required fields
   - Invalid data formats
   - Business rule violations (e.g., insufficient stock)

2. **Authorization Errors** (HTTP 403)
   - User lacks required role
   - User attempting to approve own request

3. **Not Found Errors** (HTTP 404)
   - Referenced entity does not exist
   - Invalid ID in request

4. **Conflict Errors** (HTTP 409)
   - Duplicate material code
   - Duplicate job card number
   - Concurrent modification conflicts

5. **Server Errors** (HTTP 500)
   - Database connection failures
   - Unexpected system errors

### Error Response Format

All errors SHALL return a consistent JSON structure:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Cannot approve job card: required 2500 sq.m, available 1800 sq.m",
    "field": "paperRollId",
    "timestamp": "2026-05-08T10:30:00Z"
  }
}
```

### Transaction Rollback

All inventory-affecting operations SHALL be wrapped in database transactions. If any step fails:
- All changes SHALL be rolled back
- Stock balances SHALL remain unchanged
- An error response SHALL be returned
- The failure SHALL be logged

### Idempotency

Critical operations (approvals, stock updates) SHALL be idempotent:
- Duplicate approval requests SHALL return success without double-updating
- Use transaction IDs or status checks to prevent duplicate processing

## Testing Strategy

### Unit Testing

Unit tests SHALL cover:
- Individual service methods (calculation logic, validation rules)
- Data access layer operations
- Authorization checks
- Error handling paths

**Framework**: JUnit 5 (Java) or pytest (Python)

**Coverage Target**: Minimum 80% code coverage for business logic

**Example Unit Tests**:
- Test material calculation with various box dimensions
- Test stock balance updates with different transaction types
- Test role permission validation
- Test error responses for invalid inputs

### Property-Based Testing

Property-based tests SHALL verify universal properties across randomly generated inputs. Each property test SHALL run a minimum of 100 iterations.

**Framework**: 
- Java: jqwik (https://jqwik.net/)
- Python: Hypothesis (https://hypothesis.readthedocs.io/)

**Property Test Requirements**:
- Each property-based test MUST be tagged with a comment referencing the design document property
- Tag format: `// Property {number}: {property description}`
- Each correctness property MUST be implemented by a SINGLE property-based test

**Example Property Tests**:
- Generate random inventory transactions and verify balance consistency (Property 1)
- Generate random job cards and verify material calculation formula (Property 5)
- Generate random state transitions and verify state machine rules (Property 8)
- Generate random adjustment requests and verify approver independence (Property 15)

### Integration Testing

Integration tests SHALL verify:
- End-to-end workflows (job card creation → approval → material issue → production → finished goods)
- API endpoint behavior with database
- Authentication and authorization flows
- Approval workflow sequences

**Framework**: REST Assured (Java) or pytest with requests (Python)

**Test Database**: Use PostgreSQL test container or in-memory database

### Test Data Generation

For property-based testing, generators SHALL produce:
- Valid paper roll specifications (GSM: 100-500, width: 500-2000mm)
- Valid box dimensions (length, width, height: 100-1000mm)
- Valid quantities (1-10000)
- Valid user roles and permissions
- Edge cases: zero quantities, maximum values, boundary conditions

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'
services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: cartonbox
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@database:5432/cartonbox
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      - database

  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: http://localhost:8080/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Database Migrations

Use Flyway (Java) or Alembic (Python) for version-controlled schema migrations.

Migration files SHALL:
- Be numbered sequentially (V001, V002, etc.)
- Include both schema changes and data migrations
- Be tested before deployment
- Support rollback where possible

### Security Considerations

1. **Authentication**
   - JWT tokens with 24-hour expiration
   - Refresh token mechanism
   - Password hashing with bcrypt (cost factor 12)

2. **Authorization**
   - Role-based access control enforced at API layer
   - Permission checks before every sensitive operation
   - Audit logging of all authorization failures

3. **Data Protection**
   - HTTPS for all API communication
   - SQL injection prevention via parameterized queries
   - Input validation and sanitization
   - Rate limiting on API endpoints

4. **Audit Trail**
   - Immutable audit logs stored in separate table
   - Capture IP address and user agent
   - Retain logs for minimum 5 years
   - Regular audit log backups

### Performance Optimization

1. **Database Indexing**
   - Index on foreign keys (paperRollId, jobCardId, userId)
   - Index on status fields for filtering
   - Index on date fields for reporting
   - Composite index on (entityType, entityId) for audit logs

2. **Caching**
   - Cache user permissions for 5 minutes
   - Cache material master data for 1 hour
   - Invalidate cache on updates

3. **Query Optimization**
   - Use pagination for list endpoints (default 50 items per page)
   - Implement database connection pooling
   - Use read replicas for reporting queries

4. **Monitoring**
   - Track API response times
   - Monitor database query performance
   - Alert on slow queries (>1 second)
   - Track inventory transaction throughput

## Future Enhancements

1. **Machine Integration**
   - Real-time production data from machines
   - Automatic wastage calculation
   - IoT sensor integration

2. **Advanced Analytics**
   - Predictive wastage analysis using ML
   - Demand forecasting
   - Optimal inventory levels

3. **Barcode/QR Integration**
   - Barcode scanning for material tracking
   - QR codes on finished goods
   - Mobile app for warehouse operations

4. **ERP Integration**
   - Sync with accounting systems
   - Purchase order integration
   - Sales order integration

5. **Multi-location Support**
   - Multiple warehouse management
   - Inter-warehouse transfers
   - Location-wise inventory tracking
