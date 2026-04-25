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
