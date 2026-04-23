# MATERIAL_ALEMBIC

## Purpose

This document explains:

- what database migrations are
- why they exist
- why this project uses Alembic
- what `uv run alembic ...` is doing
- how the `revision`, `upgrade`, and `downgrade` flow works
- what the generated migration file means
- what happens if you skip migrations
- what alternatives exist

This is not a step-by-step build checklist.

It is a concept/reference document for someone who has not worked with Alembic or schema migrations before.

---

## 1. The Core Problem

Your backend code and your database schema must stay in sync.

Example:

- your Python model says `shares` has columns `id`, `type`, and `expires_at`
- but your real database only has `id` and `type`

Now your code and your database disagree.

That problem is called **schema drift**.

Schema drift causes things like:

- runtime errors
- broken deploys
- missing columns
- failed inserts
- hard-to-reproduce local environments

So the real problem is not “how do I create a table once?”

The real problem is:

**How do I evolve the database schema over time, in a repeatable and tracked way?**

That is what migrations solve.

---

## 2. What A Migration Is

A migration is a versioned description of a database schema change.

Examples:

- create a table
- add a column
- change a column type
- add an index
- remove a constraint

Think of a migration as:

- a Git commit, but for database structure

Instead of saying:

- “I think I created this table manually a few days ago”

you can say:

- “the database is at revision `abc123`, and that revision creates the `shares` table”

That makes schema changes:

- explicit
- reviewable
- reproducible
- deployable

---

## 3. Why This Project Uses Alembic

This project uses:

- FastAPI
- SQLAlchemy
- PostgreSQL

Alembic is the standard migration tool commonly paired with SQLAlchemy.

Why it fits here:

- it understands SQLAlchemy metadata
- it can generate migration files from model changes
- it keeps a revision history
- it can apply or roll back revisions

So Alembic is the layer that connects:

- your Python model definitions
- your actual PostgreSQL schema

---

## 4. What Happens Without Migrations

You could skip Alembic and create tables manually.

That usually becomes painful quickly.

Without migrations, you end up with problems like:

- one developer’s database is different from another’s
- production schema changes are done manually and inconsistently
- nobody remembers exactly what changed
- deploys depend on tribal knowledge
- rolling back schema changes is messy

In a solo project, you can sometimes get away with manual SQL early on.

But once the schema changes more than once or twice, migrations become much safer and more maintainable.

---

## 5. The Main Alembic Ideas

There are a few concepts to understand.

### 5.1 Model Metadata

SQLAlchemy models register themselves in metadata.

In this project:

- `Base` is the shared declarative base
- models like `Share` attach table definitions to `Base.metadata`

Alembic autogenerate compares:

- the metadata in Python
- the current schema in the database

Then it proposes a migration.

### 5.2 Revision

A **revision** is one migration file with a unique ID.

Example idea:

- revision `a1b2c3d4` creates the `shares` table

Alembic stores revision history in:

- migration files in `alembic/versions/`
- the `alembic_version` table in the database

### 5.3 Head

`head` means:

- the latest migration revision in your codebase

If your DB is at `head`, it has all currently applied migrations.

### 5.4 Upgrade

`upgrade` means:

- move the database schema forward to a newer revision

### 5.5 Downgrade

`downgrade` means:

- move the database schema backward to an older revision

---

## 6. Why `alembic/env.py` Exists

`alembic/env.py` is the file that tells Alembic how to connect your project to the database and model metadata.

In this project, it does three important things:

1. load the real database URL from app settings
2. point Alembic at `Base.metadata`
3. make sure models are imported before metadata is read

This is why the import below matters:

```python
from app import models  # noqa: F401
```

It looks unused, but it is there for a side effect:

- importing `app.models`
- imports `Share`
- which registers the table on `Base.metadata`

Without that import, Alembic may think there are no models.

---

## 7. What `uv run alembic ...` Means

`uv run` means:

- run a command inside this project’s Python environment and dependency context

So:

```bash
uv run alembic current
```

means:

- use the project's installed dependencies from `pyproject.toml` / `uv.lock`
- run the `alembic` CLI from that environment
- do not rely on some random globally installed Alembic

That matters because it keeps commands tied to the project’s actual dependency versions.

So when you run:

```bash
uv run alembic revision --autogenerate -m "create shares table"
```

you are saying:

- run the Alembic CLI in this backend project environment
- inspect the current database and SQLAlchemy metadata
- generate a new revision file
- attach the human-readable message `"create shares table"`

---

## 8. What The Common Alembic Commands Mean

### 8.1 `uv run alembic current`

Purpose:

- show what revision the database is currently at

If there are no app migrations yet, it may just show connection info and no current app revision.

### 8.2 `uv run alembic revision --autogenerate -m "create shares table"`

Purpose:

- create a new migration file by comparing metadata vs DB schema

Parts:

- `revision`: create a new migration revision
- `--autogenerate`: inspect models and DB and generate operations automatically
- `-m "create shares table"`: add a readable message to the migration filename/header

Important:

- autogenerate is helpful, not magical
- you still need to inspect the generated migration

### 8.3 `uv run alembic upgrade head`

Purpose:

- apply migrations until the database reaches the latest revision in the codebase

If the new revision creates the `shares` table, this command actually runs that schema change against Postgres.

### 8.4 `uv run alembic downgrade -1`

Purpose:

- roll back one migration step

This is useful in development when you need to undo the most recent schema change.

Use carefully.

---

## 9. What The Generated Migration File Is

When you run:

```bash
uv run alembic revision --autogenerate -m "create shares table"
```

Alembic creates a file in:

```text
alembic/versions/
```

The filename will look something like:

```text
3f8a1b7c2d4e_create_shares_table.py
```

The exact revision ID will vary.

That file is a Python script that describes how to move the schema:

- forward
- backward

This is why you see:

- `upgrade()`
- `downgrade()`

---

## 10. What `upgrade()` Means

`upgrade()` describes:

- how to move the database schema forward into this revision

For a “create shares table” migration, `upgrade()` usually contains something like:

- `op.create_table("shares", ...)`

Meaning:

- when this migration is applied, create the `shares` table with these columns and constraints

So `upgrade()` is not just a label.

It is the actual forward schema change.

---

## 11. What `downgrade()` Means

`downgrade()` describes:

- how to undo this revision and move the schema backward

For a “create shares table” migration, `downgrade()` usually contains something like:

- `op.drop_table("shares")`

Meaning:

- if you roll back this migration, remove the `shares` table

So:

- `upgrade()` = apply this schema change
- `downgrade()` = undo this schema change

You can think of them as:

- forward path
- reverse path

---

## 12. How Alembic Knows What Has Been Applied

Alembic creates and uses a table named:

```text
alembic_version
```

That table stores the currently applied revision ID.

So after:

```bash
uv run alembic upgrade head
```

Alembic:

1. checks the current revision in `alembic_version`
2. looks at available revision files
3. figures out what migrations are still pending
4. runs them in order
5. updates `alembic_version`

That is how it tracks schema state over time.

---

## 13. What We Are Doing In Step 6, Conceptually

Step 6 is doing this:

1. define the `Share` model in Python
2. make sure Alembic can discover that model
3. ask Alembic to generate a migration from that model
4. inspect the generated migration
5. apply the migration to Postgres
6. confirm the DB now contains the `shares` table

So Step 6 is the first time the project goes from:

- app code only

to:

- app code plus a real application table in the database

---

## 14. Why Not Just Call `Base.metadata.create_all()`?

That is a common alternative in small projects.

`Base.metadata.create_all()` means:

- ask SQLAlchemy to create missing tables directly from metadata

Why people use it:

- simple
- fast for prototypes

Why this project is not using it as the main schema strategy:

- it does not produce versioned migration files
- it is weaker for evolving existing schemas
- it is not ideal for tracked deploys
- it does not give you an explicit rollback history

`create_all()` is acceptable for throwaway prototypes.

Alembic is better once you care about:

- repeatability
- deployability
- schema history

---

## 15. Alternatives To Alembic

Alembic is not the only migration tool.

Other approaches include:

- manual SQL migration files
- Django migrations
- Prisma Migrate
- Flyway
- Liquibase
- SQLModel/ORM-specific wrappers

Why Alembic is the right fit here:

- this project already uses SQLAlchemy
- Alembic is the standard migration tool in that ecosystem
- it integrates naturally with FastAPI + SQLAlchemy + Postgres

---

## 16. What Can Go Wrong

Common migration issues:

### 16.1 Model not imported

Symptom:

- autogenerate detects nothing

Cause:

- the model never got imported, so it never registered with `Base.metadata`

### 16.2 Wrong database URL

Symptom:

- Alembic runs against the wrong database

Cause:

- config/env mismatch

### 16.3 Blind trust in autogenerate

Symptom:

- migration file is wrong or incomplete

Cause:

- autogenerate is a helper, not a guarantee

Always inspect the generated file.

### 16.4 Applying unreviewed destructive changes

Symptom:

- dropped columns or tables unexpectedly

Cause:

- a migration was generated and applied without review

---

## 17. Mental Model To Keep

Think of the flow like this:

- SQLAlchemy model = what the schema should look like
- Alembic revision = recorded change from one schema version to another
- `upgrade()` = move schema forward
- `downgrade()` = move schema backward
- `alembic_version` = what schema version the DB is currently on

That is the core mental model.

---

## 18. Practical Rule For This Project

When you change the data model:

1. update the SQLAlchemy model
2. make sure Alembic can import it
3. run `uv run alembic revision --autogenerate -m "..."`
4. inspect the generated migration file
5. run `uv run alembic upgrade head`
6. verify the DB state

That is the expected workflow.
