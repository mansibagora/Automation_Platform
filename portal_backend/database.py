import sqlite3
import os
import json
from datetime import datetime, timezone
from portal_backend.config import settings

DB_FILE = os.path.join(os.path.dirname(__file__), settings.portal_db_path)


def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS automation_requests (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL,
        automation_name TEXT NOT NULL,
        category TEXT NOT NULL,
        os TEXT NOT NULL,
        action TEXT NOT NULL,
        sid TEXT NOT NULL,
        parameters_json TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        reviewed_by TEXT,
        reviewed_at TEXT,
        review_comment TEXT,
        execution_id TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        automation_id TEXT NOT NULL,
        workflow_file TEXT NOT NULL,
        git_ref TEXT NOT NULL,
        status TEXT NOT NULL,
        github_run_id TEXT,
        github_run_url TEXT,
        dispatched_at TEXT NOT NULL,
        completed_at TEXT,
        log_summary TEXT,
        FOREIGN KEY (request_id) REFERENCES automation_requests(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT,
        user TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
    );
    """)

    cursor.execute("SELECT count(*) FROM users;")
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute("INSERT INTO users VALUES ('engineer_user', 'DevOps Engineer', 'requester', 'dev123')")
        cursor.execute("INSERT INTO users VALUES ('approver_user', 'Infrastructure Lead', 'approver', 'app123')")
        cursor.execute("INSERT INTO users VALUES ('admin_user', 'Portal Admin', 'admin', 'admin123')")

    conn.commit()
    conn.close()


def log_audit(request_id: str | None, user: str, action: str, details: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO audit_logs (request_id, user, action, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        (request_id, user, action, details, datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()
