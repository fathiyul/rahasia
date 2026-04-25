# Local Setup

## Prerequisites

- Node.js 20+
- npm
- Python 3.13
- `uv`
- Docker with Compose support

## Repository Layout

- `frontend/` React + Vite frontend
- `backend/` FastAPI backend
- `docker-compose.yml` local Postgres

## Phase 2 Config Note

For the upcoming Phase 2 auth and deployment-related config surface, see:

- `docs/public/PHASE_2_CONFIG.md`

## 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
docker compose ps
```

The local database is exposed on port `5433`.

## 2. Configure backend environment

From `backend/`:

```bash
cp .env.example .env
```

Review `.env` and adjust values if needed.

## 3. Install backend dependencies

From `backend/`:

```bash
uv sync
```

## 4. Run database migrations

From `backend/`:

```bash
uv run alembic upgrade head
```

This applies the latest schema to your local Postgres instance.

## 5. Start the backend

From `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## 6. Install frontend dependencies

From `frontend/`:

```bash
npm install
```

## 7. Start the frontend

From `frontend/`:

```bash
npm run dev
```

The frontend will be available at:

```text
http://127.0.0.1:5173
```

## 8. Run tests

### Backend

From `backend/`:

```bash
uv run pytest
```

### Frontend

From `frontend/`:

```bash
npm run test
```

## 9. Useful commands

### Backend lint

```bash
cd backend
uv run ruff check
```

### Frontend lint

```bash
cd frontend
npm run lint
```

### Frontend build

```bash
cd frontend
npm run build
```

### Re-run migrations after schema changes

```bash
cd backend
uv run alembic upgrade head
```
