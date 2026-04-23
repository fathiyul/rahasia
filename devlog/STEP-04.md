# STEP-04

## Goal

Add a local PostgreSQL database for development and wire the backend to read its database settings from environment variables.

This step should leave you with:

- a root `docker-compose.yml` for local Postgres
- a `backend/.env.example` file
- backend settings code for reading the database URL
- a reproducible way to start and stop the local database

This step does **not** include:

- SQLAlchemy models
- Alembic migrations
- the `shares` table
- share endpoints

---

## Starting Point

Expected starting state:

- Step 3 is already committed
- repo is clean before starting
- backend FastAPI app already runs

Check:

```bash
git status --short
git log --oneline --decorate -n 3
```

You should see:

- clean working tree
- latest commit: `chore: scaffold backend app`

---

## Do This

### 1. Add database dependencies

From `backend/`:

```bash
uv add sqlalchemy "psycopg[binary]"
```

Why these:

- `sqlalchemy` will be used for the app database layer in the next steps
- `psycopg[binary]` is the PostgreSQL driver

Then verify:

```bash
cat pyproject.toml
```

You should see both packages under `[project].dependencies`.

### 2. Create the root `docker-compose.yml`

From the repo root:

```bash
touch docker-compose.yml
```

Write this code in `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: rahasia-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: rahasia
      POSTGRES_USER: rahasia
      POSTGRES_PASSWORD: rahasia
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

What this does:

- starts a local PostgreSQL container
- exposes Postgres on `localhost:5432`
- creates a persistent Docker volume named `postgres_data`

If `5432` is already in use on your machine, change the host port only:

```yaml
ports:
  - "5433:5432"
```

That means:

- your machine connects to Postgres on `localhost:5433`
- the container still uses its normal internal Postgres port `5432`
- the app `DATABASE_URL` must also use `5433`

### 3. Add backend environment example

From `backend/`:

```bash
touch .env.example
```

Write this code in `backend/.env.example`:

```env
DATABASE_URL=postgresql+psycopg://rahasia:rahasia@localhost:5432/rahasia
```

If you changed the Docker host port to `5433`, use this instead:

```env
DATABASE_URL=postgresql+psycopg://rahasia:rahasia@localhost:5433/rahasia
```

Then create your local environment file:

```bash
cp .env.example .env
```

Do not commit `.env`.

It is already ignored by the root `.gitignore`.

### 4. Replace the placeholder in `app/core/`

From `backend/`:

```bash
rm app/core/.gitkeep
touch app/core/config.py
```

Write this code in `backend/app/core/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
```

What this does:

- loads settings from environment variables
- reads `DATABASE_URL` from `backend/.env`
- gives you a shared `settings` object for later steps

### 5. Expose the configured database URL in a safe way

From `backend/`:

```bash
rm app/db/.gitkeep
touch app/db/session.py
```

Write this code in `backend/app/db/session.py`:

```python
from app.core.config import settings


def get_database_url() -> str:
    return settings.database_url
```

This is intentionally small.

At this step, the goal is only to prove the backend can load database configuration cleanly. Actual engine/session setup comes next.

### 6. Verify Docker can start Postgres

From the repo root:

```bash
docker compose up -d
docker compose ps
```

Expected result:

- the `postgres` service is running
- port `5432` is exposed

Example output shape:

```text
NAME               IMAGE                COMMAND                  SERVICE    STATUS         PORTS
rahasia-postgres   postgres:17-alpine   "docker-entrypoint.s…"   postgres   Up ...         0.0.0.0:5432->5432/tcp
```

If you mapped it to `5433`, the output should instead look like:

```text
NAME               IMAGE                COMMAND                  SERVICE    STATUS         PORTS
rahasia-postgres   postgres:17-alpine   "docker-entrypoint.s…"   postgres   Up ...         0.0.0.0:5433->5432/tcp
```

### 7. Verify the backend loads the database URL

From `backend/`:

```bash
uv run python -c "from app.db.session import get_database_url; print(get_database_url())"
```

Expected output:

```text
postgresql+psycopg://rahasia:rahasia@localhost:5432/rahasia
```

If you changed the host port to `5433`, the expected output becomes:

```text
postgresql+psycopg://rahasia:rahasia@localhost:5433/rahasia
```

This confirms:

- `.env` is being read
- `pydantic-settings` is configured correctly
- the backend can access the database URL it will use in later steps

### 8. Stop here

You can leave Postgres running if you want.

If you want to stop it:

```bash
docker compose down
```

If you want to stop it and remove the named volume too:

```bash
docker compose down -v
```

Be careful with `-v`, because it deletes local database data.

---

## Expected Result

After this step, the repo should contain at least:

```text
docker-compose.yml
backend/
  .env.example
  app/
    core/
      __init__.py
      config.py
    db/
      __init__.py
      session.py
  pyproject.toml
  uv.lock
```

Your local machine should also have:

- `backend/.env` for local development only
- a running local Postgres container if you started it

---

## What Not To Do Yet

- Do not add Alembic yet
- Do not define models yet
- Do not create DB tables yet
- Do not add business endpoints yet

This step is only local Postgres setup plus backend configuration.

---

## Port Conflict Troubleshooting

If `docker compose up -d` fails with:

```text
failed to bind host port 0.0.0.0:5432/tcp: address already in use
```

that means something else on your machine is already using host port `5432`.

### Option A: Change this project to port `5433` (recommended)

This is the safest option if you do not know what is already using `5432`.

Change:

- `docker-compose.yml` from `5432:5432` to `5433:5432`
- `backend/.env.example` from `localhost:5432` to `localhost:5433`
- `backend/.env` from `localhost:5432` to `localhost:5433`

Then retry:

```bash
docker compose up -d
docker compose ps
```

### Option B: Identify and stop the existing service

If you want to keep this project on `5432`, first find what is already using that port.

Useful commands:

```bash
lsof -iTCP:5432 -sTCP:LISTEN -n -P
```

or:

```bash
ss -ltnp | grep 5432
```

Common possibilities:

- a locally installed PostgreSQL service
- another Docker container
- another project stack

If it is an existing Docker container:

```bash
docker ps
docker stop <container_name_or_id>
```

If it is a system PostgreSQL service, the stop command depends on your OS and service manager.

Only stop it if you know you do not need it right now.

### Option C: Reuse the existing PostgreSQL instance

If you already have a working local Postgres on `5432`, you can skip Docker entirely and point `DATABASE_URL` at that existing database.

In that case, you still need to make sure:

- the database exists
- the username/password are correct
- you have permission to connect

For this project, Option A is usually the least disruptive.

---

## Verification

Before committing:

```bash
git status --short
find backend -maxdepth 3 -type f -not -path 'backend/.venv/*' | sort
sed -n '1,220p' docker-compose.yml
sed -n '1,220p' backend/.env.example
sed -n '1,220p' backend/app/core/config.py
sed -n '1,220p' backend/app/db/session.py
```

Make sure:

- `docker-compose.yml` exists at the repo root
- `backend/.env.example` exists
- `backend/.env` exists locally but is not tracked
- `sqlalchemy` and `psycopg[binary]` were added
- `app/core/config.py` loads `DATABASE_URL`
- `app/db/session.py` returns the configured database URL

---

## Finish This Step

From the repo root:

```bash
git add docker-compose.yml backend
git commit -m "chore: add local postgres setup"
```

---

## Commit Message

```text
chore: add local postgres setup
```
