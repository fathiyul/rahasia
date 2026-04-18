from typing import Literal, cast

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.share import CreateShareRequest, CreateShareResponse, GetShareResponse
from app.services.share_service import create_share, get_share_by_id

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post(
    "", response_model=CreateShareResponse, status_code=status.HTTP_201_CREATED
)
def create_share_route(
    payload: CreateShareRequest, db: Session = Depends(get_db)
) -> CreateShareResponse:
    share = create_share(db, payload)
    return CreateShareResponse(id=share.id)


@router.get("/{share_id}", response_model=GetShareResponse)
def get_share_route(share_id: str, db: Session = Depends(get_db)) -> GetShareResponse:
    share = get_share_by_id(db, share_id)
    return GetShareResponse(
        id=share.id,
        type=cast(Literal["text", "file"], share.type),
        encrypted_payload=share.encrypted_payload,
        file_name=share.file_name,
        file_size=share.file_size,
        mime_type=share.mime_type,
        burn_after_read=share.burn_after_read,
        expires_at=share.expires_at,
    )
