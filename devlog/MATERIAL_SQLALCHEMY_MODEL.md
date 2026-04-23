# MATERIAL_SQLALCHEMY_MODEL

## Purpose

This document explains the SQLAlchemy model layer used in this project.

It focuses on:

- what a model is
- why the backend needs models
- how models relate to database tables
- what `Base`, `Mapped`, and `mapped_column` mean
- how models relate to Alembic migrations
- how models differ from Pydantic schemas

This is a concept/reference document, not a build checklist.

---

## 1. The Core Problem

The backend needs a structured way to describe persistent data.

In this project, we need to store things like:

- share IDs
- encrypted payloads
- file metadata
- expiration timestamps
- burn-after-read flags

You could describe this directly in raw SQL every time, but then your application code and your database structure become harder to keep aligned.

So the model layer exists to give the backend one consistent representation of application data.

---

## 2. What A Model Is

A SQLAlchemy model is a Python class that describes a database table.

Example idea:

- Python class: `Share`
- database table: `shares`

The model describes:

- table name
- column names
- column types
- nullability
- defaults
- keys and constraints

So a model is not “just a Python object.”

It is a Python class that SQLAlchemy uses to map between:

- Python-side data objects
- database rows

That is why this is called an ORM layer:

- **Object Relational Mapper**

It maps:

- objects in code
- to relational database tables

---

## 3. Why This Project Needs Models

The backend has several responsibilities:

- receive requests
- validate and process data
- store persistent records
- query and update stored records

Without models, you would end up doing one of these:

- raw SQL everywhere
- ad hoc dict structures everywhere
- duplicated definitions between Python and SQL

Models solve that by giving the backend:

- one canonical data structure
- one source of schema intent
- something Alembic can inspect for migrations

So in this project, the model layer is the bridge between:

- the business domain
- the database schema

---

## 4. What `Base` Is

In this project, models inherit from:

```python
from app.db.base import Base
```

`Base` is the shared SQLAlchemy declarative base.

It does two important things:

1. it gives SQLAlchemy a common parent class for all models
2. it collects table metadata from those models

That collected metadata lives in:

```python
Base.metadata
```

This is critical because Alembic uses `Base.metadata` to understand what tables your application defines.

So:

- model inherits from `Base`
- SQLAlchemy registers it
- Alembic can inspect it

---

## 5. What `Mapped[...]` Means

In modern SQLAlchemy, model attributes are often written like this:

```python
id: Mapped[str]
```

`Mapped[...]` is the typing-aware way to say:

- this attribute is an ORM-mapped column

So:

```python
id: Mapped[str]
```

means:

- this field is mapped by SQLAlchemy
- Python code should treat it as a `str`

This is better than older untyped model patterns because it:

- works better with type checkers
- makes intent clearer
- matches current SQLAlchemy style

---

## 6. What `mapped_column(...)` Means

Example:

```python
id: Mapped[str] = mapped_column(String(36), primary_key=True)
```

`mapped_column(...)` defines the actual database column details.

This is where you specify things like:

- SQL type
- `nullable`
- `primary_key`
- `default`
- `server_default`

So the full line combines two things:

- the Python-side type intent: `Mapped[str]`
- the database-side column definition: `mapped_column(...)`

---

## 7. Reading A Model Line

Take this:

```python
file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

It means:

- Python side: `file_size` is either `int` or `None`
- database side: the column type is `INTEGER`
- database side: null values are allowed

So when reading model code, always think in two layers:

1. what type Python expects
2. what type/constraint the database enforces

---

## 8. Why `Share` Has The Fields It Has

The `Share` model exists to represent one persisted share record.

Each field exists for a reason.

### `id`

- the public share identifier
- used in URLs and API lookups

### `type`

- tells the backend whether this is text or file content

### `encrypted_payload`

- holds the encrypted content or encrypted payload representation

### `file_name`, `file_size`, `mime_type`

- only relevant when the share is a file
- lets the backend preserve useful file metadata

### `expires_at`

- tells the backend when the share becomes invalid

### `burn_after_read`

- tells the backend whether this share should only be retrievable once

### `is_deleted`

- lets the backend mark the share unavailable without immediately physically deleting data

### `read_at`

- records when the share was first consumed

### `created_at`

- records when the share was created

---

## 9. `nullable`, `default`, and `server_default`

These are easy to confuse.

### `nullable`

Example:

```python
file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

Means:

- the database allows `NULL`

### `default`

Example:

```python
default=False
```

Means:

- Python/SQLAlchemy can use this value if you create the object without explicitly providing one

### `server_default`

Example:

```python
server_default="false"
```

Means:

- the database itself has a default value if the column is omitted in SQL

This matters because some operations happen closer to Python, while some happen directly at the database level.

In many cases, it is useful to have both `default` and `server_default`.

---

## 10. Why `created_at` Uses `func.now()`

Example:

```python
created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=func.now(),
)
```

This means:

- the database sets the timestamp automatically when the row is created

Why this is useful:

- avoids relying only on application-side clock handling
- keeps creation timestamps consistent at the DB layer

---

## 11. Why Model Code And Migration Code Are Separate

This is important.

The model describes:

- what the application thinks the schema should look like now

The migration describes:

- how to move the actual database from one version to another

So:

- models are current schema intent
- migrations are schema change history

You need both.

If you only have models:

- you know the desired shape
- but not how to move a real DB to that shape safely

If you only have migrations:

- you have historical change records
- but not a clean application-side schema definition

---

## 12. Why Models Must Be Imported For Alembic

Alembic autogenerate looks at:

```python
Base.metadata
```

But a model only becomes part of `Base.metadata` once its module is imported.

That is why this import matters in `alembic/env.py`:

```python
from app import models  # noqa: F401
```

It is there for side effects:

- import models package
- import `Share`
- register `shares` table with `Base.metadata`

Without that, Alembic may not detect the table at all.

---

## 13. Model vs Pydantic Schema

This is one of the most important distinctions.

### SQLAlchemy Model

Represents:

- persisted database structure

Used for:

- tables
- rows
- ORM queries
- schema metadata
- migrations

### Pydantic Schema

Represents:

- API input/output data shape

Used for:

- request validation
- response serialization
- API contracts

So:

- SQLAlchemy model = database layer
- Pydantic schema = API layer

Do not treat them as the same thing.

In this project:

- `Share` model is for persistence
- later request/response schemas will be separate

---

## 14. What Happens If You Skip Models

You could use raw SQL instead.

That works, but you lose some structure and consistency.

Tradeoffs:

### Raw SQL approach

Pros:

- very explicit
- no ORM abstraction

Cons:

- more boilerplate
- schema intent is less centralized
- harder integration with Alembic autogenerate
- more repetitive code for CRUD work

For this project, SQLAlchemy models are a reasonable middle ground.

---

## 15. Alternatives

Alternatives to this model setup include:

- raw SQL with hand-written SQL migrations
- SQLModel
- Django ORM
- Prisma on a different stack

Why SQLAlchemy is a good fit here:

- standard in the FastAPI ecosystem
- flexible
- works naturally with Alembic
- good long-term option for Postgres-backed apps

---

## 16. Mental Model To Keep

Use this mental model:

- model class = definition of a table in Python
- model fields = definitions of columns
- `Base.metadata` = registry of known tables
- Alembic = compares/apply schema changes based on that metadata
- database = the real persisted state

That is the relationship.

---

## 17. Practical Rule For This Project

When you add or change persistent data structure:

1. update the SQLAlchemy model
2. make sure the model is imported for Alembic
3. generate a migration
4. inspect the migration
5. apply it
6. verify the DB state

That is the expected workflow.
