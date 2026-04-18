from datetime import UTC, datetime, timedelta
from uuid import uuid4

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
