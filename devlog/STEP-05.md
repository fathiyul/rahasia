# STEP-05

## Goal

Set up Alembic for database migrations and connect it to the backend’s SQLAlchemy configuration.

This step should leave you with:

- Alembic installed in `backend/`
- `alembic.ini` and `alembic/` scaffolded
- a shared SQLAlchemy base class
- a real database engine/session setup
- Alembic reading the database URL from backend settings

This step does **not** include:

- the `Share` model
- any actual application tables
- the first real migration for app data

That comes in the next step.

---

## Starting Point

Expected starting state:

- Step 4 is already committed
- repo is clean before starting
- local Postgres setup exists
- `backend/.env` already points to your local Postgres instance

Check:

```bash
git status --short
git log --oneline --decorate -n 4
```

You should see:

- clean working tree
- latest commit: `chore: add local postgres setup`

---

## Do This

### 1. Add Alembic

From `backend/`:

```bash
uv add alembic
```

Then verify:

```bash
cat pyproject.toml
```

Expected change:

- `alembic` appears under `[project].dependencies`

### 2. Initialize Alembic

From `backend/`:

```bash
uv run alembic init alembic
```

Expected generated files:

```text
backend/
  alembic.ini
  alembic/
    env.py
    README
    script.py.mako
    versions/
```

Because `alembic/versions/` starts empty, add a placeholder so Git can track it:

```bash
touch alembic/versions/.gitkeep
```

Then verify:

```bash
find alembic -maxdepth 2 -type f | sort
ls
```

### 3. Add a shared SQLAlchemy base

From `backend/`:

```bash
touch app/db/base.py
```

Write this code in `backend/app/db/base.py`:

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

What this does:

- defines the shared SQLAlchemy declarative base
- gives Alembic a single metadata source to inspect later

### 4. Replace the temporary DB helper with a real engine/session setup

From `backend/`:

```bash
touch app/db/session.py
```

Replace the current contents of `backend/app/db/session.py` with:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_database_url() -> str:
    return settings.database_url
```

What this does:

- creates a shared SQLAlchemy engine
- creates a reusable session factory for later API/database work
- keeps `get_database_url()` available for quick verification

### 5. Update the Alembic config file

From `backend/`:

```bash
sed -n '1,120p' alembic.ini
```

Make sure the `[alembic]` section includes:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
```

If `prepend_sys_path = .` is missing, add it.

Why this matters:

- it makes `app.*` imports work when Alembic runs from the `backend/` directory

You do **not** need to hardcode the real database URL in `alembic.ini`.

The next file will inject it from backend settings.

### 6. Replace the generated Alembic environment file

From `backend/`:

```bash
touch alembic/env.py
```

Replace the contents of `backend/alembic/env.py` with:

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

What this does:

- imports the app settings
- injects the real `DATABASE_URL` into Alembic
- points Alembic to `Base.metadata`
- enables autogenerate support for future models

### 7. Start Postgres if it is not already running

From the repo root:

```bash
docker compose up -d
docker compose ps
```

Expected result:

- the Postgres service is running
- if you used the earlier workaround, the host port should be `5433`

Example output shape:

```text
NAME               IMAGE                COMMAND                  SERVICE    STATUS         PORTS
rahasia-postgres   postgres:17-alpine   "docker-entrypoint.s…"   postgres   Up ...         0.0.0.0:5433->5432/tcp
```

### 8. Verify Alembic can load your config and connect

From `backend/`:

```bash
uv run alembic current
```

Expected result:

- the command runs without import errors
- the command connects to Postgres
- there may be no current revision yet, which is normal

Example output shape:

```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
```

No revision output is acceptable at this stage because you have not created any migration files yet.

### 9. Optional sanity checks

From `backend/`:

```bash
uv run ruff check
uv run pytest
```

Expected result:

- `ruff` passes
- `pytest` may still report that there are no tests, which is fine

---

## Expected Result

After this step, `backend/` should contain at least:

```text
backend/
  alembic.ini
  alembic/
    env.py
    README
    script.py.mako
    versions/
      .gitkeep
  app/
    db/
      __init__.py
      base.py
      session.py
  pyproject.toml
  uv.lock
```

Important state after this step:

- Alembic is installed
- Alembic imports your app config successfully
- Alembic is ready to autogenerate migrations once you add real models

---

## What Not To Do Yet

- Do not create the `Share` model yet
- Do not create a migration revision yet
- Do not add app tables yet

This step is only migration infrastructure.

The first real migration happens in the next step, once the `Share` model exists.

---

## Verification

Before committing:

```bash
git status --short
find backend -maxdepth 3 -type f -not -path 'backend/.venv/*' -not -path 'backend/.pytest_cache/*' -not -path 'backend/.ruff_cache/*' | sort
sed -n '1,220p' backend/alembic.ini
sed -n '1,260p' backend/alembic/env.py
sed -n '1,220p' backend/app/db/base.py
sed -n '1,220p' backend/app/db/session.py
```

Make sure:

- `alembic.ini` exists
- `alembic/env.py` uses `settings.database_url`
- `app/db/base.py` defines `Base`
- `app/db/session.py` defines `engine` and `SessionLocal`
- `alembic/versions/.gitkeep` exists
- `uv run alembic current` works without errors

---

## Finish This Step

From the repo root:

```bash
git add backend
git commit -m "chore: add database migration setup"
```

---

## Commit Message

```text
chore: add database migration setup
```
