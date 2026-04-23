# STEP-16

## Goal

Add public-facing setup and deployment documentation for the current app.

This step should leave you with:

- a root `README.md` that reflects the real current project state
- public docs for local setup
- public docs for deployment notes
- clear database migration commands in the docs

This step does **not** include:

- actually deploying the app
- Dockerizing the frontend/backend app services
- CI/CD pipelines
- production secrets management
- infrastructure-as-code

---

## Starting Point

Expected starting state:

- Step 15 is already committed
- the app works locally
- backend tests and frontend tests pass
- the root `README.md` is still minimal and outdated
- there are no meaningful public docs under `docs/public/` yet

Check:

```bash
git status --short
git log --oneline --decorate -n 8
sed -n '1,260p' README.md
find docs/public -maxdepth 3 -type f | sort
sed -n '1,260p' backend/.env.example
sed -n '1,260p' docker-compose.yml
```

You should see:

- clean working tree
- latest commit around Step 15
- a short README that still says “Early development”
- little or nothing under `docs/public/`

---

## Why This Step Exists

By now the project has a real local developer workflow:

- Postgres via Docker Compose
- backend via `uv`
- frontend via Vite
- Alembic migrations
- tests on both sides

But the public docs do not yet explain that clearly.

That creates a mismatch:

- the codebase is more complete than the docs
- a new collaborator would have to reverse-engineer setup from the repo
- deployment assumptions are still implicit instead of written down

So Step 16 is about turning the repo into something another developer can actually approach.

This is a documentation step, not a code-feature step.

---

## Public Docs Strategy

Keep the public docs split into three layers:

1. `README.md`
   - short project overview
   - stack
   - repo structure
   - where to find setup/deploy docs

2. `docs/public/LOCAL_SETUP.md`
   - exact local run instructions
   - backend/frontend/test commands
   - env setup
   - migration commands

3. `docs/public/DEPLOYMENT.md`
   - current deployment shape
   - what is ready now
   - what still needs hardening
   - production notes and migration steps

That keeps the root README concise while still making the public repo usable.

---

## Do This

### 1. Create the public docs files

These files do not exist yet, so create them first.

From the repo root:

```bash
mkdir -p docs/public
touch docs/public/LOCAL_SETUP.md
touch docs/public/DEPLOYMENT.md
```

Verify:

```bash
find docs/public -maxdepth 2 -type f | sort
```

You should now see:

```text
docs/public/DEPLOYMENT.md
docs/public/LOCAL_SETUP.md
```

### 2. Rewrite the root README to match the actual repo

The current README is too early-stage and no longer reflects the real app shape.

The root README should now answer:

- what the app is
- what stack it uses
- what features currently exist
- how the repo is organized
- where to find setup/deployment docs

Replace `README.md` with:

~~~md
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
~~~

What changed conceptually:

- no more “early development” wording
- no fake claims about production readiness
- documentation points to the right public files

### 3. Add a real local setup guide

This is the most important public document for another developer.

It should cover:

- prerequisites
- env setup
- local database startup
- migrations
- backend run
- frontend run
- test commands

Write this in `docs/public/LOCAL_SETUP.md`:

~~~md
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
~~~

This document should be boring and exact. That is a good thing.

### 4. Add a deployment notes document

Do not pretend the app is fully productionized. The deployment doc should be honest about:

- what is deployable now
- what still needs hardening
- what production topology makes sense

Write this in `docs/public/DEPLOYMENT.md`:

~~~md
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
~~~

This is intentionally a “deployment notes” document, not a fake polished ops manual.

### 5. Verify the public docs read cleanly

Once the files exist, read them back before considering the step done.

Run:

```bash
sed -n '1,260p' README.md
sed -n '1,320p' docs/public/LOCAL_SETUP.md
sed -n '1,320p' docs/public/DEPLOYMENT.md
```

What to check:

- commands match the repo as it actually exists
- ports match current local setup
- backend uses `uv` commands, not invented Python commands
- migration command is present
- limitations are honest

### 6. Verify the setup commands are still true

You do not need to re-run the whole project from scratch here, but you should at least cross-check the docs against the current toolchain.

Confirm these are still the real commands:

```bash
cd backend && uv run pytest
cd frontend && npm run test
cd frontend && npm run build
```

Expected result:

- backend tests pass
- frontend tests pass
- frontend build passes

If these commands changed earlier in the project, the docs should match the changed version, not an older version from the plan.

---

## Expected Result

After this step:

- the public repo has an accurate root README
- a new developer can follow local setup without reverse-engineering the repo
- deployment assumptions are documented honestly
- migration steps are public and explicit

---

## What Not To Do Yet

Do not do these in this step:

- publish Docker images
- write Kubernetes manifests
- add Terraform
- create CI workflows
- add secret-management docs for a specific cloud provider

Those are real deployment tasks, not the documentation baseline.

---

## Finish This Step

When the docs are accurate and read cleanly:

```bash
git add README.md docs/public
git commit -m "docs: add deployment and local setup instructions"
```
