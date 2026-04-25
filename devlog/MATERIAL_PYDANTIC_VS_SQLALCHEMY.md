# MATERIAL_PYDANTIC_VS_SQLALCHEMY

## Purpose

This document explains the different kinds of “models” or structured data objects you may use in a Python backend.

It focuses on:

- Pydantic models
- SQLAlchemy models
- `typing` types
- dataclasses
- plain Python classes

The main goal is to answer:

- what each one is for
- why they are different
- when to use which one in this project

This is a concept/reference document, not a build checklist.

---

## 1. The Core Confusion

In Python backend work, people use the word “model” for several different things.

That causes confusion because these objects may all look similar:

- they have fields
- they hold data
- they are class-based

But they exist for different layers of the system.

For example, these are not the same thing:

- a request body validator
- a database table definition
- a type hint
- a simple container for internal data

So the first rule is:

**Similar syntax does not mean similar responsibility.**

---

## 2. The Big Distinction

In this project, the most important distinction is:

- Pydantic models are for the API/data validation layer
- SQLAlchemy models are for the persistence/database layer

That is the core separation to keep in your head.

---

## 3. Pydantic Models

Example shape:

```python
from pydantic import BaseModel


class CreateShareRequest(BaseModel):
    type: str
    encrypted_payload: str
    expires_in: int
```

What a Pydantic model is for:

- validating incoming data
- parsing JSON into Python objects
- validating outgoing response shapes
- documenting API contracts

Typical use cases:

- request bodies
- response bodies
- config/settings objects
- structured external input

What it is **not** for:

- defining database tables
- tracking SQL schema changes
- ORM persistence

In this project, examples include:

- `CreateShareRequest`
- `CreateShareResponse`
- `Settings`

---

## 4. SQLAlchemy Models

Example shape:

```python
class Share(Base):
    __tablename__ = "shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    encrypted_payload: Mapped[str] = mapped_column(Text, nullable=False)
```

What a SQLAlchemy model is for:

- defining database tables
- mapping Python objects to DB rows
- querying and persisting data
- generating schema metadata for Alembic

Typical use cases:

- application persistence
- ORM queries
- migrations

Examples with `Share`:

Application persistence:

```python
share = Share(
    id="some-id",
    type="text",
    encrypted_payload="ciphertext",
    expires_at=expires_at,
    burn_after_read=False,
)

db.add(share)
db.commit()
db.refresh(share)
```

What this means:

- create a Python `Share` object
- tell SQLAlchemy to insert it into the database
- commit the transaction
- refresh it from the DB

ORM queries:

```python
from sqlalchemy import select

statement = select(Share).where(Share.id == share_id)
share = db.execute(statement).scalar_one_or_none()
```

What this means:

- ask SQLAlchemy for a `Share` row matching a given ID
- return it as a Python object or `None`

Migrations:

```python
from app import models  # noqa: F401
from app.db.base import Base

target_metadata = Base.metadata
```

What this means:

- importing `models` loads `Share`
- `Share` registers the `shares` table on `Base.metadata`
- Alembic can inspect that metadata and generate schema changes

What it is **not** for:

- validating JSON request bodies
- shaping API responses directly

In this project, example:

- `Share`

---

## 5. Why Pydantic And SQLAlchemy Should Be Separate

They represent different boundaries.

### Pydantic answers:

- what does the API accept?
- what does the API return?

### SQLAlchemy answers:

- what is stored in the database?
- what columns exist?
- what constraints/defaults exist?

Those are related questions, but not identical.

Example from this project:

- API input might use `expires_in`
- database stores `expires_at`

Those are not the same concept.

`expires_in`:

- API-facing
- “how many seconds from now?”

`expires_at`:

- database-facing
- “what exact timestamp should be stored?”

So the system flow is:

1. client sends JSON
2. Pydantic validates/parses it
3. service logic transforms it
4. SQLAlchemy model is created and stored
5. response is shaped back through a response schema

---

## 6. What About `typing`?

The `typing` module is different again.

It does **not** usually create runtime validation or persistence by itself.

It mainly describes type intent to:

- humans
- editors/IDEs
- static type checkers

Examples:

```python
str
int | None
Literal["text", "file"]
TypedDict
Protocol
```

These help describe what data should look like, but they usually do not enforce the rules at runtime by themselves.

### Important note

There is no commonly used general-purpose `Model` class from Python’s standard `typing` module in the way Pydantic has `BaseModel`.

You may be thinking of one of these:

- `TypedDict`
- `Literal`
- `Protocol`
- generic type aliases

Those are typing tools, not API validators or DB models.

---

## 7. `TypedDict`

A `TypedDict` describes the expected shape of a dictionary.

Example:

```python
from typing import TypedDict


class SharePayload(TypedDict):
    type: str
    encrypted_payload: str
```

What it is good for:

- internal typed dict structures
- static checking
- describing plain dict shapes

What it is not:

- runtime validation
- ORM model
- migration-aware schema

So if you use `TypedDict`, it mostly helps your editor and type checker.

It does not replace Pydantic or SQLAlchemy.

---

## 8. Dataclasses

Example:

```python
from dataclasses import dataclass


@dataclass
class ShareInfo:
    id: str
    expires_at: str
```

Dataclasses are good for:

- internal data containers
- simple structured Python objects
- passing data around within the app

They are lighter than Pydantic and not tied to the DB like SQLAlchemy.

What they do not do automatically:

- validate request JSON like Pydantic
- define tables like SQLAlchemy

They are useful for internal domain/service-layer objects in some architectures.

This project may not need them early on.

---

## 9. Plain Python Classes

You can also just use ordinary classes.

Example:

```python
class ShareResult:
    def __init__(self, id: str) -> None:
        self.id = id
```

These are maximally flexible, but you get less built-in support.

Compared with other options:

- less validation than Pydantic
- less convenience than dataclasses
- no DB mapping like SQLAlchemy

Use them when you need custom behavior, not just data structure.

---

## 10. Where Each One Fits In This Project

### Pydantic

Use for:

- request schemas
- response schemas
- app settings/config

Examples:

- `CreateShareRequest`
- `CreateShareResponse`
- `Settings`

### SQLAlchemy

Use for:

- persisted tables
- ORM queries
- migration metadata

Example:

- `Share`

### `typing`

Use for:

- type annotations
- constrained string choices with `Literal`
- optionality
- internal type clarity

Examples:

- `Literal["text", "file"]`
- `str | None`
- `Generator[Session, None, None]`

### Dataclasses

Use only if you later want:

- internal non-DB structured objects
- service-layer transfer objects

Not necessary yet.

### Plain classes

Use when you need:

- behavior-heavy objects
- custom methods and state

Also not necessary yet for this project.

---

## 11. Common Mistakes

### 11.1 Using SQLAlchemy models as API schemas

Problem:

- couples API contract to DB schema
- exposes internal fields too easily
- makes request validation awkward

### 11.2 Using Pydantic models as database models

Problem:

- Pydantic validates data
- it does not define tables or ORM behavior

### 11.3 Assuming type hints do runtime validation

Problem:

- `typing` hints alone do not usually enforce anything at runtime

Example:

```python
def f(x: int) -> None:
    ...
```

Python will still let you call `f("abc")` unless you add runtime validation.

### 11.4 Thinking all “models” are interchangeable

Problem:

- each one belongs to a different layer
- mixing responsibilities creates messy boundaries

---

## 12. A Good Mental Model

Use this:

- Pydantic model = API contract / validated external data
- SQLAlchemy model = database record / persistence structure
- `typing` = type intent and static clarity
- dataclass = lightweight internal data object
- plain class = custom behavior object

That model is simple and good enough for most backend work.

---

## 13. Practical Rule For This Repo

For Rahasia:

1. use Pydantic for request/response and settings
2. use SQLAlchemy for persisted database tables
3. use `typing` annotations everywhere for clarity
4. do not introduce dataclasses or extra internal model layers unless there is a real need

That keeps the architecture simple.

### Extra note: LLM structured output

If you are handling structured output from an LLM, that usually belongs on the Pydantic side, not the dataclass side.

Why:

- LLM output is external input
- it may be missing fields
- it may return the wrong types
- it often needs schema validation before the app should trust it

So for LLM structured output, `BaseModel` is usually the better fit because it gives you:

- runtime validation
- parsing into Python objects
- clearer validation errors
- schema generation in systems that need a formal output schema

A dataclass can still hold trusted data after validation, but it is usually not the first tool for verifying raw LLM output.

---

## 14. Short Decision Guide

If the question is:

- “What JSON can the client send?”  
  Use Pydantic

- “What columns does the database table have?”  
  Use SQLAlchemy

- “How do I annotate this function or field clearly?”  
  Use `typing`

- “I need a lightweight internal data container not tied to API or DB”  
  Maybe use a dataclass

- “I need a custom object with behavior/methods”  
  Maybe use a plain class

That is the practical distinction.
