# Infrastructure Automation Portal (Simple Standalone Version)

A lightweight, configuration-driven self-service portal for triggering SAP and Oracle infrastructure automations via existing GitHub Actions workflows.

---

## ⚡ Key Features

- **Direct Self-Service:** Browse predefined automations for SAP HANA, SAP NetWeaver, and Oracle Databases on Linux and Windows.
- **Mandatory SID Validation:** Enforces System Identifier (SID) input for each request.
- **Immutable Operations:** Actions are strictly fixed (START / STOP) and cannot be altered by users.
- **Single Designated Approver:** Enforces segregation of duties (`engineer_user` vs `approver_user`) before any production change is executed.
- **Direct GitHub CI/CD Dispatch:** Dispatches `workflow_dispatch` events directly to your GitHub repository to execute existing Ansible playbooks.
- **Zero ITSM Bloat:** No RabbitMQ, PostgreSQL, Celery, or ServiceNow/Helix connectors. Single SQLite file (`backend/portal.db`) persistence.

---

## 🚀 Quickstart

### 1. Start Backend (FastAPI on Port 8000)
```bash
cd backend
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start Frontend (React + Vite on Port 5173)
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

### 3. Open in Browser
- **Portal UI:** [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Architecture Specification:** Open `architecture.html` in your browser.

---

## 🔑 Default Roles for Testing
- **Requester (`engineer_user`)**: Default user who can submit infrastructure requests.
- **Approver (`approver_user`)**: Designated approver who can approve/reject pending requests.
- **Admin (`admin_user`)**: Full administrative access.
