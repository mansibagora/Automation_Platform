# Infrastructure Automation Portal (Simple Standalone Version)

A lightweight, configuration-driven self-service portal for triggering SAP and Oracle infrastructure automations via existing GitHub Actions workflows.

> 📖 **Looking for customer deployment instructions?**  
> See the complete step-by-step guide: **[HOW_TO_RUN.md](HOW_TO_RUN.md)**.

---

## ⚡ Key Highlights

- **Zero Heavy Infrastructure:** No Docker, Kubernetes, RabbitMQ, Celery, or PostgreSQL clusters.
- **Embedded Persistence:** Single SQLite file (`backend/portal.db`) with zero external database configuration.
- **Predefined Catalogue:** 10 fixed automations covering SAP HANA, SAP NetWeaver, and Oracle on Linux and Windows.
- **Mandatory SID Validation:** Enforces System Identifier (SID) input for each request.
- **Immutable Operations:** Actions are strictly fixed (START / STOP) and cannot be altered by users.
- **Single Designated Approver:** Enforces segregation of duties (`engineer_user` vs `approver_user`) before any production change is executed.
- **GitHub Actions Dispatch:** Dispatches `workflow_dispatch` events directly to GitHub to execute existing Ansible playbooks in CI/CD.

---

## 🚀 Quick Start Summary

### 1. Start Backend (Terminal 1)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

### 3. Open Portal
- **Web Portal:** [http://localhost:5173](http://localhost:5173)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Architecture Specification:** Open `architecture.html` in any web browser.
