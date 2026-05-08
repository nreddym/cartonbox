# Database Setup Guide

## Prerequisites

- PostgreSQL 14+ installed and running
- Python 3.9+ with pip
- All dependencies from requirements.txt installed

## Configuration

1. Create a `.env` file in the backend directory with your database credentials:

```env
DATABASE_URL=postgresql://admin:password@localhost:5432/cartonbox
JWT_SECRET=your-secret-key-change-in-production
```

2. Ensure PostgreSQL is running and the database exists:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE cartonbox;

# Create user (if needed)
CREATE USER admin WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cartonbox TO admin;
```

## Running Migrations

### Apply all migrations

```bash
cd backend
alembic upgrade head
```

### Check current migration version

```bash
alembic current
```

### View migration history

```bash
alembic history
```

### Rollback to previous version

```bash
alembic downgrade -1
```

### Rollback all migrations

```bash
alembic downgrade base
```

## Database Schema

The initial migration creates the following tables:

1. **users** - User accounts with roles and authentication
2. **paper_rolls** - Raw material master data
3. **raw_material_inventory** - Current stock levels for paper rolls
4. **inventory_inward** - Raw material receipt transactions
5. **job_cards** - Production orders with material requirements
6. **material_issues** - Raw material issuance to job cards
7. **finished_goods** - Finished product master data
8. **finished_goods_inventory** - Current stock levels for finished goods
9. **finished_goods_inward** - Production completion transactions
10. **finished_goods_outward** - Dispatch transactions
11. **inventory_adjustments** - Manual stock adjustments
12. **audit_logs** - Immutable audit trail for all transactions

## Indexes

The schema includes indexes on:
- All foreign keys for join performance
- Status fields for filtering
- Date fields for reporting queries
- Composite indexes for common query patterns

## Connection Pooling

The database connection is configured with:
- Pool size: 10 connections
- Max overflow: 20 additional connections
- Pool timeout: 30 seconds
- Pool recycle: 3600 seconds (1 hour)
- Pre-ping: Enabled for connection health checks

## Troubleshooting

### Migration fails with "relation already exists"

If tables already exist, you may need to:
1. Drop all tables manually
2. Delete the alembic_version table
3. Re-run migrations

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO admin;
```

### Connection pool exhausted

If you see connection pool errors:
1. Check for unclosed database sessions
2. Increase pool_size or max_overflow in database.py
3. Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`

### Slow queries

Check query performance:
```sql
-- Enable query logging
ALTER DATABASE cartonbox SET log_statement = 'all';
ALTER DATABASE cartonbox SET log_duration = on;

-- View slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```
