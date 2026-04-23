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
- `docker-compose.yml` local PostgreSQL service for development
- `docs/public/` public setup and deployment documentation

## Run the App

### Prerequisites

- Node.js 20+
- npm
- Python 3.13
- `uv`
- Docker with Compose support

### 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

PostgreSQL will be available on `localhost:5433`.

### 2. Configure and start the backend

From `backend/`:

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### 3. Install and start the frontend

From `frontend/`:

```bash
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

### 4. Run tests

Backend:

```bash
cd backend
uv run pytest
```

Frontend:

```bash
cd frontend
npm run test
```

## Local Development Docs

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
