from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://localhost:5432/itsm_platform"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    secret_key: str = "itsm-dev-secret-key"
    github_token: Optional[str] = None
    github_repo: Optional[str] = None
    lock_timeout_minutes: int = 15
    automations_file: str = "automations.json"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), "extra": "ignore"}


settings = Settings()
