from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.core.config import settings


class CreateShareRequest(BaseModel):
    type: Literal["text", "file"]
    encrypted_payload: str = Field(
        min_length=1,
        max_length=settings.max_encrypted_payload_chars,
    )
    file_name: str | None = Field(default=None, min_length=1, max_length=255)
    file_size: int | None = Field(default=None, ge=0, le=settings.max_file_bytes)
    mime_type: str | None = Field(default=None, max_length=255)
    expires_in: int = Field(gt=0, le=settings.max_expires_in_seconds)
    burn_after_read: bool = False

    @model_validator(mode="after")
    def validate_shape(self) -> "CreateShareRequest":
        if self.type == "text":
            if self.file_name is not None or self.file_size is not None:
                raise ValueError("Text shares must not include file_name or file_size")
            if self.mime_type is not None:
                raise ValueError("Text shares must not include mime_type")

        if self.type == "file":
            if self.file_name is None:
                raise ValueError("File shares must include file_name")
            if self.file_size is None or self.file_size <= 0:
                raise ValueError("File shares must include a positive file_size")

        return self


class CreateShareResponse(BaseModel):
    id: str


class GetShareResponse(BaseModel):
    id: str
    type: Literal["text", "file"]
    encrypted_payload: str
    file_name: str | None
    file_size: int | None
    mime_type: str | None
    burn_after_read: bool
    expires_at: datetime
