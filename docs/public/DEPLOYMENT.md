# Deployment Notes

## Current Shape

The current app is split into:

- React frontend
- FastAPI backend
- PostgreSQL database

The frontend and backend should be deployed separately.

## Recommended Production Shape

- frontend deployed as a static site
- backend deployed as an application service
- PostgreSQL deployed as a managed database

For future larger file support, encrypted file blobs should move out of the database and into object storage.

## Minimum Production Requirements

- HTTPS everywhere
- environment variables configured for backend settings
- PostgreSQL available to the backend
- database migrations run during deployment
- frontend pointed at the correct backend origin

## Backend Deployment Checklist

1. Provision PostgreSQL.
2. Set backend environment variables.
3. Install backend dependencies.
4. Run Alembic migrations:

```bash
uv run alembic upgrade head
```

5. Start the backend app service.

## Frontend Deployment Checklist

1. Install frontend dependencies.
2. Build the frontend:

```bash
npm run build
```

3. Serve the built assets from a static host.
4. Make sure the frontend can reach the backend origin in production.

## Important Current Limitations

- File sharing currently stores encrypted file payloads in the database, which is acceptable for small files but not ideal long term.
- The current rate limiter is in-memory and not suitable as the final production abuse-control strategy.
- There is no CI/CD pipeline or automated deployment workflow yet.
- There is no object storage integration yet.

## Security Notes

- Content is encrypted client-side before upload.
- The backend stores encrypted payloads and metadata, not plaintext.
- Decryption keys must be shared separately from the link.
- CORS should stay explicit and environment-specific.

## Future Hardening

Areas to improve before broader public deployment:

- production-grade rate limiting
- better file size and MIME enforcement
- object storage for encrypted file blobs
- CI/CD and deployment automation
- reverse-proxy and platform-level request limits
