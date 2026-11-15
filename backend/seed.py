"""
Seed script: populates database with initial users, tickets, automation maps, and audit logs.
Run with: python seed.py
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.database import async_session, engine, Base
from app.models import User, Ticket, AutomationMap, ExecutionLog, AuditLog
from app.services.auth import hash_token


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # --- Users ---
        users_data = [
            {"username": "admin_user", "email": "admin@itsm.local", "role": "admin", "token": "admin123"},
            {"username": "approver_user", "email": "approver@itsm.local", "role": "approver", "token": "approver123"},
            {"username": "svc_itsm", "email": "svc@itsm.local", "role": "service_account", "token": "svc123"},
        ]
        user_ids = {}
        for ud in users_data:
            user = User(
                id=uuid.uuid4(),
                username=ud["username"],
                email=ud["email"],
                role=ud["role"],
                hashed_token=hash_token(ud["token"]),
            )
            db.add(user)
            user_ids[ud["username"]] = user.id

        # --- Tickets ---
        now = datetime.now(timezone.utc)
        statuses = ["PENDING", "LOCKED", "COMPLETED", "DENIED", "FAILED"]
        categories = ["AWS Access", "VPN Access", "Server Provisioning", "Password Reset", "AWS Access"]
        tickets = []
        for i, (status, category) in enumerate(zip(statuses, categories)):
            ticket = Ticket(
                id=uuid.uuid4(),
                ticket_no=f"RITM{1098896 + i}",
                type="SR" if i < 3 else ("CR" if i == 3 else "INC"),
                status=status,
                assignment_group="IT - Cloud Administration - CTO",
                created_by=["John Smith", "Jane Doe", "Bob Johnson", "Alice Williams", "Charlie Brown"][i],
                created_at=now - timedelta(days=5 - i),
                updated_at=now - timedelta(days=5 - i, hours=-i),
                payload={
                    "category": category,
                    "SOURCE": "ServiceNow",
                    "RITM": f"RITM{1098896 + i}",
                    "AWSAccountNumbers": f"{100000000000 + i * 111111111}",
                    "UserName": f"user_{1000 + i}",
                    "Key": f"key-{uuid.uuid4().hex[:8]}",
                    "AccessType": ["ReadOnly", "Admin", "PowerUser", "ReadOnly", "Admin"][i],
                    "catalog_item": f"{category} Request",
                    "description": f"Request for {category.lower()} access",
                    "impact": ["Low", "Medium", "High", "Low", "Medium"][i],
                    "priority": ["3 - Medium", "2 - High", "1 - Critical", "4 - Low", "2 - High"][i],
                    "opened_by": ["John Smith", "Jane Doe", "Bob Johnson", "Alice Williams", "Charlie Brown"][i],
                    "requested_for": ["Alice Williams", "John Smith", "Jane Doe", "Bob Johnson", "Charlie Brown"][i],
                    "assigned_to": "Admin User",
                },
                source="mock_helix",
                correlation_id=f"corr-seed-{uuid.uuid4().hex[:8]}",
                locked_by_user_id=user_ids["admin_user"] if status == "LOCKED" else None,
                locked_at=now if status == "LOCKED" else None,
            )
            db.add(ticket)
            tickets.append(ticket)

        # --- Automation Maps ---
        automations = [
            {"name": "AWS Access Automation", "condition_json": {"category": "AWS Access"},
             "target_engine": "github_actions", "target_identifier": "aws-access.yml"},
            {"name": "VPN Access Automation", "condition_json": {"category": "VPN Access"},
             "target_engine": "mock", "target_identifier": "vpn_access_workflow"},
            {"name": "Server Provisioning", "condition_json": {"category": "Server Provisioning"},
             "target_engine": "ansible", "target_identifier": "provision_server.yml"},
        ]
        for am in automations:
            db.add(AutomationMap(id=uuid.uuid4(), **am))

        # --- Execution Logs for COMPLETED and FAILED tickets ---
        for ticket in tickets:
            if ticket.status in ("COMPLETED", "FAILED"):
                db.add(ExecutionLog(
                    id=uuid.uuid4(),
                    ticket_id=ticket.id,
                    engine="mock",
                    target_identifier="mock_workflow",
                    status=ticket.status,
                    external_job_id=f"mock-{uuid.uuid4().hex[:8]}",
                    input_parameters=ticket.payload,
                    output_log=f"Mock execution {'succeeded' if ticket.status == 'COMPLETED' else 'failed'}",
                    started_at=ticket.created_at,
                    completed_at=ticket.updated_at,
                    retry_count=1 if ticket.status == "FAILED" else 0,
                ))

        # --- Audit Logs ---
        for ticket in tickets:
            db.add(AuditLog(
                id=uuid.uuid4(),
                ticket_id=ticket.id,
                user_id=user_ids["svc_itsm"],
                action="TICKET_RECEIVED",
                previous_state=None,
                new_state="PENDING",
                timestamp=ticket.created_at,
                metadata_={"source": ticket.source},
            ))
            if ticket.status != "PENDING":
                db.add(AuditLog(
                    id=uuid.uuid4(),
                    ticket_id=ticket.id,
                    user_id=user_ids["admin_user"],
                    action=f"TICKET_{ticket.status}",
                    previous_state="PENDING",
                    new_state=ticket.status,
                    timestamp=ticket.updated_at,
                    metadata_={"seeded": True},
                ))

        await db.commit()
        print(f"✅ Seeded {len(users_data)} users, {len(tickets)} tickets, {len(automations)} automation maps")
        print("   Users: admin_user/admin123, approver_user/approver123, svc_itsm/svc123")


if __name__ == "__main__":
    asyncio.run(seed())
