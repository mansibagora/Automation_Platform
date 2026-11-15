from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.services.auth import decode_jwt, get_user_by_id, get_user_by_username
from app.models import User
import uuid


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_dev_user: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Dev mode: X-Dev-User header
    if x_dev_user:
        user = await get_user_by_username(db, x_dev_user)
        if user:
            return user

    # Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        payload = decode_jwt(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = await get_user_by_id(db, uuid.UUID(user_id))
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")
