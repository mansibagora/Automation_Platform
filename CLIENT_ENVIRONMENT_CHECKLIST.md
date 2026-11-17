# Client Environment Configuration Checklist: What to Check & Update

This checklist contains everything you need to review and configure before running or handing over the **Lightweight Infrastructure Automation Portal** in a customer's environment.

---

## 📋 Quick Configuration Summary Matrix

| Setting | Configuration File | Current / Default Value | What to Update For Client |
| :--- | :--- | :--- | :--- |
| **GitHub Repository** | `backend/.env` | `GITHUB_REPO=` | Client's repo: `organization/repo-name` |
| **GitHub Access Token** | `backend/.env` | `GITHUB_TOKEN=` | Personal Access Token with `repo` scope |
| **Workflow Filenames** | `backend/automations.json` | e.g. `hana_start.yml` | Verify matches `.github/workflows/*.yml` |
| **Git Branch Reference** | `backend/automations.json` | `"main"` | Update if client uses `master` or `prod` |
| **Backend Server Port** | `backend/.env` | `PORTAL_PORT=8000` | Change if port 8000 is occupied (e.g. 8080) |
| **Frontend Proxy Port** | `frontend/vite.config.ts` | `http://127.0.0.1:8000` | Update if backend port was changed |
| **Allowed CORS Domains** | `backend/.env` | `http://localhost:5173,...` | Add client internal IP or hostname |
| **Portal Secret Key** | `backend/.env` | `portal-dev-secret-key...` | Generate a secure random string |
| **Designated Approver** | `backend/.env` | `approver_user` | Lead approver's username |
| **Initial User Passwords** | `backend/database.py` | `dev123`, `app123`, `admin123` | Change for customer production |

---

## 🔍 Detailed Step-by-Step Checklist

### 1. GitHub CI/CD Connection (in `backend/.env`)

Open `backend/.env` on the client machine:

#### A. Set `GITHUB_REPO`
* **Default:** `GITHUB_REPO=` (empty)
* **What to set:** The client's GitHub repository where their Ansible playbooks and workflow files reside.
* **Format:** `org-name/repo-name` or `username/repo-name`  
  *(Example: `acme-corp/sap-ansible-automation`)*

#### B. Set `GITHUB_TOKEN`
* **Default:** `GITHUB_TOKEN=` (empty)
* **What to set:** A GitHub Personal Access Token (PAT).
* **How to create:**
  1. In GitHub, go to **Settings** ➔ **Developer settings** ➔ **Personal access tokens** ➔ **Tokens (classic)**.
  2. Click **Generate new token**.
  3. Select the **`repo`** (or **`workflow`**) scope.
  4. Paste the token into `backend/.env`:
     ```env
     GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```
* **Simulation Mode Note:** If `GITHUB_TOKEN` is left empty, the portal runs in **safe simulation mode** (ideal for offline demos or dry runs).

#### C. Match Workflow Filenames & Branch (in `backend/automations.json`)
Open `backend/automations.json` and verify:
1. **Workflow Filenames:** The `workflow_file` value for each automation must match the exact YAML filename inside `.github/workflows/` in the client's repository:
   - `hana_start.yml` / `hana_stop.yml`
   - `sap_start_linux.yml` / `sap_stop_linux.yml`
   - `sap_start_windows.yml` / `sap_stop_windows.yml`
   - `oracle_start_linux.yml` / `oracle_stop_linux.yml`
   - `oracle_start_windows.yml` / `oracle_stop_windows.yml`
2. **Git Branch:** Each automation has `"git_ref": "main"`. If the client repository's default branch is `master` or `production`, update `"git_ref"` accordingly.

---

### 2. Network Ports, CORS & Firewall

#### A. Backend Port (`PORTAL_PORT`)
* **Default:** `PORTAL_PORT=8000` (in `backend/.env`).
* **Check:** Ensure port `8000` is free. If occupied, set another port (e.g. `PORTAL_PORT=8080`).
* **Important:** If you change the backend port, also update `frontend/vite.config.ts`:
  ```ts
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8080',  // Match your new port
      changeOrigin: true,
    },
    ...
  }
  ```

#### B. CORS Allowed Origins (`CORS_ORIGINS`)
* **Default:** `CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000`
* **When to update:** If users access the portal over the company network via an IP address or internal domain, add the client's URL:
  ```env
  CORS_ORIGINS=http://localhost:5173,http://192.168.1.50:5173,http://automation.client-corp.internal
  ```

#### C. Outbound Firewall Rule
* The host running the backend requires **outbound HTTPS access on port 443** to `https://api.github.com` so HTTPX can call GitHub Actions APIs.

---

### 3. Application Security & Credentials

#### A. Change `PORTAL_SECRET_KEY`
* **Default:** `portal-dev-secret-key-change-in-production`
* **Update to:** A secure random secret string:
  ```bash
  # Generate on Linux/macOS:
  openssl rand -hex 32
  ```
  Paste the output into `backend/.env`:
  ```env
  PORTAL_SECRET_KEY=9f83b2a7c41e8d05267bf0134a98e21f...
  ```

#### B. Designated Approver Identity
* **Default:** `DESIGNATED_APPROVER=approver_user`
* **Purpose:** Only this username (or a user with role `approver` or `admin`) can approve requests.

#### C. User Accounts & Passwords
* **Default seeded accounts (in `backend/database.py`):**
  - **Requester:** `engineer_user` (password: `dev123`)
  - **Approver:** `approver_user` (password: `app123`)
  - **Admin:** `admin_user` (password: `admin123`)
* **Client Handover Action:** For client production, change default passwords or add team members directly to the SQLite `users` table in `backend/portal.db`.

---

### 4. Pre-Flight Verification Checklist (Smoke Test)

Run these 4 quick commands on the client machine to confirm everything is operational:

```bash
# 1. Check Backend Health
curl -s http://localhost:8000/health
# Expected Output: {"status":"ok","service":"lightweight-automation-portal"}

# 2. Check Catalogue Loading
curl -s http://localhost:8000/api/v1/automations | grep "hana-linux-start"
# Expected: Returns the JSON automation catalogue

# 3. Run Automated Pytest Suite
cd backend
PYTHONPATH=. .venv/bin/pytest tests/test_portal.py -v
# Expected: 11 passed in ~0.20s

# 4. Verify Frontend Production Build
cd ../frontend
npm run build
# Expected: built in ~200ms with 0 errors
```
