# PHASE-2-STEP-04

## Goal

Add the backend auth verification foundation for Phase 2.

This step should leave you with:

- backend settings that can read the new Phase 2 auth-related environment variables
- a reusable auth module that can extract and verify Clerk session tokens
- a lightweight auth context object for downstream route dependencies
- one optional-auth dependency and one required-auth dependency

This step does **not** include:

- frontend Clerk integration
- syncing authenticated Clerk users into the `users` table
- user creation or onboarding routes
- group routes
- invite routes

---

## Starting Point

Expected starting state:

- `PHASE-2-STEP-03` is already committed
- the backend now has a `users` table and username helper
- `backend/.env.example` already contains placeholder Clerk variables from Step 2
- `backend/app/core/config.py` still only exposes the old Phase 1 settings
- there is no reusable backend auth dependency yet

Check:

```bash
git status --short
sed -n '1,220p' backend/app/core/config.py
sed -n '1,200p' backend/.env.example
cat backend/pyproject.toml
```

You should see:

- a clean working tree
- auth-related values present in `.env.example`
- no code yet reading those Clerk settings
- no JWT verification dependency in backend dependencies

Why this matters:

Phase 2 will soon add authenticated endpoints. Those endpoints need one shared, trustworthy auth foundation instead of each route trying to parse headers and verify tokens on its own.

---

## Do This

### 1. Add the backend JWT verification dependency

The backend needs a Python JWT library that can:

- decode RS256 Clerk session tokens
- fetch signing keys from a JWKS endpoint
- cache JWKS responses reasonably

For this project, use `PyJWT` with the crypto extras.

Why this choice:

- Clerk documents manual JWT verification using their public key or JWKS
- `PyJWT` provides `PyJWKClient`, which is exactly the kind of helper this backend needs
- this keeps the backend in Python instead of depending on Clerk's JavaScript backend SDK

From `backend/`, add the dependency with `uv`:

```bash
uv add "pyjwt[crypto]>=2.10.1"
```

Why this is better here:

- it updates `pyproject.toml` for you
- it updates `uv.lock` at the same time
- it matches the actual dependency-management workflow already used in this repo

This step should be done before writing the auth helper code so imports work immediately.

### 2. Expand the backend settings model

Step 2 added placeholder env variables, but the settings object still does not expose them to application code.

Update `backend/app/core/config.py` so `Settings` includes:

- `app_env`
- `backend_public_url`
- `frontend_public_url`
- `clerk_secret_key`
- `clerk_publishable_key`
- `clerk_jwt_issuer`

Keep the existing settings intact.

A good updated shape is:

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    backend_public_url: str = "http://127.0.0.1:8000"
    frontend_public_url: str = "http://127.0.0.1:5173"
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )

    clerk_secret_key: str | None = None
    clerk_publishable_key: str | None = None
    clerk_jwt_issuer: str | None = None

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

Important note:

- this step does not require all of these settings to be populated yet
- using `None` is cleaner than fake defaults because it makes “not configured yet” explicit
- later auth code should fail clearly if required Clerk config is missing at runtime

### 3. Create a reusable backend auth module

The backend needs one place that knows how to:

- extract a Clerk session token from the request
- fetch the signing key from Clerk JWKS
- decode and validate the JWT
- check the issuer
- check the authorized party claim when present
- fail clearly if required Clerk config is missing
- return a small auth context object

Create:

- `backend/app/core/auth.py`

Use Clerk's manual-verification model:

- same-origin session token may come from the `__session` cookie
- cross-origin token may come from the `Authorization: Bearer ...` header
- the token should be verified against Clerk JWKS
- the issuer must match `CLERK_JWT_ISSUER`
- the `azp` claim should be checked against known frontend origins when present

Write this code in `backend/app/core/auth.py`:

```python
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError

from app.core.config import settings


@dataclass(slots=True)
class AuthContext:
    user_id: str
    session_id: str | None
    token: str
    claims: dict[str, Any]


def require_clerk_setting(value: str | None, name: str) -> str:
    if value is None or not value.strip():
        raise RuntimeError(f"Missing required Clerk setting: {name}")

    return value


def get_request_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return token

    return request.cookies.get("__session")


def get_clerk_jwks_url() -> str:
    issuer = require_clerk_setting(settings.clerk_jwt_issuer, "CLERK_JWT_ISSUER")
    return f"{issuer.rstrip('/')}/.well-known/jwks.json"


@lru_cache
def get_jwk_client() -> PyJWKClient:
    return PyJWKClient(get_clerk_jwks_url(), cache_jwk_set=True, lifespan=300)


def validate_authorized_party(claims: dict[str, Any]) -> None:
    azp = claims.get("azp")
    if azp is None:
        return

    allowed_origins = {
        settings.frontend_public_url,
        *settings.cors_allowed_origins,
    }

    if azp not in allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorized party",
        )


def verify_session_token(token: str) -> AuthContext:
    issuer = require_clerk_setting(settings.clerk_jwt_issuer, "CLERK_JWT_ISSUER")

    try:
        signing_key = get_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"require": ["exp", "iat", "nbf", "iss", "sub"]},
        )
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    validate_authorized_party(claims)

    return AuthContext(
        user_id=claims["sub"],
        session_id=claims.get("sid"),
        token=token,
        claims=claims,
    )


async def get_auth_context(request: Request) -> AuthContext | None:
    token = get_request_token(request)
    if token is None:
        return None

    return verify_session_token(token)


async def require_auth_context(
    auth: AuthContext | None = Depends(get_auth_context),
) -> AuthContext:
    if auth is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return auth
```

Why this structure works well:

- `AuthContext` gives later route code a small, typed auth object
- `get_auth_context()` supports optional authentication
- `require_auth_context()` supports protected routes
- the token source handling matches Clerk's documented request model
- the JWKS client is cached so you do not refetch keys on every request

Function by function, here is what each piece is doing:

#### `AuthContext`

This is a small structured object that represents a verified authenticated request.

It stores:

- `user_id`: the authenticated user identifier from the JWT `sub` claim
- `session_id`: the Clerk session ID when present
- `token`: the raw verified token string
- `claims`: the full decoded JWT claims

The main reason to have this object is to avoid passing around a loose untyped dictionary in later route code.

#### `require_clerk_setting(...)`

This helper makes missing Clerk configuration fail clearly at runtime when auth is actually used.

That matters because in this step:

- Clerk settings are allowed to be `None`
- but real verification cannot happen without them

So this helper turns:

- “config is absent”

into:

- a direct, obvious error

instead of a confusing `NoneType` crash later.

#### `get_request_token(request)`

This function tries to extract an auth token from the incoming request.

It checks:

1. `Authorization: Bearer ...`
2. `__session` cookie

This supports both:

- cross-origin bearer-token requests
- same-origin cookie-based requests

If no token exists, it returns `None`, which allows optional-auth routes to stay anonymous.

#### `get_clerk_jwks_url()`

This builds the Clerk JWKS URL from the configured issuer.

The backend needs this because Clerk publishes public signing keys at a JWKS endpoint.

That is how the backend later verifies that a JWT really came from Clerk.

#### `get_jwk_client()`

This creates a cached `PyJWKClient`.

Its purpose is:

- fetch Clerk public keys from JWKS
- reuse that client across requests

The `@lru_cache` wrapper matters here because you do not want to rebuild the JWK client for every request.

#### `validate_authorized_party(claims)`

This checks the `azp` claim when it exists.

The idea is:

- even if the token is valid
- it should also be intended for one of this app's known frontend origins

So this function compares `azp` against:

- `frontend_public_url`
- configured CORS allowed origins

If the token claims an unexpected authorized party, the request is rejected.

#### `verify_session_token(token)`

This is the core verification function.

It does the real auth work:

1. require Clerk issuer config
2. load the signing key from Clerk JWKS
3. decode and verify the JWT
4. require important claims
5. validate the authorized party
6. return an `AuthContext`

If anything is invalid, it raises `401 Invalid authentication token`.

This is the main function that turns an untrusted token string into a trusted app-level auth object.

#### `get_auth_context(request)`

This is the optional-auth dependency.

Behavior:

- if the request has no token, return `None`
- if the request has a token, verify it and return `AuthContext`

Use this later when a route can work for:

- anonymous users
- or authenticated users

#### `require_auth_context(...)`

This is the required-auth dependency.

Behavior:

- if `get_auth_context()` returned `None`, raise `401 Authentication required`
- otherwise return the verified `AuthContext`

Use this later when a route must be authenticated.

In practice, this is the dependency that future protected Phase 2 routes will usually depend on.

For the deeper concepts behind JWT, JWK, JWKS, Clerk, same-origin, cross-origin, and CORS, see:

- `devlog/MATERIAL_AUTH_JWT_CLERK.md`

### 4. Do not wire real protected routes yet

This step is only the foundation.

You do not need to add a new Phase 2 API route yet just to prove the dependency exists.

Why hold back here:

- Step 5 is where frontend login enters the repo
- Step 6 is where onboarding and user sync start to matter
- a placeholder protected route now would create extra cleanup work without real value

So keep this step focused on:

- imports
- helpers
- dependencies
- settings

It is acceptable for the auth module to raise a clear error when verification is actually attempted without real Clerk config.

### 5. Verify the module imports and basic config shape

This step cannot do full end-to-end Clerk verification yet because:

- there is no frontend Clerk integration yet
- you may not have a real Clerk instance configured locally yet

So verification should focus on:

- code imports successfully
- current backend tests still pass

From `backend/`:

```bash
uv run pytest
```

Expected result:

- the existing backend tests still pass

This proves the foundation loads cleanly without breaking the Phase 1 backend, even before real Clerk config is present locally.

### 6. Keep the scope narrow

Do not do these things yet:

- fetch users from Clerk's API
- create internal `User` rows from a verified token
- add protected group routes
- add frontend auth state
- add cookies or client-side token logic

That work belongs in the next steps.

---

## Expected Result

After this step:

- the backend can read Phase 2 auth settings from `Settings`
- `backend/app/core/auth.py` exists
- the backend has reusable optional and required auth dependencies
- existing backend tests still pass

---

## What Not To Do Yet

Do not:

- build user-sync services in this step
- add group authorization rules yet
- add invite authorization yet
- create auth-specific API routes just for demonstration

The goal is a clean verification layer first.

---

## Verification

Run:

```bash
sed -n '1,240p' backend/app/core/config.py
sed -n '1,280p' backend/app/core/auth.py
cd backend
uv add "pyjwt[crypto]>=2.10.1"
uv run pytest
```

Expected result:

- `config.py` exposes the Phase 2 auth settings
- `auth.py` exposes token extraction, JWKS resolution, token verification, and auth dependencies
- dependency installation succeeds and updates the lockfile
- the existing backend tests still pass

Success looks like:

- future protected endpoints can depend on one shared auth layer
- Phase 1 functionality still works
- the backend is ready for real Clerk-backed auth wiring in later steps

---

## Finish This Step

Stage the backend auth-foundation files:

```bash
git add backend/pyproject.toml backend/uv.lock backend/app/core/config.py backend/app/core/auth.py devlog/PHASE-2-STEP-04.md
```

Then commit:

```bash
git commit -m "feat: add backend auth verification foundation"
```
