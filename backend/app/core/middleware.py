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
