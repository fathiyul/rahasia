# STEP-07

## Goal

Implement the create-share API endpoint: `POST /shares`.

This step should leave you with:

- a request schema for creating a share
- a response schema returning the new share ID
- a DB session dependency for route handlers
- a share service function that creates and persists a `Share`
- a FastAPI route at `POST /shares`
- the route wired into `app/main.py`

This step does **not** include:

- retrieving shares
- burn-after-read enforcement during reads
- frontend integration
- file upload streaming or object storage

---

## Starting Point

Expected starting state:

- Step 6 is already committed
- repo is clean before starting
- the `Share` model exists
- the `shares` table migration has already been applied

Check:

```bash
git status --short
git log --oneline --decorate -n 5
cd backend
uv run alembic current
```

You should see:

- clean working tree
- latest commit: `feat: add share data model`
- Alembic at the latest revision

---

## Do This

### 1. Clean up the old placeholder in `alembic/versions/`

This is just a small housekeeping fix from the last step.

Now that `alembic/versions/` contains a real migration file, the placeholder `.gitkeep` is no longer needed.

From `backend/`:

```bash
rm alembic/versions/.gitkeep
```

### 2. Prepare the API, schema, and service files

This substep creates the modules that will hold the create-share endpoint logic.

We are separating responsibilities like this:

- `schemas/` for API input/output shapes
- `services/` for business logic and DB operations
- `api/` for FastAPI route definitions

That keeps the route handler thin and avoids putting all logic into `main.py`.

From `backend/`:

```bash
rm -f app/{schemas,services,api}/.gitkeep
touch app/schemas/share.py
touch app/services/share_service.py
touch app/api/routes_shares.py
```

Then verify:

```bash
find app/api app/schemas app/services -maxdepth 2 -type f | sort
```

Expected file list:

```text
app/api/__init__.py
app/api/routes_shares.py
app/schemas/__init__.py
app/schemas/share.py
app/services/__init__.py
app/services/share_service.py
```

### 3. Add the API schemas

Before writing the route, define the API contract.

What you are trying to achieve here:

- define exactly what the backend accepts when someone creates a share
- define exactly what the backend returns after creation
- keep API validation separate from the SQLAlchemy model

These are **Pydantic schemas**, not database models.

They exist because:

- request payloads need validation
- response payloads need a clean, intentional shape
- API contracts should not be the same thing as ORM models

For now, this endpoint should accept:

- `type`
- `encrypted_payload`
- optional file metadata
- `expires_in`
- `burn_after_read`

Write this code in `backend/app/schemas/share.py`:

```python
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
```

What this means:

- `type` is limited to `text` or `file`
- `encrypted_payload` must not be empty
- `file_size` cannot be negative
- `expires_in` must be a positive integer

Expected request body shape:

```json
{
  "type": "text",
  "encrypted_payload": "base64-or-other-encrypted-payload",
  "expires_in": 3600,
  "burn_after_read": false
}
```

Expected response body shape:

```json
{
  "id": "generated-share-id"
}
```

### 4. Add a real DB session dependency

The route will need a database session for inserting a row.

Right now, `app/db/session.py` creates the engine and session factory, but it does not yet expose a request-scoped dependency for FastAPI.

This substep adds:

- a `get_db()` dependency
- one opened session per request
- guaranteed cleanup after the request completes

Replace the contents of `backend/app/db/session.py` with:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_database_url() -> str:
    return settings.database_url


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

What this does:

- opens a SQLAlchemy session
- yields it to the route handler
- closes it automatically afterward

### 5. Add the create-share service

The route should not contain all the record-creation logic directly.

This substep creates a service function that:

- receives validated API input
- computes `expires_at`
- generates a share ID
- creates the ORM object
- commits it to the database
- returns the saved model

Write this code in `backend/app/services/share_service.py`:

```python
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
```

Why use a service function:

- keeps route handlers small
- isolates persistence logic
- makes later testing and reuse easier

### 6. Add the FastAPI route

Now expose the create-share behavior as an HTTP endpoint.

This route should:

- accept the validated request body
- get a DB session from FastAPI dependency injection
- call the service
- return only the created share ID

Write this code in `backend/app/api/routes_shares.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.share import CreateShareRequest, CreateShareResponse
from app.services.share_service import create_share

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post("", response_model=CreateShareResponse, status_code=status.HTTP_201_CREATED)
def create_share_route(
    payload: CreateShareRequest,
    db: Session = Depends(get_db),
) -> CreateShareResponse:
    share = create_share(db, payload)
    return CreateShareResponse(id=share.id)
```

Expected endpoint behavior:

- method: `POST`
- path: `/shares`
- response status: `201 Created`
- response body:

```json
{
  "id": "generated-share-id"
}
```

### 7. Wire the router into `app/main.py`

The route file now exists, but FastAPI still will not serve it until you include the router in the app.

Replace the contents of `backend/app/main.py` with:

```python
from fastapi import FastAPI

from app.api.routes_shares import router as shares_router

app = FastAPI()
app.include_router(shares_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

What this changes:

- keeps the health endpoint
- adds the `/shares` routes to the app

### 8. Verify the files before running the app

From `backend/`:

```bash
find app -maxdepth 3 -type f | sort
sed -n '1,220p' app/schemas/share.py
sed -n '1,240p' app/services/share_service.py
sed -n '1,220p' app/api/routes_shares.py
sed -n '1,220p' app/db/session.py
sed -n '1,220p' app/main.py
```

Check that:

- request and response schemas exist
- `get_db()` exists
- `create_share()` exists
- the router is included in `main.py`

### 9. Run the app and test `POST /shares`

From `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

In another terminal, test it with:

```bash
curl -X POST http://127.0.0.1:8000/shares \
-H "Content-Type: application/json" \
-d '{
  "type": "text",
  "encrypted_payload": "ciphertext-placeholder",
  "expires_in": 3600,
  "burn_after_read": false
}'
```

Important:

- the `\` must be the very last character on the line
- do not leave trailing spaces after `\`
- if multiline `curl` gives shell errors, use the one-line version below instead

Equivalent one-line version:

```bash
curl -X POST http://127.0.0.1:8000/shares -H "Content-Type: application/json" -d '{"type":"text","encrypted_payload":"ciphertext-placeholder","expires_in":3600,"burn_after_read":false}'
```

Expected output shape:

```json
{"id":"some-uuid-value"}
```

Expected HTTP status:

```text
201 Created
```

If you want to inspect the generated OpenAPI docs, open:

```text
http://127.0.0.1:8000/docs
```

You should see the new `POST /shares` endpoint there.

### 10. Optional sanity checks

From `backend/`:

```bash
uv run ruff check
uv run pytest
```

Expected result:

- `ruff` passes
- `pytest` may still report no tests, which is fine at this stage

---

## Expected Result

After this step, the backend should expose:

- `GET /health`
- `POST /shares`

And `POST /shares` should:

- accept validated JSON input
- insert a `Share` row
- return the new share ID

---

## What Not To Do Yet

- Do not implement `GET /shares/{id}` yet
- Do not add password/key verification yet
- Do not add burn-after-read retrieval logic yet
- Do not add frontend integration yet

This step is only share creation.

---

## Verification

Before committing:

```bash
git status --short
find backend -maxdepth 4 -type f -not -path 'backend/.venv/*' -not -path 'backend/.pytest_cache/*' -not -path 'backend/.ruff_cache/*' | sort
sed -n '1,220p' backend/app/schemas/share.py
sed -n '1,240p' backend/app/services/share_service.py
sed -n '1,220p' backend/app/api/routes_shares.py
sed -n '1,220p' backend/app/db/session.py
sed -n '1,220p' backend/app/main.py
```

Make sure:

- `alembic/versions/.gitkeep` has been removed
- `POST /shares` returns `201`
- the response contains an `id`
- a row is actually inserted into `shares`

You can verify inserted rows with:

```bash
uv run python -c "from sqlalchemy import select; from app.db.session import SessionLocal; from app.models.share import Share; db = SessionLocal(); print(len(db.execute(select(Share)).scalars().all())); db.close()"
```

---

## Finish This Step

From the repo root:

```bash
git add backend
git commit -m "feat: implement share creation endpoint"
```

---

## Commit Message

```text
feat: implement share creation endpoint
```
