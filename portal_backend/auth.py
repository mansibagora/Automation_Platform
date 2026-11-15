from fastapi import Header, HTTPException
from typing import Optional
from portal_backend.database import get_db
from portal_backend.schemas import UserOut


def get_current_user(
    x_portal_user: Optional[str] = Header(None, alias="X-Portal-User"),
    authorization: Optional[str] = Header(None)
) -> UserOut:
    username = x_portal_user
    if not username and authorization and authorization.startswith("Bearer "):
        username = authorization.replace("Bearer ", "").strip()

    if not username:
        username = "engineer_user"  # Safe default for local MVP dev

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username, name, role FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail=f"User '{username}' not found")

    return UserOut(username=row["username"], name=row["name"], role=row["role"])


def require_approver(current_user: UserOut = Header(...)):
    if current_user.role not in ("approver", "admin"):
        raise HTTPException(status_code=403, detail="Only designated approver can perform this action")
    return current_user
