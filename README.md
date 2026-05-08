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
- FastAPI (Python)
- PostgreSQL 14
- SQLAlchemy ORM
- Alembic for migrations
- JWT authentication
- Hypothesis for property-based testing

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for local development)

### Running with Docker Compose

1. Clone the repository
2. Create environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Start all services:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/docs

### Local Development

#### Backend

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
   
   For detailed database setup instructions, see [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md)

5. Start the server:
   ```bash
   uvicorn main:app --reload --port 8080
   ```

#### Frontend

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
.
├── backend/
│   ├── alembic/              # Database migrations
│   ├── auth/                 # Authentication & authorization
│   ├── controllers/          # API route handlers
│   ├── models/               # SQLAlchemy models
│   ├── repositories/         # Data access layer
│   ├── services/             # Business logic
│   ├── config.py             # Configuration
│   ├── database.py           # Database setup
│   └── main.py               # FastAPI application
├── frontend/
│   ├── public/               # Static files
│   └── src/
│       ├── components/       # React components
│       ├── pages/            # Page components
│       ├── services/         # API services
│       └── App.tsx           # Main application
└── docker-compose.yml        # Docker orchestration
```

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Property-Based Tests
```bash
cd backend
pytest -v -k property
```

## User Roles

- **Admin**: Master data and configuration privileges
- **Production Manager**: Production oversight and approvals
- **Store Manager**: Inventory operations management
- **Supervisor**: Production validation

## License

Proprietary - All rights reserved
