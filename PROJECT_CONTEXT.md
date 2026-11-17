# Project Context: Lightweight Infrastructure Automation Portal (Standalone)

## Branch & Structure
- **Active Standalone Branch**: `standalone-lightweight-portal`
- **Baseline Heavy ITSM Branch (Preserved Separately)**: `main`
- **Coexistence Feature Branch (Preserved Separately)**: `feature/lightweight-automation-portal`

## Objectives & Scope
- **Standalone Self-Service Automation Portal**: No tickets, no Helix/ServiceNow, no RabbitMQ queues, no DLX, no Docker/K8s, no direct Ansible execution from Python backend.
- Simple, clean portal for:
  1. Selecting infrastructure automation (SAP HANA, SAP NetWeaver, Oracle on Linux/Windows with fixed START/STOP operations).
  2. Input validation (Mandatory SID + dynamic workflow parameters).
  3. Single designated approver workflow (`PENDING_APPROVAL` ➔ `APPROVED` / `REJECTED`).
  4. Triggering existing GitHub Actions via `workflow_dispatch` (with simulation mode when unconfigured).
  5. Monitoring and synchronizing GitHub execution status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`).
  6. Viewing execution history and logs.

## Current Technical Architecture
- **Backend**: `backend/` (FastAPI + SQLite + HTTPX + Pydantic on port 8000).
- **Frontend**: `frontend/` (React 18 + TypeScript + Tailwind CSS + Vite on port 5173).
- **Catalogue Configuration**: `backend/automations.json` (10 predefined automations).
- **Database**: Embedded SQLite database `backend/portal.db`.
- **Testing**: 11 automated pytest tests (`backend/tests/test_portal.py`) passing 100%.
- **Documentation**:
  - `HOW_TO_RUN.md`: 3-minute quickstart guide.
  - `CLIENT_DEPLOYMENT_GUIDE.md`: Production deployment guide (Linux systemd, Nginx, backups).
  - `PRE_DEPLOYMENT_AUDIT.md`: Complete security and code audit report.
  - `FILES_AND_FLOW.md`: Detailed file-by-file explainer and trigger chain.
  - `architecture.html`: Standalone interactive system blueprint and flow simulator.
