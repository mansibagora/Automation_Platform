import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    portal_port: int = 8010
    portal_db_path: str = "portal.db"
    github_token: Optional[str] = None
    github_repo: Optional[str] = None
    portal_secret_key: str = "portal-dev-secret-key"
    designated_approver: str = "approver_user"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), ".env"),
        "extra": "ignore"
    }


settings = Settings()
