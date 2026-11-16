# Step-by-Step Guide: Running the Infrastructure Automation Portal in Customer Environment

This guide explains how to deploy and run the **standalone lightweight portal** on any customer machine from scratch.

> **Zero Complex Infrastructure Required:**  
> - ❌ No Docker or Kubernetes  
> - ❌ No PostgreSQL database setup  
> - ❌ No RabbitMQ message queues  
> - ❌ No AI agents or code generation  
> 
> The portal runs directly on the local operating system using a lightweight Python backend (with embedded SQLite) and a clean React frontend.

---

## 1. Prerequisites on the Customer Machine

Ensure the target machine has the following installed:
1. **Git**
2. **Python 3.10+** (with `pip`)
3. **Node.js 18+** (with `npm`)

Verify your installations:
```bash
git --version
python3 --version
node -v
npm -v
```

---

## 2. Step 1: Clone the Repository & Checkout Branch

Open your terminal on the customer machine:

```bash
# Clone the repository
git clone https://github.com/mansibagora/Automation_Platform.git
cd Automation_Platform

# Switch to the standalone lightweight branch
git checkout standalone-lightweight-portal
```

---

## 3. Step 2: Setup & Start Backend (Terminal 1)

In your first terminal:

```bash
# Navigate to the backend directory
cd backend

# Create a clean Python virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On Linux / macOS:
source .venv/bin/activate
# On Windows (cmd/powershell):
# .venv\Scripts\activate

# Install the minimal Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```

### What happens automatically:
- The backend starts serving on `http://localhost:8000`.
- The SQLite database (`portal.db`) is automatically initialized if it doesn't already exist.
- Predefined SAP & Oracle automations are loaded from `automations.json`.
- Interactive API documentation becomes available at `http://localhost:8000/docs`.

---

## 4. Step 3: Setup & Start Frontend (Terminal 2)

Open a **second, separate terminal window** on the same machine:

```bash
# Navigate to the frontend directory
cd Automation_Platform/frontend

# Install node dependencies
npm install

# Start the development server
npm run dev
```

The terminal will confirm:
```
  VITE v8.3.8  ready in 180 ms

  ➜  Local:   http://localhost:5173/
```

---

## 5. Step 4: Open in Web Browser

Open any modern browser (Chrome, Edge, Firefox, Safari) and navigate to:
👉 **`http://localhost:5173`**

---

## 6. Step 5: How to Use the Portal (Demonstration Walkthrough)

### 1. Submit a Request (as Engineer / Requester)
- Click **"Catalogue"** in the left sidebar.
- Choose any automation (e.g. **HANA Start** on Linux or **Oracle Stop** on Windows).
- Click **"Configure & Request"**.
- Enter your mandatory **SID** (e.g., `HDB`) and required instance number.
- Click **"Submit Request"**.
- Your request is now in `PENDING_APPROVAL` status.

### 2. Approve the Request (as Designated Approver)
- Click **"Approvals"** in the left sidebar.
- Look at the sidebar or the banner: switch your role to **"Designated Approver (approver_user)"**.
- Click the green **"Approve"** button next to the pending request.
- Add an optional review comment and click **"Confirm APPROVE"**.
- The request transitions to `APPROVED` and immediately dispatches the automation workflow.

### 3. Monitor Execution
- Click **"Executions"** in the left sidebar.
- View real-time status (`QUEUED` → `RUNNING` → `COMPLETED`).
- Click **"Logs"** to inspect run output.
- Click **"Sync"** to refresh status directly from GitHub.

---

## 7. Configuration: Simulated Mode vs. Live GitHub Actions

### Default (Simulated Mode - Out of the Box):
If you do not set any GitHub tokens, the portal runs in **Realistic Simulation Mode**. You can immediately demonstrate the entire end-to-end lifecycle (requesting, approving, execution logs, and audit trails) with zero external setup or credentials.

### Live GitHub Actions Mode (Connecting to Real Repository):
To trigger actual GitHub Actions workflows running your Ansible playbooks:
1. Open `backend/.env` in a text editor:
   ```env
   PORTAL_PORT=8000
   PORTAL_DB_PATH=portal.db
   GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
   GITHUB_REPO=your-github-org-or-username/your-ansible-repo
   PORTAL_SECRET_KEY=portal-dev-secret-key-change-in-production
   DESIGNATED_APPROVER=approver_user
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
   ```
2. Restart the backend terminal (`CTRL+C`, then re-run `uvicorn main:app --host 0.0.0.0 --port 8000`).
3. Approvals will now trigger real `workflow_dispatch` events in your GitHub Actions pipeline!
