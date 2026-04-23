# STEP-14

## Goal

Add basic validation and abuse controls around the existing share API.

This step should leave you with:

- stricter backend request validation
- explicit file/text payload rules
- basic size limits
- non-permissive CORS for local development
- a lightweight in-memory rate limiter for `/shares`

This step does **not** include:

- distributed/production-grade rate limiting
- Redis-backed abuse control
- object storage controls
- antivirus or file-content scanning
- frontend UX changes

---

## Starting Point

Expected starting state:

- Step 13 is already committed
- text and file shares both work end-to-end
- backend already accepts file metadata fields
- backend currently has very basic request validation only
- backend currently has no explicit CORS policy
- backend currently has no request-size or rate-limit middleware

Check:

```bash
git status --short
git log --oneline --decorate -n 8
sed -n '1,260p' backend/app/main.py
sed -n '1,260p' backend/app/core/config.py
sed -n '1,260p' backend/app/schemas/share.py
```

You should see:

- clean working tree
- latest commit around Step 13
- `FastAPI()` app with no CORS middleware yet
- only `database_url` in settings
- a `CreateShareRequest` schema that is still fairly permissive

---

## Why This Step Exists

By Step 13, the app already works functionally.

But “works” is not the same as “defended enough to expose even lightly.”

At this point, someone can still try things like:

- send a file share without real file metadata
- send text shares with file-only fields
- send much larger encrypted payloads than you want
- hammer the `/shares` routes repeatedly
- call the API from any browser origin if you later add permissive CORS carelessly

So Step 14 is about moving from:

- feature-complete MVP behavior

to:

- basic guardrails around that behavior

These are not perfect production controls, but they are the first serious boundary checks.

---

## Do This

### 1. Extend backend settings for security-related limits

Right now the backend settings only know about the database URL.

That is too narrow for validation/security controls because those controls need configurable values like:

- allowed browser origins
- maximum request body size
- maximum encrypted payload size
- maximum original file size
- rate-limit window
- rate-limit request count

This belongs in settings so the limits are:

- visible
- configurable
- not hard-coded across multiple files

Replace `backend/app/core/config.py` with:

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ]
    )
    max_request_body_bytes: int = 8_500_000
    max_encrypted_payload_chars: int = 8_000_000
    max_file_bytes: int = 5_000_000
    max_expires_in_seconds: int = 2_592_000
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
```

What these values mean:

- `cors_allowed_origins`
  - only these frontend origins may call the API from a browser
- `max_request_body_bytes`
  - rough top-level request-size cap at the HTTP layer
- `max_encrypted_payload_chars`
  - maximum JSON string size for `encrypted_payload`
- `max_file_bytes`
  - maximum original file size metadata accepted for file shares
- `max_expires_in_seconds`
  - maximum allowed lifetime for a share
- `rate_limit_*`
  - simple in-memory request rate guard

### 2. Update the env example to make those limits visible

If settings exist in code but are not reflected in `.env.example`, they are easy to forget and harder to operate later.

Update `backend/.env.example` to include:

```env
DATABASE_URL=postgresql+psycopg://rahasia:rahasia@localhost:5433/rahasia
CORS_ALLOWED_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173"]
MAX_REQUEST_BODY_BYTES=8500000
MAX_ENCRYPTED_PAYLOAD_CHARS=8000000
MAX_FILE_BYTES=5000000
MAX_EXPIRES_IN_SECONDS=2592000
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=30
```

Important note:

- because `cors_allowed_origins` is a `list[str]`, the env value should be JSON array syntax

### 3. Tighten the request schema with real shape validation

Right now the schema knows the fields exist, but it does not fully enforce the meaning of those fields.

That means it still allows logically broken requests like:

- text share with `file_name`
- file share without `file_name`
- file share without `file_size`
- absurdly long expiry

So this substep makes `CreateShareRequest` validate not just field types, but **field relationships**.

Replace `backend/app/schemas/share.py` with:

```python
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
                raise ValueError(
                    "Text shares must not include file_name or file_size"
                )
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
```

What this changes:

- text shares cannot pretend to be file shares
- file shares must include required metadata
- payload size and expiry are capped
- file metadata lengths are capped

### 4. Add a lightweight middleware for body size and rate limiting

Validation at the schema layer is important, but it happens after the request has already reached the app.

That means you still want some earlier, cheaper guards for obvious abuse patterns.

This middleware will do two simple jobs:

1. reject oversized `/shares` requests using `Content-Length` when available
2. enforce a small in-memory per-IP rate limit for `/shares`

This is **not** a production-grade limiter.

It is acceptable for now because:

- this project is still early
- you are likely running one local/dev process
- the goal is basic protection, not final infrastructure

Later, a public deployment should move to something like:

- reverse-proxy limits
- Redis-backed rate limiting
- provider-side protections

Create `backend/app/core/middleware.py` with:

```python
from collections import defaultdict, deque
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class ShareGuardMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        max_body_bytes: int,
        window_seconds: int,
        max_requests: int,
    ) -> None:
        super().__init__(app)
        self.max_body_bytes = max_body_bytes
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/shares"):
            return await call_next(request)

        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_body_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large"},
                    )
            except ValueError:
                pass

        client_ip = request.client.host if request.client else "unknown"
        now = monotonic()
        bucket = self._buckets[client_ip]

        while bucket and now - bucket[0] >= self.window_seconds:
            bucket.popleft()

        if len(bucket) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
            )

        bucket.append(now)
        return await call_next(request)
```

What this middleware does not do:

- it does not share limits across processes
- it does not survive restarts
- it does not know about users/accounts

That is acceptable at this step, as long as you understand it is a stopgap.

### 5. Add explicit CORS and security middleware to the FastAPI app

Now wire the settings and middleware into the app entrypoint.

This is where Step 14 stops being “definitions on disk” and starts becoming real runtime behavior.

Replace `backend/app/main.py` with:

```python
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
```

Why this CORS configuration is deliberately narrow:

- only your local frontend dev origins are allowed
- no wildcard `*`
- only the methods you actually use are allowed
- only the basic JSON content header is allowed

That is much better than adding permissive CORS and forgetting about it.

### 6. Verify local config still loads cleanly

Before testing behavior, make sure the backend still imports and starts cleanly.

From `backend/`:

```bash
uv run ruff check
uv run pytest
```

Expected result:

- `ruff check` passes
- `pytest` may still report no tests collected at this stage, which is fine

Then start the backend if it is not already running:

```bash
uv run uvicorn app.main:app --reload
```

Expected output shape:

```text
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 7. Verify schema validation with invalid payloads

Now confirm that broken requests are rejected clearly.

#### Text share with file-only metadata

Run:

```bash
curl -i -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "encrypted_payload": "{\"iv\":\"iv\",\"ciphertext\":\"cipher\"}",
    "file_name": "should-not-be-here.txt",
    "expires_in": 3600,
    "burn_after_read": false
  }'
```

Expected result:

- status `422 Unprocessable Entity`
- response body includes a validation error mentioning that text shares must not include file metadata

#### File share missing file metadata

Run:

```bash
curl -i -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "file",
    "encrypted_payload": "{\"iv\":\"iv\",\"ciphertext\":\"cipher\"}",
    "expires_in": 3600,
    "burn_after_read": false
  }'
```

Expected result:

- status `422 Unprocessable Entity`
- response body includes a validation error mentioning `file_name` or `file_size`

#### Excessive expiry

Run:

```bash
curl -i -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "encrypted_payload": "{\"iv\":\"iv\",\"ciphertext\":\"cipher\"}",
    "expires_in": 999999999,
    "burn_after_read": false
  }'
```

Expected result:

- status `422 Unprocessable Entity`
- response body indicates `expires_in` is too large

### 8. Verify CORS is explicit

The API should now respond to browser preflight from your frontend origin, but not from arbitrary origins you did not allow.

Check the allowed local frontend origin:

```bash
curl -i -X OPTIONS http://127.0.0.1:8000/shares \
  -H "Origin: http://127.0.0.1:5173" \
  -H "Access-Control-Request-Method: POST"
```

Expected headers include:

```text
access-control-allow-origin: http://127.0.0.1:5173
```

If you test a disallowed origin, you should not see it echoed as an allowed origin.

### 9. Verify the rate limiter trips

This is a basic sanity check, not a load test.

Run:

```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/health
done
```

That loop should stay `200`, because the middleware only guards `/shares`.

Now test the guarded route:

```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/shares/not-a-real-id
done
```

Expected result:

- early responses should be `404`
- after enough rapid requests, you should start seeing `429`

That confirms the in-memory limiter is active on `/shares`.

### 10. Verify oversized request rejection

This check is easiest with a small throwaway script because crafting a huge JSON body by hand in shell is tedious.

From `backend/`:

```bash
uv run python - <<'PY'
import json
import urllib.error
import urllib.request

payload = json.dumps({
    "type": "text",
    "encrypted_payload": "A" * 9000000,
    "expires_in": 3600,
    "burn_after_read": False,
}).encode()

request = urllib.request.Request(
    "http://127.0.0.1:8000/shares",
    data=payload,
    headers={"Content-Type": "application/json"},
)

try:
    urllib.request.urlopen(request)
    print("unexpected success")
except urllib.error.HTTPError as exc:
    print(exc.code)
    print(exc.read().decode())
PY
```

Expected result:

- either `413 Request body is too large`
- or a validation failure if the payload is rejected first at the schema layer
- or a connection reset / dropped connection if the server rejects the oversized upload before cleanly returning a response

Why the connection reset can happen:

- the middleware can reject based on headers before consuming the full body
- the client may still be in the middle of sending a large payload
- in local dev, that can surface as a reset connection instead of a neat HTTP `413`

Any of those outcomes is acceptable here, because the point is that the oversized request does **not** succeed.

---

## Expected Result

After this step:

- the API rejects inconsistent share payloads
- the API has a bounded local CORS policy
- obviously oversized requests are rejected
- rapid abuse of `/shares` starts getting `429`
- the app has basic security guardrails instead of only feature logic

---

## What Not To Do Yet

Do not do these in this step:

- Redis-backed rate limiting
- reverse-proxy tuning
- production WAF/CDN rules
- background malware scanning
- object storage hardening
- frontend validation mirroring every backend rule

Those belong in later operational hardening.

---

## Finish This Step

When verification is complete:

```bash
git add backend
git commit -m "feat: add validation and basic security controls"
```
