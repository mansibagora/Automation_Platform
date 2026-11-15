from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models import User
from app.config import settings
import bcrypt
from jose import jwt, JWTError
import uuid

ALGORITHM = "HS256"


def hash_token(token: str) -> str:
    pwd_bytes = token.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_token(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str, username: str, role: str) -> str:
    return jwt.encode({"sub": str(user_id), "username": username, "role": role}, settings.secret_key, algorithm=ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None


async def authenticate_user(db: AsyncSession, username: str, token: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username, User.active == True))
    user = result.scalar_one_or_none()
    if user and verify_token(token, user.hashed_token):
        return user
    return None


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()
