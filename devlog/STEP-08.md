# STEP-08

## Goal

Implement the retrieve-share API endpoint: `GET /shares/{id}`.

This step should leave you with:

- a response schema for returning encrypted share data
- a share service function that fetches a share by ID
- basic not-found / expired / deleted handling
- a FastAPI route at `GET /shares/{id}`

This step does **not** include:

- burn-after-read mutation on retrieval
- password/key verification
- frontend integration
- file download streaming

---

## Starting Point

Expected starting state:

- Step 7 is already committed
- repo is clean before starting
- `POST /shares` already works
- the `shares` table exists in Postgres

Check:

```bash
git status --short
git log --oneline --decorate -n 5
cd backend
uv run alembic current
```

You should see:

- clean working tree
- latest commit: `feat: implement share creation endpoint`
- Alembic at the latest revision

---

## Do This

### 1. Extend the API schemas for retrieval

The create endpoint only needed an input schema and a tiny response schema.

The retrieve endpoint is different:

- it does not accept a JSON body
- it returns the encrypted share payload and metadata
- it should expose only what the client needs to decrypt/render later

This is still API-layer structure, not a DB model.

Add this code to `backend/app/schemas/share.py` below the existing create schemas:

```python
class GetShareResponse(BaseModel):
    id: str
    type: Literal["text", "file"]
    encrypted_payload: str
    file_name: str | None
    file_size: int | None
    mime_type: str | None
    burn_after_read: bool
    expires_at: datetime
```

Because this new schema uses `datetime`, update the imports at the top of `backend/app/schemas/share.py` to:

```python
from datetime import datetime
from typing import Literal
```

What this response is for:

- return the encrypted content
- preserve enough metadata for the recipient flow
- keep the response intentionally smaller than the full DB model

Expected response body shape:

```json
{
  "id": "share-id",
  "type": "text",
  "encrypted_payload": "ciphertext-placeholder",
  "file_name": null,
  "file_size": null,
  "mime_type": null,
  "burn_after_read": false,
  "expires_at": "2026-04-18T12:34:56Z"
}
```

### 2. Add retrieval logic to the share service

The route should not contain the lookup and validation rules directly.

This substep adds a service function that:

- looks up a share by ID
- returns `404 Not Found` if it does not exist
- returns `410 Gone` if it is expired
- returns `410 Gone` if it is already marked deleted

That gives the route a single place to ask for a valid retrievable share.

Update `backend/app/services/share_service.py` to this:

```python
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
    statement = select(Share).where(Share.id == share_id)
    share = db.execute(statement).scalar_one_or_none()

    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found",
        )

    now = datetime.now(UTC)

    if share.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share has expired",
        )

    if share.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share is no longer available",
        )

    return share
```

Why this logic belongs in the service:

- it keeps the route handler simple
- it centralizes retrieval rules
- it makes later burn-after-read updates easier to add in one place

### 3. Add the FastAPI retrieve route

Now expose the retrieval behavior as an HTTP endpoint.

This route should:

- accept a share ID from the path
- get a DB session from dependency injection
- ask the service for a valid retrievable share
- convert the ORM object into the response schema

Replace the contents of `backend/app/api/routes_shares.py` with:

```python
from typing import Literal, cast

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.share import (
    CreateShareRequest,
    CreateShareResponse,
    GetShareResponse,
)
from app.services.share_service import create_share, get_share_by_id

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post(
    "",
    response_model=CreateShareResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_share_route(
    payload: CreateShareRequest,
    db: Session = Depends(get_db),
) -> CreateShareResponse:
    share = create_share(db, payload)
    return CreateShareResponse(id=share.id)


@router.get("/{share_id}", response_model=GetShareResponse)
def get_share_route(
    share_id: str,
    db: Session = Depends(get_db),
) -> GetShareResponse:
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
```

Expected endpoint behavior:

- method: `GET`
- path: `/shares/{share_id}`
- success status: `200 OK`
- error statuses:
  - `404 Not Found`
  - `410 Gone`

Why `cast(...)` is used here:

- `GetShareResponse` expects `Literal["text", "file"]`
- the SQLAlchemy model currently stores `type` as a general `str`
- Pylance warns because a general `str` is not guaranteed to match that literal type

For this step, use:

- `cast(Literal["text", "file"], share.type)`

Do **not** use:

- `# type: ignore`

because that hides the warning instead of documenting your intent.

Do **not** do a full enum refactor yet unless you want to widen the scope of this step.

At this point in the project, `cast(...)` is the smallest correct fix at the API boundary.

### 4. Verify the updated files before running the app

Before testing the route, confirm the schema, service, and router all line up.

From `backend/`:

```bash
sed -n '1,240p' app/schemas/share.py
sed -n '1,320p' app/services/share_service.py
sed -n '1,260p' app/api/routes_shares.py
```

Check that:

- `GetShareResponse` exists
- `get_share_by_id()` exists
- the route imports and uses both

### 5. Run the app and test create + retrieve

From `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

In another terminal, first create a share:

```bash
curl -X POST http://127.0.0.1:8000/shares -H "Content-Type: application/json" -d '{"type":"text","encrypted_payload":"ciphertext-placeholder","expires_in":3600,"burn_after_read":false}'
```

Expected output shape:

```json
{"id":"some-uuid-value"}
```

Then retrieve it:

```bash
curl http://127.0.0.1:8000/shares/<share-id>
```

Expected output shape:

```json
{
  "id": "<share-id>",
  "type": "text",
  "encrypted_payload": "ciphertext-placeholder",
  "file_name": null,
  "file_size": null,
  "mime_type": null,
  "burn_after_read": false,
  "expires_at": "2026-04-18T12:34:56Z"
}
```

Expected success HTTP status:

```text
200 OK
```

### 6. Test the failure cases

Now verify that the service rules are actually enforced.

Non-existent share:

```bash
curl http://127.0.0.1:8000/shares/not-a-real-id
```

Expected response shape:

```json
{"detail":"Share not found"}
```

Expected HTTP status:

```text
404 Not Found
```

Expired/deleted behavior:

- you may not have an expired or deleted row yet
- that is fine for now
- the important thing is that the logic exists in `get_share_by_id()`

You will exercise those states more deliberately in later steps.

### 7. Optional sanity checks

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
- `GET /shares/{share_id}`

And `GET /shares/{share_id}` should:

- return encrypted share data for an existing valid share
- return `404` when the share does not exist
- return `410` when the share is expired or unavailable

---

## What Not To Do Yet

- Do not mutate `read_at` yet
- Do not mark burn-after-read shares as consumed yet
- Do not add password/key verification yet
- Do not add frontend integration yet

This step is only retrieval with basic availability checks.

---

## Verification

Before committing:

```bash
git status --short
find backend -maxdepth 4 -type f -not -path 'backend/.venv/*' -not -path 'backend/.pytest_cache/*' -not -path 'backend/.ruff_cache/*' | sort
sed -n '1,240p' backend/app/schemas/share.py
sed -n '1,320p' backend/app/services/share_service.py
sed -n '1,260p' backend/app/api/routes_shares.py
```

Make sure:

- `GetShareResponse` exists
- `get_share_by_id()` exists
- `GET /shares/{share_id}` returns `200` for a valid share
- `GET /shares/not-a-real-id` returns `404`
- `POST /shares` still works after the route changes

---

## Finish This Step

From the repo root:

```bash
git add backend
git commit -m "feat: implement share retrieval endpoint"
```

---

## Commit Message

```text
feat: implement share retrieval endpoint
```
