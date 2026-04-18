from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.share import CreateShareRequest, CreateShareResponse
from app.services.share_service import create_share

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post(
    "", response_model=CreateShareResponse, status_code=status.HTTP_201_CREATED
)
def create_share_route(
    payload: CreateShareRequest, db: Session = Depends(get_db)
) -> CreateShareResponse:
    share = create_share(db, payload)
    return CreateShareResponse(id=share.id)
