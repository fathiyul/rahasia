# STEP-03

## Goal

Scaffold the backend application inside `backend/` using FastAPI and `uv`.

This step should leave you with:

- a Python project managed by `uv`
- a minimal FastAPI app
- a basic backend folder structure
- one health endpoint
- the backend runnable locally

This step does **not** include:

- database setup
- SQLAlchemy models
- Alembic migrations
- share creation or retrieval endpoints

---

## Starting Point

Expected starting state:

- Step 2 is already committed
- `backend/` currently only contains `.gitkeep`
- repo is clean before starting

Check:

```bash
git status --short
git log --oneline --decorate -n 2
```

You should see:

- clean working tree
- latest commit: `chore: scaffold frontend app`

---

## Do This

### 1. Remove the placeholder file

```bash
rm backend/.gitkeep
```

### 2. Initialize the Python project

From the `backend/` directory:

```bash
cd backend
uv init --no-readme --vcs none --no-pin-python
```

Important note:

- `uv init` creates a default `hello.py`
- keep the generated `pyproject.toml`
- delete `hello.py` after initialization because it does not match the app structure you want

```bash
rm hello.py
```

### 3. Add the backend dependencies

Still inside `backend/`:

```bash
uv add fastapi "uvicorn[standard]" pydantic-settings
uv add --dev ruff pytest httpx
```

Keep this step minimal.

Do **not** add database dependencies yet. Those belong to the next steps.

### 4. Create the backend folder structure

From `backend/`:

```bash
mkdir app tests
cd app
mkdir api core db models schemas services
touch {api,core,db,models,schemas,services}/.gitkeep
cd ..
touch tests/.gitkeep
```

Equivalent compact version:

```bash
mkdir -p app/{api,core,db,models,schemas,services} tests
touch app/{api,core,db,models,schemas,services}/.gitkeep tests/.gitkeep
```

Then verify:

```bash
ls
find app -maxdepth 2 -type f | sort
find tests -maxdepth 1 -type f | sort
```

You should have:

```text
backend/
  app/
    api/.gitkeep
    core/.gitkeep
    db/.gitkeep
    models/.gitkeep
    schemas/.gitkeep
    services/.gitkeep
  tests/.gitkeep
```

### 5. Create the minimum backend files

From `backend/`:

```bash
touch app/main.py
touch app/__init__.py
touch app/{api,core,db,models,schemas,services}/__init__.py
```

Then verify:

```bash
find app -maxdepth 2 -type f | sort
```

You should now have at least:

```text
app/main.py
app/__init__.py
app/api/__init__.py
app/core/__init__.py
app/db/__init__.py
app/models/__init__.py
app/schemas/__init__.py
app/services/__init__.py
```

The top-level `app/__init__.py` matters too. Later tools like `pytest` may import modules using paths such as `from app.main import app` or `from app.db.base import Base`, so the root `app/` package itself should exist explicitly.

Write this code in `app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

What this does:

- creates the FastAPI application object
- exposes a `GET /health` endpoint
- returns a simple JSON health response

Expected endpoint behavior:

- method: `GET`
- path: `/health`
- response status: `200 OK`
- response body:

```json
{
  "status": "ok"
}
```

Do not implement business logic yet.

### 6. Run the backend locally

From `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

Verify:

- the server starts successfully
- `http://127.0.0.1:8000/health` returns a successful response
- there are no import errors

Useful verification command:

```bash
curl http://127.0.0.1:8000/health
```

Expected output:

```json
{"status":"ok"}
```

Then stop the server.

### 7. Optional quick checks

From `backend/`:

```bash
uv run pytest
uv run ruff check
```

At this stage, `pytest` may report that there are no tests. That is fine.

The main thing is that the app boots cleanly.

---

## Expected Result

After this step, `backend/` should contain at least:

```text
backend/
  pyproject.toml
  uv.lock
  app/
    main.py
    api/
    core/
    db/
    models/
    schemas/
    services/
  tests/
```

You may also have:

- `.venv/` locally

That is fine. It should remain untracked because the root `.gitignore` already ignores `.venv/`.

---

## What Not To Do Yet

- Do not add PostgreSQL yet
- Do not add SQLAlchemy yet
- Do not add Alembic yet
- Do not add the `shares` model yet
- Do not add product endpoints yet

This step is only the backend scaffold.

---

## Verification

Before committing:

```bash
git status --short
find backend -maxdepth 3 -type f -not -path 'backend/.venv/*' | sort
```

Useful checks:

```bash
cat backend/pyproject.toml
uv run uvicorn app.main:app --reload
```

Make sure:

- `hello.py` is gone
- `app/main.py` exists
- `tests/.gitkeep` exists
- dependencies are present in `pyproject.toml`
- the server runs without errors

Also it's good to update the `description` field in `pyproject.toml` to something relevant.

---

## Finish This Step

From the repo root:

```bash
git add backend
git commit -m "chore: scaffold backend app"
```

---

## Commit Message

```text
chore: scaffold backend app
```
