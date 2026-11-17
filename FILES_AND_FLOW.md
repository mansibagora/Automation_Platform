# Complete Codebase Guide: Files, Triggers & End-to-End Flow

This document explains **what every single file in the project does**, **how each file is triggered**, **what it triggers next**, and **how data flows end-to-end** through the entire portal.

---

## 🧭 The High-Level Mental Model (The 4-Piece Puzzle)

```
[ 1. FRONTEND (React) ] ──(HTTP JSON)──▶ [ 2. BACKEND (FastAPI) ]
  • Dashboard, Catalogue                   • Routes & Role Gate
  • Request Modal & Approvals              • Input & Schema Validation
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   ▼                                                                 ▼
       [ 3. LOCAL DB (SQLite) ]                                     [ 4. EXECUTION ENGINE (GitHub Actions) ]
         • portal.db (Single file)                                    • Dispatches workflow_dispatch API
         • Requests, Executions, Audit                                • Runs Ansible playbooks in CI/CD
```

1. **Frontend (Port 5173)**: Displays the UI, lets engineers configure requests, and lets approvers approve them.
2. **Backend (Port 8000)**: Validates input, ensures only the designated approver can approve, and saves to the database.
3. **Database (portal.db)**: An embedded single-file SQLite database storing all requests, execution logs, and audit trails.
4. **GitHub Service**: Triggers GitHub Actions workflows (`workflow_dispatch`) to run Ansible scripts (or runs realistic local simulation if GitHub token is not configured).

---

## 📂 Section 1: Every File Explained (What It Does & What Triggers What)

---

### A. Root Files

#### 1. `HOW_TO_RUN.md`
* **What it does:** Quick, friendly 3-step setup guide for running the application on any customer laptop or server.
* **What triggers it:** A developer or customer opens it to understand how to start backend and frontend.
* **What it triggers:** The user runs the terminal commands inside it (`uvicorn` and `npm run dev`).

#### 2. `FILES_AND_FLOW.md` *(This file)*
* **What it does:** Comprehensive reference explaining every file, every trigger, and the complete data flow.
* **What triggers it:** Developers, reviewers, or architects reading project documentation.

#### 3. `architecture.html`
* **What it does:** An interactive, browser-based visual diagram of the standalone architecture and UI execution flow.
* **What triggers it:** User double-clicks the file or opens it in a browser (`open architecture.html`).
* **What it triggers:** Visualizes the system architecture and interactive step simulator.

#### 4. `README.md`
* **What it does:** The landing page for the repository. Summarizes features and links to `HOW_TO_RUN.md` and `architecture.html`.
* **What triggers it:** Git platforms (GitHub/GitLab) render this automatically when viewing the repository root.

---

### B. Backend Files (`backend/`)

#### 1. `backend/main.py`
* **What it does:** The **heart of the backend**. Creates the FastAPI app, configures CORS, initializes the database on startup, and exposes all REST API endpoints:
  - `GET /health`: Healthcheck.
  - `GET /api/v1/automations`: Returns available playbooks from `automations.json`.
  - `GET /api/v1/requests`: Returns all submitted automation requests.
  - `POST /api/v1/requests`: Creates a new request (validates SID and parameters).
  - `POST /api/v1/requests/{id}/approve`: Approves a request (guarded by approver role).
  - `POST /api/v1/requests/{id}/reject`: Rejects a request.
  - `GET /api/v1/executions`: Returns execution history.
  - `POST /api/v1/executions/{id}/sync`: Polls GitHub API for execution status updates.
  - `GET /api/v1/dashboard/summary`: Calculates KPI counts for the dashboard.
* **What triggers it:** 
  1. Triggered on startup by `uvicorn main:app`.
  2. Triggered on runtime whenever the frontend makes an HTTP request to `/api/v1/*`.
* **What it triggers:**
  - Calls `database.init_db()` during startup.
  - Calls `auth.get_current_user()` to verify the user.
  - Calls `database.get_db()` to query or insert rows into SQLite.
  - Calls `github_service.dispatch_workflow()` upon approval.

#### 2. `backend/config.py`
* **What it does:** Reads configuration settings from `backend/.env` using Pydantic Settings (e.g. backend port `8000`, database path `portal.db`, designated approver name `approver_user`, GitHub token).
* **What triggers it:** Imported and executed by `backend/main.py`, `backend/database.py`, and `backend/github_service.py` on startup.
* **What it triggers:** Provides the singleton `settings` object used throughout the backend.

#### 3. `backend/.env` & `backend/.env.example`
* **What it does:** Plain text file storing environment variables (`PORTAL_PORT=8000`, `DESIGNATED_APPROVER=approver_user`, `GITHUB_TOKEN=`, etc.).
* **What triggers it:** Read by `backend/config.py` at application boot.
* **What it triggers:** Configures server ports, secrets, and integration credentials without changing code.

#### 4. `backend/database.py`
* **What it does:** Manages the SQLite database connection:
  - `get_db()`: Opens and returns a connection to `portal.db` with dictionary-like row access (`sqlite3.Row`).
  - `init_db()`: Automatically creates the database tables (`users`, `automation_requests`, `executions`, `audit_logs`) and default users if they don't exist.
  - `log_audit()`: Appends tamper-evident audit log records for any action taken.
* **What triggers it:**
  - Called by `backend/main.py` during app startup (`init_db()`).
  - Called by API endpoints whenever data needs to be read or saved (`get_db()`).
* **What it triggers:** Executes SQL read/write commands against `backend/portal.db`.

#### 5. `backend/portal.db`
* **What it does:** The embedded SQLite database file storing all application data (users, requests, executions, audit logs).
* **What triggers it:** Read/written whenever SQL queries run in `backend/database.py`.
* **What it triggers:** Persists state across server restarts.

#### 6. `backend/automations.json`
* **What it does:** External catalogue configuration file holding the **10 predefined SAP & Oracle automations**. Defines:
  - Unique ID (e.g. `hana-linux-start`).
  - Operating System (`Linux` / `Windows`).
  - Fixed Action (`START` / `STOP`).
  - Required parameters (e.g. mandatory `sid`, `instance_number`).
  - Corresponding GitHub Actions workflow file (e.g. `hana_start.yml`).
* **What triggers it:** Read by `backend/schemas.py` and `backend/main.py` on startup or when `GET /api/v1/automations` is requested.
* **What it triggers:** Supplies catalogue data to the frontend Catalogue page and Request modal.

#### 7. `backend/schemas.py`
* **What it does:** Defines Pydantic data schemas for request payloads, response serialization, and validation (e.g. `CreateRequestInput`, `ReviewRequestInput`, `AutomationOut`).
* **What triggers it:** Used by FastAPI in `backend/main.py` to parse and validate incoming JSON request bodies.
* **What it triggers:** Rejects malformed requests with `422 Unprocessable Entity` before they reach database logic.

#### 8. `backend/auth.py`
* **What it does:** The **security gatekeeper**. Inspects the `X-Portal-User` HTTP header on incoming requests:
  - Looks up user role in SQLite (`engineer`, `approver`, or `admin`).
  - Prevents non-approvers from calling `/approve` or `/reject` (returns `403 Forbidden`).
* **What triggers it:** FastApi dependency injection `Depends(get_current_user)` on protected endpoints in `backend/main.py`.
* **What it triggers:** Either grants permission or raises an `HTTPException(403, "Permission denied")`.

#### 9. `backend/github_service.py`
* **What it does:** Handles CI/CD execution:
  - If `GITHUB_TOKEN` is present: Uses `httpx.AsyncClient` to call GitHub REST API (`POST /repos/{repo}/actions/workflows/{workflow}/dispatches`).
  - If `GITHUB_TOKEN` is empty (Simulation Mode): Generates a realistic mock execution run with realistic logs so the entire portal can be demonstrated out-of-the-box without GitHub setup.
  - `sync_execution_status()`: Queries GitHub Actions run status (`queued`, `in_progress`, `completed`).
* **What triggers it:** Triggered automatically when an approver calls `POST /api/v1/requests/{id}/approve` or when a user clicks **"Sync"** on the Executions page.
* **What it triggers:** Creates a record in the `executions` table and triggers background CI/CD execution.

#### 10. `backend/requirements.txt`
* **What it does:** Lists the minimal Python dependencies (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `httpx`, `pytest`, `pytest-asyncio`).
* **What triggers it:** User runs `pip install -r requirements.txt`.
* **What it triggers:** `pip` downloads and installs the required packages into `.venv`.

#### 11. `backend/tests/test_portal.py`
* **What it does:** Automated test suite with 11 comprehensive tests checking:
  - Health check endpoint.
  - Catalogue loading.
  - Mandatory SID validation.
  - Non-approver permission denial (`403`).
  - Approver approval & workflow trigger.
  - Status synchronization.
  - Dashboard summary math.
* **What triggers it:** Run via `pytest tests/test_portal.py`.
* **What it triggers:** Executes automated tests in memory against a temporary test SQLite database.

---

### C. Frontend Files (`frontend/`)

#### 1. `frontend/index.html`
* **What it does:** The root single-page application HTML container. Loads Google Fonts and mounts the React application at `<div id="root"></div>`.
* **What triggers it:** Browser navigates to `http://localhost:5173`.
* **What it triggers:** Browser executes `frontend/src/main.tsx`.

#### 2. `frontend/vite.config.ts`
* **What it does:** Configuration for Vite dev server and Tailwind CSS. Sets up proxy rules:
  - Any request to `/api/*` or `/health` is automatically forwarded to backend `http://127.0.0.1:8000`.
* **What triggers it:** Read by Vite when running `npm run dev` or `npm run build`.
* **What it triggers:** Configures bundling and local development HTTP proxy.

#### 3. `frontend/package.json`
* **What it does:** Lists frontend npm packages (`react`, `react-router-dom`, `lucide-react`, `tailwindcss`, `axios`, `vite`).
* **What triggers it:** Run via `npm install` and `npm run dev`.

#### 4. `frontend/src/main.tsx`
* **What it does:** React entry point. Imports global styles and mounts the root `<App />` component into the DOM.
* **What triggers it:** Loaded by `frontend/index.html`.
* **What it triggers:** Renders `frontend/src/App.tsx`.

#### 5. `frontend/src/App.tsx`
* **What it does:** Top-level layout and routing hub:
  - Manages the `currentUser` role state in `localStorage` (`engineer_user` vs `approver_user`).
  - Renders the `<Sidebar />` on the left.
  - Defines page routes:
    - `/dashboard` ➔ `<Dashboard />`
    - `/catalogue` ➔ `<Catalogue />`
    - `/approvals` ➔ `<Approvals />`
    - `/executions` ➔ `<Executions />`
* **What triggers it:** Rendered by `main.tsx`.
* **What it triggers:** Renders the active page matching the browser's current URL.

#### 6. `frontend/src/api.ts`
* **What it does:** Central Axios HTTP client. Uses an Axios request interceptor to automatically attach the active user from `localStorage` as the `X-Portal-User` header on every outgoing API request.
* **What triggers it:** Imported and called by all pages and components whenever they need backend data.
* **What it triggers:** Sends HTTP requests to backend endpoints via the Vite proxy.

#### 7. `frontend/src/types.ts`
* **What it does:** TypeScript interface definitions for data models: `AutomationItem`, `AutomationRequest`, `Execution`, `DashboardSummary`, `User`.
* **What triggers it:** Imported across React components for compile-time type safety.

#### 8. `frontend/src/components/Sidebar.tsx`
* **What it does:** Left navigation bar with links to Dashboard, Catalogue, Approvals, and Executions. Includes the **Active Role Selector Dropdown**, allowing instant switching between:
  - `engineer_user` (Requester)
  - `approver_user` (Designated Approver)
* **What triggers it:** Rendered inside `App.tsx`. User changes the role dropdown.
* **What it triggers:** Updates `localStorage.setItem('portal_user', user)` and fires a `portal_user_changed` event to update all open views.

#### 9. `frontend/src/components/StatusChip.tsx`
* **What it does:** Visual status badge component with distinct colors:
  - `PENDING_APPROVAL`: Amber
  - `APPROVED`: Emerald
  - `REJECTED`: Rose
  - `RUNNING`: Pulsing Indigo
  - `COMPLETED`: Emerald
  - `FAILED`: Red
* **What triggers it:** Rendered by Approvals and Executions tables to show request/run status.

#### 10. `frontend/src/components/RequestModal.tsx`
* **What it does:** The modal popup for submitting an automation request:
  - Displays fixed operation (`START` or `STOP`) as non-editable badge.
  - Enforces mandatory input for System ID (**SID**).
  - Dynamically renders inputs for required and optional parameters based on `automations.json`.
  - Submits payload via `POST /api/v1/requests`.
* **What triggers it:** Opened when user clicks "Configure & Request" on any catalogue card.
* **What it triggers:** Sends HTTP POST to backend to create a request, then notifies Catalogue page to refresh.

#### 11. `frontend/src/pages/Dashboard.tsx`
* **What it does:** Overview landing page:
  - Fetches and displays 5 operational KPI metrics (Total Requests, Pending Approvals, Running, Successful, Failed).
  - Displays the 4-step workflow guide.
  - Provides a 1-click shortcut button to **"New Request"**.
* **What triggers it:** User visits `http://localhost:5173/dashboard`.
* **What it triggers:** Calls `GET /api/v1/dashboard/summary` via `api.ts`.

#### 12. `frontend/src/pages/Catalogue.tsx`
* **What it does:** Catalogue browser:
  - Fetches the 10 predefined SAP/Oracle automations.
  - Offers category filters (`SAP HANA`, `SAP NetWeaver`, `Oracle Database`) and OS filters (`Linux`, `Windows`).
  - Displays cards with fixed action chips (`START` / `STOP`).
* **What triggers it:** User clicks "Catalogue" in the sidebar.
* **What it triggers:** Calls `GET /api/v1/automations`, and opens `<RequestModal />` when user selects an automation.

#### 13. `frontend/src/pages/Approvals.tsx`
* **What it does:** The **Approval Workbench**:
  - Displays pending and completed requests.
  - Shows an amber warning banner if the current user is not `approver_user`, with a 1-click **"Switch to Approver Role"** button.
  - Allows the approver to click **Approve** or **Reject**, enter an optional comment, and submit.
* **What triggers it:** User clicks "Approvals" in the sidebar.
* **What it triggers:**
  - Calls `GET /api/v1/requests` to load table.
  - Calls `POST /api/v1/requests/{id}/approve` or `reject` to execute decision.

#### 14. `frontend/src/pages/Executions.tsx`
* **What it does:** The **Execution Monitor**:
  - Lists all automation executions triggered by approved requests.
  - Displays workflow name, target SID, and real-time status.
  - Provides a **"Logs"** button to view execution stdout/stderr in a modal.
  - Provides a **"Sync"** button to refresh status from GitHub.
* **What triggers it:** User clicks "Executions" in the sidebar.
* **What it triggers:**
  - Calls `GET /api/v1/executions` to load history.
  - Calls `POST /api/v1/executions/{id}/sync` when user clicks Sync.

---

## 🔄 Section 2: What Triggers What? (Visual Trigger Map)

```
User Action: Open Browser (http://localhost:5173)
  └─▶ index.html loads main.tsx
        └─▶ main.tsx mounts App.tsx
              └─▶ App.tsx checks localStorage for 'portal_user'
                    ├─▶ Renders Sidebar.tsx
                    └─▶ Navigates to Dashboard.tsx
                          └─▶ Dashboard.tsx calls api.get('/api/v1/dashboard/summary')
                                └─▶ Vite proxy forwards to backend/main.py:8000
                                      └─▶ backend/database.py queries SQLite portal.db
                                            └─▶ Summary counts returned & displayed on UI

User Action: Submit Automation Request in Catalogue
  └─▶ User clicks "Configure & Request" on Catalogue.tsx
        └─▶ Opens RequestModal.tsx
              └─▶ User fills SID="HDB", Instance="00" & clicks "Submit Request"
                    └─▶ RequestModal.tsx calls api.post('/api/v1/requests')
                          └─▶ backend/main.py validates payload against schemas.py
                                └─▶ database.py inserts row into 'automation_requests' with status 'PENDING_APPROVAL'
                                      └─▶ Modal closes, Catalogue shows success banner

User Action: Approve Request in Approvals Workbench
  └─▶ Approver opens Approvals.tsx & clicks "Approve"
        └─▶ Approvals.tsx sends api.post('/api/v1/requests/{id}/approve')
              └─▶ backend/auth.py verifies X-Portal-User is 'approver_user'
                    ├─▶ IF NOT: Returns 403 "Permission Denied"
                    └─▶ IF YES:
                          ├─▶ database.py updates request status to 'APPROVED'
                          ├─▶ github_service.py dispatches GitHub Actions workflow (or simulation)
                          ├─▶ database.py creates execution row in 'executions' table with status 'RUNNING'
                          └─▶ Approvals table updates; execution visible in Executions tab
```

---

## 🚀 Section 3: The 4 Complete End-to-End Flows

### Flow 1: Application Boot & Database Initialization
1. Developer runs `uvicorn main:app --port 8000` in `backend/`.
2. Python executes `main.py`, which triggers the FastAPI `@asynccontextmanager lifespan`.
3. `main.py` calls `database.init_db()`.
4. SQLite checks for `portal.db`. If tables (`users`, `automation_requests`, `executions`, `audit_logs`) do not exist, SQLite creates them and seeds initial users (`engineer_user`, `approver_user`, `admin_user`).
5. Developer runs `npm run dev` in `frontend/`.
6. Vite starts the dev server on port `5173` and binds the `/api` proxy targeting `http://127.0.0.1:8000`.

---

### Flow 2: Creating an Automation Request
1. User opens `http://localhost:5173/catalogue`.
2. `Catalogue.tsx` calls `GET /api/v1/automations`.
3. Backend reads `automations.json` and sends back the list of 10 SAP & Oracle automations.
4. User selects **"HANA Start (Linux)"** and clicks **"Configure & Request"**.
5. `RequestModal.tsx` opens. User enters:
   - System ID (SID): `HDB`
   - Instance Number: `00`
6. User clicks **"Submit Request"**.
7. Frontend `api.post('/api/v1/requests', { automation_id: 'hana-linux-start', sid: 'HDB', parameters: { instance_number: '00' } })` is sent with header `X-Portal-User: engineer_user`.
8. Backend `main.py` receives the request:
   - Validates that `sid` is present and matches requirements.
   - Saves record in `automation_requests` table with `status = "PENDING_APPROVAL"`.
   - Logs an entry in `audit_logs`.
9. Modal closes and displays a confirmation message.

---

### Flow 3: Single Designated Approver Review
1. User navigates to `http://localhost:5173/approvals`.
2. `Approvals.tsx` calls `GET /api/v1/requests` and displays the pending request in the table.
3. If the user is currently `engineer_user`, they see a clear notice:
   *"Only the designated approver (approver_user) can approve requests."*
4. User clicks **"Switch to Approver Role"**.
   - `Sidebar.tsx` and `Approvals.tsx` update `localStorage['portal_user'] = 'approver_user'`.
5. User clicks the green **"Approve"** button.
6. A confirmation modal appears where the user can enter an optional comment (e.g. *"Approved for morning maintenance window"*).
7. User clicks **"Confirm APPROVE"**.
8. Frontend sends `POST /api/v1/requests/{id}/approve` with header `X-Portal-User: approver_user`.
9. Backend `auth.py` checks role:
   - `approver_user` has `role = "approver"` (authorized!).
10. Backend updates request `status = "APPROVED"`.
11. Backend immediately triggers **Flow 4 (Execution Dispatch)**.

---

### Flow 4: Automation Execution & Log Tracking
1. `backend/main.py` calls `github_service.dispatch_workflow(automation, sid, parameters, triggered_by)`.
2. **If `GITHUB_TOKEN` is configured:**
   - `github_service.py` sends `POST https://api.github.com/repos/{repo}/actions/workflows/{file}/dispatches` via `httpx`.
   - GitHub Actions runner picks up the job and executes the existing Ansible playbook in CI/CD.
3. **If `GITHUB_TOKEN` is blank (Simulation Mode):**
   - `github_service.py` creates a realistic simulated run with step-by-step console output (e.g. `[1/3] Pre-flight checks`, `[2/3] Executing Ansible playbook`, `[3/3] Target services operational`).
4. Backend creates a new record in the `executions` table with status `RUNNING`.
5. User opens `http://localhost:5173/executions`.
6. `Executions.tsx` lists the execution with a live status chip.
7. User clicks **"Logs"** to inspect run output in a clean terminal popup.
8. User clicks **"Sync"** to refresh execution status anytime.

---

## 🛡️ Section 4: Security & Role Model Summary

| Role Name | Header Value | Can Browse Catalogue? | Can Submit Requests? | Can Approve / Reject? | Can Trigger GitHub Actions? |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Requester (DevOps)** | `engineer_user` | ✅ Yes | ✅ Yes | ❌ **No (403 Forbidden)** | ❌ No |
| **Designated Approver** | `approver_user` | ✅ Yes | ✅ Yes | ✅ **Yes** | ✅ **Yes (Automatic)** |
| **Admin** | `admin_user` | ✅ Yes | ✅ Yes | ✅ **Yes** | ✅ **Yes** |

This separation ensures that production infrastructure actions (e.g. stopping an SAP HANA cluster) can never be triggered by an engineer alone without explicit sign-off from the designated approver.
