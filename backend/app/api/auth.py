from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse, UserOut
from app.services.auth import authenticate_user, create_jwt, decode_jwt, get_user_by_id, get_user_by_username
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, req.username, req.token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(str(user.id), user.username, user.role)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
