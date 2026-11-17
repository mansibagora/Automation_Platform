# Pre-Deployment Code, Security & Architecture Audit Report

**Target System:** Lightweight Infrastructure Automation Portal  
**Branch:** `standalone-lightweight-portal`  
**Date of Assessment:** November 17, 2026  
**Auditor:** Automated Engineering & Security Assessment Harness  
**Final Status:** **READY FOR CLIENT HANDOVER** (with documented operational boundaries)

---

## 1. Executive Summary

A comprehensive pre-deployment audit was conducted on the **Lightweight Infrastructure Automation Portal**. The portal is designed as an independent, lightweight self-service platform enabling infrastructure engineers to request predefined SAP and Oracle automation workflows, requiring authorization from a single designated approver prior to triggering GitHub Actions CI/CD execution.

### Audit Scope:
- **Code Integrity & Architecture:** Preservation of lightweight design (zero Docker, Kubernetes, RabbitMQ, PostgreSQL, or Helix connectors).
- **Security & Authorization:** Injection analysis, access control, role segregation, secrets exposure, and supply-chain dependencies.
- **Input Validation & Data Flow:** Mandatory SID validation, parameter regex validation, and state machine integrity.
- **API & Frontend Synchronization:** Verification of API payloads, frontend rendering, and error handling.
- **Deployment Reproducibility:** Portability across client environments (macOS, Linux, Windows) without machine-specific dependencies.

---

## 2. Security Assessment & Threat Modeling

| Threat Category | Audit Finding | Risk Level | Status |
| :--- | :--- | :---: | :---: |
| **SQL Injection** | All database queries utilize parameterized placeholders (`?`). No dynamic string concatenation exists in SQL statements. | NONE | ✅ PASSED |
| **Command Injection** | No local shell commands (`subprocess`, `os.system`, `popen`) exist in the backend. Execution is exclusively dispatched via HTTP REST API calls to GitHub Actions. | NONE | ✅ PASSED |
| **Code Injection (eval/exec)** | No `eval()`, `exec()`, or dynamic code compilation exists in any application source files. | NONE | ✅ PASSED |
| **Hardcoded Secrets** | No private keys, production passwords, or GitHub personal access tokens are committed. Configuration uses `.env` with fallback to simulation mode. | NONE | ✅ PASSED |
| **Privilege Escalation** | Endpoints `/api/v1/requests/{id}/approve` and `/reject` enforce strict role verification (`user.role in ('approver', 'admin')`). Unauthorized requests return `403 Forbidden`. | NONE | ✅ PASSED |
| **CORS Policy** | Restricted to explicit origins configured via `CORS_ORIGINS` in `.env` (defaulting to local frontend dev ports). | LOW | ✅ PASSED |
| **State Tampering** | Immutable actions (`START` / `STOP`) are enforced at the backend catalogue layer; client payloads cannot alter the fixed operation. | NONE | ✅ PASSED |

---

## 3. Discovered Issues & Remediations Applied

During deep-dive audit testing, 4 issues were identified and remediated:

### Issue 1: Frontend Request Modal Parameter Mapping Crash (Resolved)
- **Finding:** In `frontend/src/components/RequestModal.tsx`, dynamic inputs were accessed via `automation.inputs.required`, whereas the backend API returns `required_inputs` and `optional_inputs` directly per `schemas.py`. Opening the modal could throw a `TypeError: Cannot read properties of undefined`.
- **Remediation:** Updated `RequestModal.tsx` to safely normalize input definitions (`automation.required_inputs || automation.inputs?.required || []`) and updated `frontend/src/types.ts` to support both structures.
- **Verification:** Modal renders all required and optional parameters (e.g. `instance_number`, `target_host`) without runtime exceptions.

### Issue 2: Execution Property Field Mismatch in Executions View (Resolved)
- **Finding:** In `frontend/src/pages/Executions.tsx`, the table rendered properties `github_workflow`, `triggered_by`, `triggered_at`, and `execution_logs`, whereas `backend/schemas.py` returned `workflow_file`, `reviewed_by`, `dispatched_at`, and `log_summary`. This caused dates to display as `Invalid Date` and logs to appear blank.
- **Remediation:** 
  1. Added computed alias fields (`github_workflow`, `triggered_by`, `triggered_at`, `execution_logs`) to `ExecutionOut` in `backend/schemas.py` and populated them in `backend/main.py`.
  2. Added defensive fallback getters (`getWorkflowName`, `getTriggeredBy`, `getFormattedDate`, `getExecutionLogs`) in `frontend/src/pages/Executions.tsx`.
- **Verification:** Execution history displays accurate dates, workflow filenames, operator identities, and log summaries.

### Issue 3: Configuration Default Port Inconsistency (Resolved)
- **Finding:** `backend/.env.example` had `PORTAL_PORT=8010` while `backend/.env`, `vite.config.ts`, `HOW_TO_RUN.md`, and documentation specified `PORTAL_PORT=8000`.
- **Remediation:** Synchronized `PORTAL_PORT=8000` across `backend/.env.example` and created root `.env.example`.
- **Verification:** A fresh checkout correctly points to port `8000`.

### Issue 4: Missing Root `.gitignore` and Tracked Bytecode Binaries (Resolved)
- **Finding:** The repository lacked a root `.gitignore`, leading to Python bytecode (`.pyc`) files being committed.
- **Remediation:** Created root `.gitignore` covering Python cache, node modules, build artifacts, and OS files; untracked compiled `.pyc` files from git index.
- **Verification:** Clean working tree without compiled bytecode pollution.

---

## 4. Automated Testing & Quality Assurance

### Backend Automated Test Suite (`pytest`):
```
tests/test_portal.py::test_health_check[asyncio] PASSED                  [  9%]
tests/test_portal.py::test_automation_catalogue[asyncio] PASSED          [ 18%]
tests/test_portal.py::test_submit_missing_sid[asyncio] PASSED            [ 27%]
tests/test_portal.py::test_submit_missing_required_parameter[asyncio] PASSED [ 36%]
tests/test_portal.py::test_submit_valid_request[asyncio] PASSED          [ 45%]
tests/test_portal.py::test_unauthorized_approval_denied[asyncio] PASSED  [ 54%]
tests/test_portal.py::test_approver_can_reject_request[asyncio] PASSED   [ 63%]
tests/test_portal.py::test_approver_can_approve_and_trigger_workflow[asyncio] PASSED [ 72%]
tests/test_portal.py::test_duplicate_approval_prevented[asyncio] PASSED  [ 81%]
tests/test_portal.py::test_execution_status_sync[asyncio] PASSED         [ 90%]
tests/test_portal.py::test_dashboard_summary[asyncio] PASSED             [100%]

============================== 11 passed in 0.21s ==============================
```
- **Passed:** 11
- **Failed:** 0
- **Coverage:** Health, Catalogue, Validation, Role Enforcement, Workflow Triggering, Concurrency/Duplicate Prevention, Execution Sync, Dashboard Metrics.

### Frontend Production Build (`npm run build`):
- **TypeScript:** Strict type checking passed (`tsc -b`).
- **Vite Bundler:** Built production bundle in 181ms.
- **Errors / Warnings:** 0 errors.

---

## 5. Architectural Compliance Verification

| Architectural Directive | Verification Result |
| :--- | :--- |
| **No Docker / Kubernetes** | Verified: Application runs natively on Python virtual environment and Node.js. |
| **No RabbitMQ / Message Queues** | Verified: Synchronous direct execution dispatch via HTTPX; zero broker dependencies. |
| **No PostgreSQL / External DB** | Verified: Embedded SQLite database (`portal.db`) with zero external service requirements. |
| **No Direct Ansible Execution** | Verified: Dispatches directly to GitHub Actions CI/CD; no local playbook CLI executions on the application host. |
| **Immutable Predefined Operations** | Verified: 10 SAP & Oracle automations strictly enforce fixed `START` or `STOP` operations. |
| **Single Designated Approver** | Verified: Segregation of duties enforced between `engineer_user` (requester) and `approver_user` (approver). |

---

## 6. Documented Limitations & Operational Boundaries

1. **Single-Node Persistence (SQLite):**
   - The portal uses SQLite in WAL mode, ideal for team self-service portals and internal automation. It is not intended as a multi-region distributed active-active database.
2. **Designated Approver Model:**
   - Designed for single-approver workflow approval gates. Multi-stage hierarchical approvals (e.g., Level 1 + Level 2 CAB review) are outside the scope of this lightweight portal.
3. **Simulation Mode Fallback:**
   - When `GITHUB_TOKEN` is unset in `backend/.env`, the backend operates in simulation mode. This enables demonstration of the full approval and execution lifecycle without live GitHub credentials.

---

## 7. Final Audit Conclusion

The application has been verified to be robust, secure, and reproducible. All identified edge cases and contract discrepancies have been resolved and validated through automated testing and production builds.

**Audit Verdict:** **READY FOR CLIENT HANDOVER**
