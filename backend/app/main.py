from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_shares import router as shares_router
from app.core.config import settings
from app.core.middleware import ShareGuardMiddleware

app = FastAPI()

app.add_middleware(
    ShareGuardMiddleware,
    max_body_bytes=settings.max_request_body_bytes,
    window_seconds=settings.rate_limit_window_seconds,
    max_requests=settings.rate_limit_max_requests,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(shares_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
