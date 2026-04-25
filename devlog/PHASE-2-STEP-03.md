# PHASE-2-STEP-03

## Goal

Add the backend user model and the first username rules for Phase 2.

This step should leave you with:

- a new `User` SQLAlchemy model
- a backend-only username normalization and validation helper
- the user model registered in the metadata import path
- a new Alembic migration that creates the `users` table

This step does **not** include:

- Clerk integration
- authenticated API routes
- frontend username onboarding
- group models
- invite logic

---

## Starting Point

Expected starting state:

- `PHASE-2-STEP-02` is already committed
- the backend still only knows about the Phase 1 `Share` model
- `backend/app/models/__init__.py` exports only `Share`
- there is only one Alembic migration so far, for `shares`
- no backend code yet defines a `User` model or reusable username rules

Check:

```bash
git status --short
sed -n '1,220p' backend/app/models/share.py
sed -n '1,120p' backend/app/models/__init__.py
find backend/alembic/versions -maxdepth 1 -type f | sort
```

You should see:

- a clean working tree
- the existing `Share` model
- no `backend/app/models/user.py`
- only the Phase 1 migration file in `backend/alembic/versions/`

Why this matters:

Phase 2 cannot build groups, invites, or ownership on top of Google identity alone. The app needs its own internal user record first. That user record becomes the stable application identity that later features reference.

---

## Do This

### 1. Create a backend username helper module

The username rules should not be buried inside one future API handler.

If you scatter normalization and validation logic later, you will end up with inconsistent behavior between:

- first-login username creation
- invite-by-username
- future rename flows if they ever exist

Create:

- `backend/app/core/username.py`

This file should do two jobs:

1. normalize a candidate username
2. validate whether the normalized username follows the Phase 2 rules

For Phase 2, keep the rules simple:

- lowercase only
- allowed characters: letters, numbers, `_`, `.`
- minimum length: 3
- maximum length: 30

Write this code in `backend/app/core/username.py`:

```python
import re


USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = re.compile(r"^[a-z0-9._]{3,30}$")


def normalize_username(value: str) -> str:
    return value.strip().lower()


def is_valid_username(value: str) -> bool:
    normalized = normalize_username(value)
    return bool(USERNAME_PATTERN.fullmatch(normalized))
```

Why this exact shape:

- normalization is explicit and reusable
- validation stays deterministic
- later steps can build error messages on top of this helper without redefining the rules

This helper is intentionally small. Do not add reserved-name logic yet unless you already have a concrete reserved-word list worth maintaining.

### 2. Create the `User` model

The app needs an internal user table even though Google login is the external authentication method.

That table should store:

- internal app ID
- auth provider name
- auth provider user ID
- email
- username
- display name
- avatar URL
- created timestamp
- last-login timestamp

Create:

- `backend/app/models/user.py`

Write this code in `backend/app/models/user.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    auth_provider: Mapped[str] = mapped_column(String(50), nullable=False)
    auth_provider_user_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

Why this model is enough for now:

- it supports app-level identity without requiring groups yet
- it supports unique usernames for invites later
- it stays compatible with future auth-provider-backed login flows

Do not add group relationships in this step. Those belong in the next data-model steps.

### 3. Register the user model in the metadata import path

Alembic only sees models that are imported into the metadata graph used by your app.

Right now `backend/app/models/__init__.py` only exports `Share`, so add `User` there too.

Update `backend/app/models/__init__.py` to:

```python
from app.models.share import Share
from app.models.user import User

__all__ = ["Share", "User"]
```

This step matters because forgetting the model import is one of the easiest ways to think you added a model while Alembic still sees nothing.

### 4. Add the first user migration

Now that the model exists, generate a new Alembic revision.

From `backend/`:

```bash
uv run alembic revision --autogenerate -m "create users table"
```

This should create a new file under:

- `backend/alembic/versions/`

Open the generated migration and confirm it creates:

- `users`
- unique constraints for `auth_provider_user_id`
- unique constraints for `email`
- unique constraints for `username`

The migration should look broadly like this:

```python
"""create users table

Revision ID: <new_revision_id>
Revises: 48444444fac2
Create Date: <timestamp>

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "<new_revision_id>"
down_revision: Union[str, Sequence[str], None] = "48444444fac2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("auth_provider", sa.String(length=50), nullable=False),
        sa.Column("auth_provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_provider_user_id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )


def downgrade() -> None:
    op.drop_table("users")
```

Do not hand-edit the migration unless the autogenerated output is clearly wrong. The main goal is to confirm the schema shape, not to over-customize it.

### 5. Apply the migration locally

The migration should be applied now, while the change is still small and easy to verify.

From `backend/`:

```bash
uv run alembic upgrade head
```

Why apply it now:

- you confirm the migration chain is still healthy
- you catch metadata or import mistakes early
- later auth work can assume the user table already exists

### 6. Keep the step boundary strict

This step is about backend identity storage only.

Do not:

- call Clerk yet
- create user API routes yet
- create username onboarding screens yet
- create group tables yet
- add invite logic yet

That work becomes simpler once this table and helper exist.

---

## Expected Result

After this step:

- `backend/app/core/username.py` exists
- `backend/app/models/user.py` exists
- `backend/app/models/__init__.py` exports `User`
- a new Alembic migration creates the `users` table
- `uv run alembic upgrade head` succeeds

---

## What Not To Do Yet

Do not:

- add backend dependencies for auth verification yet
- add user-facing schemas or routes yet
- store group ownership data yet
- add reserved username logic unless you truly need it now

This step should stay focused on the minimum identity persistence layer.

---

## Verification

Run:

```bash
sed -n '1,220p' backend/app/core/username.py
sed -n '1,220p' backend/app/models/user.py
sed -n '1,120p' backend/app/models/__init__.py
find backend/alembic/versions -maxdepth 1 -type f | sort
cd backend
uv run alembic upgrade head
```

Expected result:

- the username helper exists with normalization and validation functions
- the `User` model exists with unique `auth_provider_user_id`, `email`, and `username`
- the new migration file exists and revises the shares migration
- Alembic upgrades cleanly to the latest head

Success looks like:

- the backend now has a stable internal user identity model
- future auth and invite steps have a real persistence target
- the migration chain still works

---

## Finish This Step

Stage the backend identity files:

```bash
git add backend/app/core/username.py backend/app/models/user.py backend/app/models/__init__.py backend/alembic/versions devlog/PHASE-2-STEP-03.md
```

Then commit:

```bash
git commit -m "feat: add user model and username rules"
```
