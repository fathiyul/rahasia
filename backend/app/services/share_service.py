from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.share import Share
from app.schemas.share import CreateShareRequest


def create_share(db: Session, payload: CreateShareRequest) -> Share:
    expires_at = datetime.now(UTC) + timedelta(seconds=payload.expires_in)

    share = Share(
        id=str(uuid4()),
        type=payload.type,
        encrypted_payload=payload.encrypted_payload,
        file_name=payload.file_name,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        expires_at=expires_at,
        burn_after_read=payload.burn_after_read,
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return share


def get_share_by_id(db: Session, share_id: str) -> Share:
    statement = select(Share).where(Share.id == share_id).with_for_update()
    share = db.execute(statement).scalar_one_or_none()

    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share not found"
        )

    now = datetime.now(UTC)

    if share.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Share has expired"
        )

    if share.is_deleted:
        detail = (
            "Share has already been opened"
            if share.burn_after_read and share.read_at is not None
            else "Share is no longer available"
        )
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=detail)

    if share.burn_after_read:
        share.is_deleted = True
        share.read_at = now
        db.commit()

    return share
