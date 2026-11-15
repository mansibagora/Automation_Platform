# Project Context: Lightweight Infrastructure Automation Portal

## Branch Safety
- **Base Branch (ITSM)**: `main` (commit `f5a7a86` with complete baseline ITSM Automation Platform). Untouched.
- **Active Feature Branch**: `feature/lightweight-automation-portal`. All portal code developed here.

## Objectives & Scope
- **NOT an ITSM platform**: No tickets, no Helix/ServiceNow, no RabbitMQ queues, no DLX, no Docker/K8s, no direct Ansible execution from Python backend.
- Simple, clean portal for:
  1. Selecting infrastructure automation (SAP HANA, SAP, Oracle on Linux/Windows, START/STOP).
  2. Input validation (SID + dynamic workflow parameters).
  3. Single-approver approval workflow (`PENDING_APPROVAL` -> `APPROVED`/`REJECTED`).
  4. Triggering existing GitHub Actions via `workflow_dispatch`.
  5. Monitoring and synchronizing GitHub execution status (`QUEUED`, `IN_PROGRESS`, `COMPLETED` / `SUCCESS` / `FAILURE`).
  6. Viewing execution history.

## Architecture
- **Backend**: `portal_backend/` (FastAPI + SQLite + HTTPX + Pydantic).
- **Frontend**: `portal_frontend/` or configured in Vite under `/portal` or dedicated dev server port `5174` (React + TypeScript + Tailwind).
- **Catalogue Configuration**: `portal_backend/automations.json`.
- **Database**: Local SQLite database `portal_backend/portal.db`.
