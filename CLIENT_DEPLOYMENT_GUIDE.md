# Client Deployment & Production Administration Guide

This guide provides end-to-end instructions for deploying, configuring, and operating the **Lightweight Infrastructure Automation Portal** in customer production and on-premise environments.

---

## 1. System Requirements & Architecture Overview

The portal runs directly on the local operating system without requiring Docker, Kubernetes, RabbitMQ, or external database clusters.

### Recommended System Specifications:
- **Operating System:** Linux (Ubuntu 20.04+, RHEL 8+, Rocky Linux 8+, Debian 11+), macOS 12+, or Windows Server 2019+
- **CPU:** 2 vCPU minimum
- **RAM:** 2 GB minimum (4 GB recommended)
- **Disk:** 10 GB free space
- **Runtimes:**
  - **Python:** 3.10, 3.11, 3.12, or 3.13 (with `python3-venv` and `pip`)
  - **Node.js:** 18.x, 20.x, or 22.x LTS (with `npm`)

### Network & Firewall Requirements:
- **Inbound:** Port `8000` (Backend API) and Port `5173` (Frontend) or Port `80`/`443` if using Nginx reverse proxy.
- **Outbound:** HTTPS (Port `443`) to `api.github.com` (required only if triggering live GitHub Actions CI/CD workflows).

---

## 2. Source Code Installation

Clone the repository and checkout the standalone lightweight branch:

```bash
git clone https://github.com/mansibagora/Automation_Platform.git
cd Automation_Platform
git checkout standalone-lightweight-portal
```

---

## 3. Backend Deployment

### Step 3.1: Python Virtual Environment & Dependencies
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3.2: Environment Configuration
Copy the configuration template:
```bash
cp .env.example .env
```

Edit `backend/.env` to configure your environment:
```env
# Server Port (Default: 8000)
PORTAL_PORT=8000

# SQLite Database File Path
PORTAL_DB_PATH=portal.db

# GitHub Actions Integration (Optional - leave blank for simulated demo mode)
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
GITHUB_REPO=your-organization/your-ansible-repo

# Application Security
PORTAL_SECRET_KEY=generate_a_secure_random_string_here

# Single Designated Approver Identity (Must match user role in users table)
DESIGNATED_APPROVER=approver_user

# Allowed CORS Origins (comma-separated URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:8000,http://your-server-ip:5173
```

---

## 4. GitHub Actions CI/CD Integration Setup

If connecting to your real GitHub repository where existing Ansible playbooks reside:

1. **Generate a GitHub Personal Access Token:**
   - In GitHub, navigate to **Settings** ➔ **Developer settings** ➔ **Personal access tokens** ➔ **Tokens (classic)**.
   - Click **Generate new token**.
   - Select the **`repo`** (or **`workflow`**) scope.
   - Copy the generated token (`ghp_...`).
2. **Set Repository & Token in `backend/.env`:**
   ```env
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   GITHUB_REPO=my-company/ansible-infrastructure
   ```
3. **Verify GitHub Workflows Exist:**
   Ensure the workflow files listed in `backend/automations.json` (e.g. `hana_start.yml`, `sap_start_linux.yml`, `oracle_start_linux.yml`) exist under `.github/workflows/` in that repository and define `workflow_dispatch` triggers.

> **Note on Simulated Mode:** If `GITHUB_TOKEN` is left empty, the portal automatically functions in realistic simulation mode, allowing complete validation of the approval lifecycle and log viewing without GitHub credentials.

---

## 5. Frontend Deployment & Production Build

### Step 5.1: Install Dependencies
```bash
cd ../frontend
npm install
```

### Step 5.2: Build Static Production Assets
```bash
npm run build
```
The compiled, production-ready static assets are generated in `frontend/dist/`.

---

## 6. Production Process Management (Recommended Linux Setup)

For enterprise production deployments, configure **systemd** service units to run the backend and frontend automatically on system boot.

### Option A: Systemd Backend Service (`/etc/systemd/system/portal-backend.service`)
```ini
[Unit]
Description=Lightweight Infrastructure Automation Portal - Backend API
After=network.target

[Service]
Type=simple
User=portaluser
WorkingDirectory=/opt/Automation_Platform/backend
Environment="PATH=/opt/Automation_Platform/backend/.venv/bin:/usr/bin"
EnvironmentFile=/opt/Automation_Platform/backend/.env
ExecStart=/opt/Automation_Platform/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the backend:
```bash
sudo systemctl daemon-reload
sudo systemctl enable portal-backend
sudo systemctl start portal-backend
```

### Option B: Nginx Reverse Proxy with HTTPS (Recommended)
Configure Nginx to serve the frontend static files and proxy `/api` calls to the backend:

```nginx
server {
    listen 80;
    server_name portal.internal.company.com;

    # Serve compiled frontend React SPA
    root /opt/Automation_Platform/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API and Health endpoints to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

---

## 7. Database Persistence & Backup

The application persists all requests, executions, and audit records in **`backend/portal.db`** (SQLite).

### Creating an Online Backup:
SQLite supports hot backups without stopping the service:
```bash
sqlite3 /opt/Automation_Platform/backend/portal.db ".backup '/var/backups/portal_$(date +%Y%m%d_%H%M%S).db'"
```

### Automated Daily Cron Job:
Add to `crontab -e`:
```cron
0 2 * * * sqlite3 /opt/Automation_Platform/backend/portal.db ".backup '/var/backups/portal_$(date +\%Y\%m\%d).db'"
```

---

## 8. Verification & Smoke Testing

Run the following checks to confirm operational health:

```bash
# 1. Health Probe
curl -i http://localhost:8000/health
# Expected: HTTP 200 OK {"status":"ok","service":"lightweight-automation-portal"}

# 2. Catalogue API Probe
curl -s http://localhost:8000/api/v1/automations | grep "hana-linux-start"

# 3. Automated Test Suite Run
cd /opt/Automation_Platform/backend
PYTHONPATH=. .venv/bin/pytest tests/test_portal.py -v
```

---

## 9. Security Best Practices

1. **Never commit `.env` with live GitHub credentials.** Keep `.env` strictly local or managed via secret managers (Vault, AWS Secrets Manager, etc.).
2. **Rotate `PORTAL_SECRET_KEY`** before opening the portal to internal networks.
3. **Restrict Approver Role:** In `backend/database.py` (or through the database), ensure only authorized infrastructure team leads are granted the `approver` role.
4. **Use HTTPS:** In enterprise environments, always terminate SSL/TLS via Nginx, Traefik, or an AWS Application Load Balancer.
