from typing import Literal

from pydantic import BaseModel, Field


class CreateShareRequest(BaseModel):
    type: Literal["text", "file"]
    encrypted_payload: str = Field(min_length=1)
    file_name: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    mime_type: str | None = None
    expires_in: int = Field(gt=0)
    burn_after_read: bool = False


class CreateShareResponse(BaseModel):
    id: str
