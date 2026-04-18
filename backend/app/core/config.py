from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )

    max_request_body_bytes: int = 8_500_000
    max_encrypted_payload_chars: int = 8_000_000
    max_file_bytes: int = 5_000_000
    max_expires_in_seconds: int = 2_592_000
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
