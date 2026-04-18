from fastapi import FastAPI

from app.api.routes_shares import router as shares_router

app = FastAPI()

app.include_router(shares_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
