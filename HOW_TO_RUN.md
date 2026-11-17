# How to Run the Infrastructure Automation Portal (Easy 3-Minute Guide)

This guide shows you how to run the portal on any machine (macOS, Linux, or Windows).

---

## ⚡ Quick 30-Second Overview

The portal has two simple parts:
1. **Backend (Python FastAPI)**: Runs on port `8000`. Handles requests, approvals, and GitHub dispatch. Stores data in a single local file (`portal.db`).
2. **Frontend (React Vite)**: Runs on port `5173`. Beautiful user interface with Dashboard, Catalogue, Approvals, and Executions.

**No Docker, No Kubernetes, No external database setup required.**

---

## 📋 What You Need Installed
- **Git**
- **Python 3.10+**
- **Node.js 18+**

Check with:
```bash
git --version
python3 --version
node -v
```

---

## 🚀 Step-by-Step Instructions

### Step 1: Open Terminal 1 & Start the Backend

1. Go to the project root and ensure you are on the `standalone-lightweight-portal` branch:
   ```bash
   git checkout standalone-lightweight-portal
   ```

2. Go into `backend` and create your Python environment:
   ```bash
   cd backend
   python3 -m venv .venv
   ```

3. Activate your virtual environment:
   - **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```
   - **Windows:**
     ```powershell
     .venv\Scripts\activate
     ```

4. Install the 5 required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the backend:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

✅ **Done!** You will see:
`Uvicorn running on http://0.0.0.0:8000`

---

### Step 2: Open Terminal 2 & Start the Frontend

Open a **new terminal window** in the same project:

1. Go into the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

✅ **Done!** You will see:
`➜ Local: http://localhost:5173/`

---

### Step 3: Open in Your Browser

Open your browser and visit:
👉 **[http://localhost:5173](http://localhost:5173)**

API Documentation (Swagger) is available at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 🎯 Quick 3-Step Test Run in the UI

1. **Submit a Request (as Engineer):**
   - Click **"Catalogue"** in the left menu.
   - Choose **HANA Start** (or any SAP/Oracle automation) and click **"Configure & Request"**.
   - Type `HDB` as the System ID (SID) and instance number `00`.
   - Click **"Submit Request"**.

2. **Approve the Request (as Approver):**
   - Click **"Approvals"** in the left menu.
   - Click the green **"Switch to Approver Role"** button (or change the dropdown in the sidebar to `approver_user`).
   - Click **"Approve"** on your pending request, then click **"Confirm APPROVE"**.

3. **Watch the Execution:**
   - Click **"Executions"** in the left menu.
   - You will see the execution start (`RUNNING`), generate logs, and complete (`COMPLETED`).
   - Click **"Logs"** to inspect run output.

---

## ⚙️ Configuration: Demo Mode vs. Real GitHub

- **Default (Demo / Simulation Mode):**  
  Works out-of-the-box with **zero configuration**. You can test requests, approvals, and simulated executions immediately.

- **To Connect to Real GitHub Actions Workflows:**  
  Open `backend/.env` and enter your GitHub details:
  ```env
  GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
  GITHUB_REPO=your-username/your-ansible-repo
  ```
  Restart the backend terminal (`CTRL+C`, then `uvicorn main:app --host 0.0.0.0 --port 8000`). Now, approving a request triggers a real GitHub Actions workflow!

---

## 📖 Need to Know How Every File Works?
Check out **[FILES_AND_FLOW.md](FILES_AND_FLOW.md)** for a file-by-file explanation of what triggers what.
