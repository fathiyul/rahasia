# Rahasia

Private text and file sharing app with client-side encryption, share links, expiration, and burn-after-read support.

## Current Status

Working local MVP.

Current implemented scope:

- encrypted text sharing
- encrypted file sharing for small files
- client-side encryption and decryption
- expiration handling
- burn-after-read handling
- backend and frontend test coverage

## Stack

- Frontend: React + Vite + TypeScript
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Migrations: Alembic
- Frontend tests: Vitest + Testing Library
- Backend tests: Pytest

## Repository Structure

- `frontend/` frontend application
- `backend/` backend application
- `infra/` local infrastructure and deployment-related files
- `docs/public/` public setup and deployment documentation

## Local Development

See:

- `docs/public/LOCAL_SETUP.md`

## Deployment Notes

See:

- `docs/public/DEPLOYMENT.md`

## Security Model

The app encrypts content in the browser before upload. The backend stores encrypted payloads and metadata, not plaintext content. Decryption happens client-side using the decryption key shared separately from the link.

## Current Limitations

- file sharing is intended for small files only in the current DB-backed MVP
- the rate limiter is in-memory and not production-grade
- deployment infrastructure is documented, not fully automated