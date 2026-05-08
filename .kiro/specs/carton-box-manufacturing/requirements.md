# Requirements Document

## Introduction

This document specifies the requirements for a Carton Box Manufacturing Management System that manages raw material inventory (paper rolls), job card-based production workflows, raw material consumption calculation, finished goods inventory, and controlled inventory movements with approval workflows. The system targets small to mid-sized carton box manufacturers requiring improved production planning, inventory control, and operational transparency.

## Glossary

- **System**: The Carton Box Manufacturing Management System
- **Paper Roll**: Raw material inventory item used in carton box production
- **Job Card**: A production order document specifying carton box type, quantity, and material requirements
- **Finished Goods**: Completed carton boxes ready for dispatch
- **Inventory Movement**: Any transaction that changes stock levels (inward, outward, adjustment)
- **Admin**: User role with master data and configuration privileges
- **Production Manager**: User role responsible for production oversight and approvals
- **Store Manager**: User role managing inventory operations
- **Supervisor**: User role validating production completion
- **GSM**: Grams per Square Meter, a measure of paper weight
- **Ply**: Number of paper layers in a carton box

## Requirements

### Requirement 1

**User Story:** As a Store Manager, I want to manage paper roll inventory, so that I can track raw material availability for production.

#### Acceptance Criteria

1. WHEN a Store Manager creates a paper roll type, THE System SHALL store material code, paper type, GSM, roll width, roll dimensions, and supplier information
2. WHEN a Store Manager views paper roll inventory, THE System SHALL display opening stock, stock received, stock issued, and current stock balance
3. WHEN stock levels change, THE System SHALL update inventory records in real time
4. THE System SHALL maintain separate inventory records for each unique paper roll type

### Requirement 2

**User Story:** As a Store Manager, I want to record raw material receipts with approval, so that inventory inward transactions are controlled and auditable.

#### Acceptance Criteria

1. WHEN a Store Manager records raw material receipt, THE System SHALL capture supplier, purchase reference, quantity received, and receipt date
2. WHEN a Store Manager submits an inventory inward request, THE System SHALL require Production Manager or Admin approval before updating stock
3. WHEN an inventory inward transaction is approved, THE System SHALL increase the paper roll stock balance by the received quantity
4. THE System SHALL log the user who entered the transaction and the user who approved it with timestamps

### Requirement 3

**User Story:** As a Production Manager, I want to create job cards with automatic material calculation, so that I can plan production with accurate material requirements.

#### Acceptance Criteria

1. WHEN a Production Manager creates a job card, THE System SHALL capture job card number, box type, box dimensions, ply type, quantity to produce, and planned dates
2. WHEN a Production Manager enters box dimensions and quantity, THE System SHALL calculate total paper area required based on box dimensions and ply configuration
3. WHEN the System calculates material requirements, THE System SHALL display the required paper roll quantity for the job
4. WHEN a Production Manager attempts to approve a job card, THE System SHALL validate that sufficient raw material stock exists
5. IF insufficient raw material stock exists, THEN THE System SHALL prevent job card approval and display a stock shortage message

### Requirement 4

**User Story:** As a Store Manager, I want to issue raw materials against approved job cards with approval controls, so that material consumption is tracked and authorized.

#### Acceptance Criteria

1. WHEN a Store Manager issues raw material, THE System SHALL link the issue to an approved job card
2. WHEN a Store Manager submits a material issue request, THE System SHALL require Production Manager approval before deducting stock
3. WHEN a material issue is approved, THE System SHALL reduce the paper roll stock balance by the issued quantity
4. THE System SHALL allow partial material issues against a job card
5. THE System SHALL log issued quantity, issue date, issuing user, and approving user for each transaction

### Requirement 5

**User Story:** As a Production Manager, I want to track job card status through production stages, so that I can monitor production progress.

#### Acceptance Criteria

1. WHEN a job card is created, THE System SHALL set its status to Created
2. WHEN a job card receives approval, THE System SHALL update its status to Approved
3. WHEN material is issued against a job card, THE System SHALL update its status to In Production
4. WHEN a Supervisor confirms production completion, THE System SHALL update its status to Completed
5. THE System SHALL display current status for all job cards in the production dashboard

### Requirement 6

**User Story:** As a Supervisor, I want to record actual production quantities and wastage, so that finished goods inventory reflects reality.

#### Acceptance Criteria

1. WHEN a Supervisor records production completion, THE System SHALL capture actual quantity produced
2. WHEN a Supervisor records production completion, THE System SHALL allow optional wastage quantity entry
3. WHEN production is completed, THE System SHALL calculate net finished goods as actual quantity produced minus rejected quantity
4. THE System SHALL prevent production completion recording for job cards not in In Production status

### Requirement 7

**User Story:** As a Store Manager, I want finished goods to be automatically added to inventory upon production completion, so that stock levels are accurate without manual entry.

#### Acceptance Criteria

1. WHEN a job card status changes to Completed, THE System SHALL automatically create a finished goods inward transaction
2. WHEN finished goods are added, THE System SHALL increase finished goods stock by the net quantity produced
3. WHEN finished goods are added, THE System SHALL require Supervisor confirmation before updating stock
4. THE System SHALL link finished goods inventory to the originating job card for traceability

### Requirement 8

**User Story:** As a Store Manager, I want to dispatch finished goods with approval controls, so that outward movements are authorized and tracked.

#### Acceptance Criteria

1. WHEN a Store Manager initiates finished goods outward, THE System SHALL capture dispatch details including quantity and destination
2. WHEN a Store Manager submits an outward request, THE System SHALL require Production Manager or Admin approval
3. WHEN an outward transaction is approved, THE System SHALL reduce finished goods stock by the dispatched quantity
4. IF requested quantity exceeds available stock, THEN THE System SHALL prevent the outward transaction and display an insufficient stock message
5. THE System SHALL maintain an audit trail with user, timestamp, and approval details for each outward transaction

### Requirement 9

**User Story:** As an Admin, I want to perform inventory adjustments with mandatory justification, so that stock discrepancies can be corrected with accountability.

#### Acceptance Criteria

1. WHEN an Admin initiates an inventory adjustment, THE System SHALL require a mandatory reason for the adjustment
2. WHEN an Admin submits an adjustment, THE System SHALL require Admin approval from a different user
3. WHEN an adjustment is approved, THE System SHALL update the stock balance by the adjustment quantity
4. THE System SHALL support both positive adjustments for additions and negative adjustments for reductions
5. THE System SHALL log adjustment reason, initiating user, approving user, and timestamp

### Requirement 10

**User Story:** As a Production Manager, I want to view raw material stock reports, so that I can plan production based on material availability.

#### Acceptance Criteria

1. WHEN a Production Manager requests a raw material stock report, THE System SHALL display all paper roll types with current stock levels
2. WHEN stock levels fall below a configurable threshold, THE System SHALL highlight low stock items in the report
3. THE System SHALL allow filtering by paper type, GSM, and supplier
4. THE System SHALL display stock movement history for selected paper rolls

### Requirement 11

**User Story:** As a Production Manager, I want to view material consumption reports, so that I can analyze actual versus planned consumption and identify wastage.

#### Acceptance Criteria

1. WHEN a Production Manager requests a consumption report, THE System SHALL display planned material quantity versus actual issued quantity for each job card
2. WHEN wastage is recorded, THE System SHALL calculate wastage percentage as wastage divided by total material issued
3. THE System SHALL allow filtering by date range, job card, and box type
4. THE System SHALL aggregate wastage data across multiple job cards for trend analysis

### Requirement 12

**User Story:** As an Admin, I want to configure user roles and permissions, so that system access is controlled based on job responsibilities.

#### Acceptance Criteria

1. WHEN an Admin creates a user account, THE System SHALL assign one or more roles from Admin, Production Manager, Store Manager, or Supervisor
2. WHEN a user attempts an action, THE System SHALL verify the user has the required role permission
3. IF a user lacks required permissions, THEN THE System SHALL deny the action and display an authorization error message
4. THE System SHALL allow Admins to modify role assignments for existing users

### Requirement 13

**User Story:** As an Admin, I want to configure approval workflows, so that inventory movements follow organizational policies.

#### Acceptance Criteria

1. WHEN an Admin configures approval workflows, THE System SHALL allow specification of which roles can approve each transaction type
2. THE System SHALL support approval workflows for inventory inward, material issue, finished goods outward, and inventory adjustments
3. WHEN a transaction requires approval, THE System SHALL notify the designated approver role
4. THE System SHALL prevent transaction completion until approval is granted

### Requirement 14

**User Story:** As a Store Manager, I want to view finished goods inventory reports, so that I can track available stock for dispatch.

#### Acceptance Criteria

1. WHEN a Store Manager requests a finished goods report, THE System SHALL display all carton box types with current stock quantities
2. THE System SHALL show quantity produced, quantity dispatched, and current balance for each box type
3. THE System SHALL allow filtering by box type, size, and date range
4. THE System SHALL display the source job card for each finished goods batch

### Requirement 15

**User Story:** As a Production Manager, I want the system to support up to 500 active job cards, so that production operations scale with business growth.

#### Acceptance Criteria

1. WHEN the System has 500 active job cards, THE System SHALL maintain response times under 2 seconds for job card queries
2. WHEN the System processes inventory transactions, THE System SHALL complete updates within 1 second
3. THE System SHALL support concurrent access by up to 20 users without performance degradation

### Requirement 16

**User Story:** As an Admin, I want all transactions to maintain immutable audit logs, so that historical data cannot be altered and compliance is ensured.

#### Acceptance Criteria

1. WHEN any inventory transaction is recorded, THE System SHALL create an audit log entry with transaction type, user, timestamp, and data changes
2. THE System SHALL prevent modification or deletion of audit log entries
3. WHEN an Admin views audit logs, THE System SHALL display complete transaction history with before and after values
4. THE System SHALL retain audit logs for a minimum of 5 years
