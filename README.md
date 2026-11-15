# ITSM Automation Platform

A production-ready ITSM (IT Service Management) Automation Platform with ticket ingestion, approval workflows, automated execution, and real-time analytics.

## Architecture

- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Message Broker**: RabbitMQ with dead-letter exchange
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Recharts
- **Execution Engines**: Mock, GitHub Actions, Ansible (pluggable)

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 16+
- RabbitMQ

## Quick Start

### 1. Database Setup
```bash
createdb itsm_platform
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your DB credentials
```

### 3. Run Migrations & Seed Data
```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "initial"
alembic upgrade head
python seed.py
```

### 4. Start Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000 --reload
```

### 5. Start RabbitMQ Worker
```bash
cd backend
source .venv/bin/activate
python -m app.workers.consumer
```

### 6. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

## Default Users

| Username | Token | Role |
|----------|-------|------|
| admin_user | admin123 | admin |
| approver_user | approver123 | approver |
| svc_itsm | svc123 | service_account |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check (DB + RabbitMQ) |
| POST | /api/v1/auth/login | Login with username/token |
| GET | /api/v1/auth/me | Current user info |
| POST | /api/v1/itsm/webhook | Receive ITSM webhook |
| GET | /api/v1/tickets | List tickets (paginated, filterable) |
| GET | /api/v1/tickets/{id} | Get ticket details |
| POST | /api/v1/tickets/{id}/lock | Lock ticket |
| POST | /api/v1/tickets/{id}/unlock | Unlock ticket |
| POST | /api/v1/tickets/{id}/approve | Approve & execute |
| POST | /api/v1/tickets/{id}/deny | Deny with reason |
| POST | /api/v1/tickets/{id}/retry | Retry failed ticket |
| GET | /api/v1/tickets/{id}/executions | Execution history |
| GET | /api/v1/tickets/{id}/audit | Audit trail |
| POST | /api/v1/mock-helix/generate | Generate mock ticket |
| POST | /api/v1/mock-helix/send | Send to pipeline |
| GET | /api/v1/analytics | Dashboard metrics |
| GET | /api/v1/analytics/export/csv | Export CSV |

## Automation Configuration

Edit `backend/automations.json` to configure ticket-matching rules without modifying code.

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/test_api.py -v
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # REST endpoints
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── services/     # Business logic
│   │   ├── utils/        # RabbitMQ utilities
│   │   ├── workers/      # Async consumer process
│   │   ├── config.py     # Settings from .env
│   │   ├── database.py   # Async DB engine
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # DB migrations
│   ├── tests/            # Pytest suite
│   ├── automations.json  # Automation rules config
│   ├── seed.py           # Data seeding script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, ReviewModal, StatusChip
│   │   ├── pages/        # Inbox, Analytics, MockITSM
│   │   ├── api.ts        # Axios client
│   │   └── App.tsx       # Router
│   └── package.json
└── README.md
```
