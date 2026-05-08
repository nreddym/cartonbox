# Carton Box Manufacturing Management System

A comprehensive web-based application for managing the complete production lifecycle from raw material procurement to finished goods dispatch.

## Features

- Raw material inventory management (paper rolls)
- Job card-based production workflows
- Automatic material requirement calculation
- Approval-based workflows for all inventory movements
- Finished goods inventory tracking
- Comprehensive audit trails
- Role-based access control
- Reporting and analytics

## Technology Stack

### Backend
- FastAPI (Python 3.11)
- PostgreSQL 14
- SQLAlchemy ORM + Alembic migrations
- JWT authentication (passlib + bcrypt)
- Hypothesis for property-based testing

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls

---

## 1. Prerequisites

- **Docker Desktop** running (Linux containers)
- Free local ports: `3000` (frontend), `8080` (backend), `5432` (Postgres)
- Optional for local-only dev: Python 3.11+, Node.js 18+

---

## 2. Run with Docker Compose (recommended)

From the repo root:

```powershell
# Optional: set a strong JWT secret (defaults to a dev value if omitted)
$env:JWT_SECRET = "change-me-to-something-strong"

# Build images and start everything in the background
docker compose up -d --build

# Verify
docker compose ps
```

You should see three healthy containers: `cartonbox_db`, `cartonbox_backend`, `cartonbox_frontend`.

### 2.1 Apply database migrations

```powershell
docker compose exec backend alembic upgrade head
```

### 2.2 Create the initial admin user

There is no seed script yet — create one from the backend container:

```powershell
docker compose exec backend python -c "from database import SessionLocal; from models.user import User; from auth.jwt_handler import get_password_hash; db=SessionLocal(); u=User(username='admin', email='admin@example.com', password_hash=get_password_hash('password123'), roles=['ADMIN']); db.add(u); db.commit(); print('admin created:', u.id)"
```

### 2.3 Access the app

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Login: `admin` / `password123` |
| Swagger UI | http://localhost:8080/docs | Interactive API explorer |
| OpenAPI JSON | http://localhost:8080/openapi.json | Raw schema |
| Postgres | localhost:5432 | user `admin`, pwd `password`, db `cartonbox` |

### 2.4 Common Compose commands

```powershell
docker compose logs -f backend         # tail backend logs
docker compose logs -f frontend        # tail frontend logs
docker compose restart backend         # restart a single service
docker compose down                    # stop & remove containers
docker compose down -v                 # also wipe the DB volume
docker compose build backend           # rebuild after requirements change
```

---

## 3. Run locally (without Docker)

### Backend

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt

# Configure DB (Postgres must be running and reachable)
copy .env.example .env
# Edit .env if needed; default DATABASE_URL = postgresql://admin:password@localhost:5432/cartonbox

alembic upgrade head
uvicorn main:app --reload --port 8080
```

See [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md) for setting up Postgres locally.

### Frontend

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

App opens at http://localhost:3000 and proxies API calls to http://localhost:8080.

---

## 4. Testing

### 4.1 Run the full test suite

There are 54 tests (integration + property-based) using an in-memory SQLite DB, so the Compose stack does **not** need to be running.

From the host:
```powershell
cd backend
py -m pytest -v
```

Or inside the backend container (uses the same code, mounted as a volume):
```powershell
docker compose exec backend python -m pytest -v
```

Expected output:
```
============== 54 passed in ~24s ==============
```

### 4.2 Run a specific group

```powershell
py -m pytest tests/test_integration.py -v          # End-to-end workflows
py -m pytest tests/test_material_properties.py -v  # Property-based (Hypothesis)
py -m pytest tests/test_auth_properties.py -v      # Auth & RBAC
```

### 4.3 Filter by name

```powershell
py -m pytest -k "full_manufacturing_workflow" -v
py -m pytest -k "audit" -v
```

### 4.4 What the tests cover

| Area | Tests |
|---|---|
| Authentication | `test_login_returns_token`, `test_unauthenticated_request_is_rejected` |
| RBAC | `test_supervisor_cannot_approve_inward`, `test_non_admin_cannot_create_users`, `test_non_auditor_cannot_view_audit_logs` |
| End-to-end flow | `test_full_manufacturing_workflow`, `test_inventory_adjustment_workflow` |
| Audit | `test_audit_logs_recorded`, property 20 (immutability), property 21 (completeness) |
| State machine | property 8 (valid/invalid status transitions) |
| Inventory math | properties 1, 3, 5, 9, 13, 17, 18 |
| Approval workflow | properties 4, 6, 14, 15, 16 |
| Production | properties 7, 10, 11, 12 |

### 4.5 Manual end-to-end check (UI)

Mirrors `test_full_manufacturing_workflow`:

1. Log in as `admin` and create users with roles `STORE_MANAGER`, `PRODUCTION_MANAGER`, `OPERATOR`, `AUDITOR` (Users page).
2. **Store Manager** — create a Paper Roll → record an Inventory Inward → approve it.
3. **Production Manager** — create a Job Card → approve it → issue materials.
4. **Operator/Production Manager** — start production → mark complete (auto-creates finished goods).
5. **Store Manager** — create a Finished Goods Outward → approve it.
6. **Auditor** — open Audit Logs and confirm an entry exists for every step above.

---

## 5. User roles

| Role | Capabilities |
|---|---|
| `ADMIN` | All operations, user management, master data |
| `PRODUCTION_MANAGER` | Job cards, production approvals, material issues |
| `STORE_MANAGER` | Inventory inward/outward, paper rolls, FG dispatch |
| `SUPERVISOR` | Production validation, recording transactions |
| `OPERATOR` | Recording production progress |
| `AUDITOR` | Read-only access to audit logs and reports |

---

## 6. Project structure

```
.
├── backend/
│   ├── alembic/              # Database migrations
│   ├── auth/                 # JWT, password hashing, RBAC dependencies
│   ├── controllers/          # FastAPI route handlers
│   ├── models/               # SQLAlchemy ORM models
│   ├── repositories/         # Data-access layer
│   ├── services/             # Business logic & approval workflows
│   ├── tests/                # Integration + property-based tests
│   ├── config.py             # Settings (env-driven)
│   ├── database.py           # Engine / Session setup
│   ├── main.py               # FastAPI application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/               # Static assets & index.html
│   ├── src/
│   │   ├── components/       # Shared components (MainLayout, ProtectedRoute, …)
│   │   ├── pages/            # Route-level pages
│   │   ├── services/         # API + auth services
│   │   └── App.tsx           # Routes
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `port already in use` on `up` | Stop the conflicting service or change the host port in [docker-compose.yml](docker-compose.yml). |
| Backend container restart loop, log shows `email-validator is not installed` | Ensure `pydantic[email]` and `email-validator` are in [backend/requirements.txt](backend/requirements.txt), then `docker compose build backend && docker compose up -d backend`. |
| `password cannot be longer than 72 bytes` from passlib | Pin `bcrypt==4.0.1` in [backend/requirements.txt](backend/requirements.txt) (passlib 1.7.x is incompatible with bcrypt 5+). |
| Login succeeds but UI shows blank page / `"undefined" is not valid JSON` | Old `localStorage.user` value. In DevTools → Application → Local Storage, delete the `user` and `token` keys, hard-refresh, log in again. |
| Frontend hot-reload not picking up source changes on Windows | The Compose file enables `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true`. If still stale, run `docker compose restart frontend`. |
| `alembic upgrade head` errors about an existing schema | Reset the DB volume: `docker compose down -v` then start again from step 2. |
| CORS errors from the frontend | Confirm `REACT_APP_API_URL=http://localhost:8080/api` in `docker-compose.yml` matches the backend port. |
| `docker-compose.yml: the attribute 'version' is obsolete` | Harmless warning; the `version:` key has been removed in this repo. |

---

## 8. Tearing down

```powershell
docker compose down            # stops & removes containers
docker compose down -v         # also removes the postgres volume (wipes data)
docker compose down --rmi all  # also removes built images
```

## License

Proprietary — All rights reserved.

