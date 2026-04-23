# STEP-15

## Goal

Add the first real automated test coverage for both backend and frontend.

This step should leave you with:

- backend API tests for create/retrieve/lifecycle behavior
- frontend test tooling
- frontend tests for create and open flows
- regression coverage for wrong-key decryption behavior

This step does **not** include:

- end-to-end browser automation
- CI pipeline setup
- load testing
- exhaustive edge-case coverage

---

## Starting Point

Expected starting state:

- Step 14 is already committed
- app behavior is working manually
- backend has `pytest` installed but no real tests yet
- frontend has no test runner installed yet

Check:

```bash
git status --short
git log --oneline --decorate -n 8
find backend/tests -maxdepth 3 -type f | sort
cat backend/pyproject.toml
cat frontend/package.json
```

You should see:

- clean working tree
- `backend/tests/.gitkeep`
- backend dev dependencies already include `pytest`
- frontend scripts do not yet include any `test` command

---

## Why This Step Exists

By this point, the app has enough behavior that manual testing alone is no longer reliable.

You now have logic that can easily regress:

- share creation
- share retrieval
- expiration handling
- burn-after-read consumption
- text vs file request validation
- browser-side encryption/decryption flows
- wrong-key behavior

This step is about locking the current behavior down so later refactors do not silently break it.

The guiding principle here is:

- test the highest-value flows first
- do not try to test everything at once

So Step 15 should focus on:

- API contract behavior
- lifecycle behavior
- frontend user flows that are easy to break

---

## Do This

### 1. Add backend test infrastructure with an isolated test database

You do not want backend tests mutating your real local app database.

So the backend tests should use:

- a temporary SQLite database
- the real SQLAlchemy models
- FastAPI dependency overrides for `get_db`

This is a good testing shape here because:

- it exercises the real API routes
- it keeps tests fast
- it avoids depending on a running Postgres container for every test

From `backend/`:

```bash
rm -f tests/.gitkeep
mkdir -p tests
touch app/__init__.py
touch tests/conftest.py tests/test_shares_api.py
```

If `backend/app/__init__.py` already exists, keep it. If it does not exist yet, create it now so imports like `from app...` resolve cleanly.

### 2. Create backend test fixtures

This fixture layer is the foundation for all backend API tests.

It should:

- create a temporary SQLite database
- create the tables from `Base.metadata`
- override the app’s `get_db` dependency
- give tests a `TestClient`
- give tests direct access to a database session when they need to force state changes

Write this code in `backend/tests/conftest.py`:

```python
from collections.abc import Generator
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(engine) -> Generator[Session, None, None]:
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    try:
        app.dependency_overrides[get_db] = override_get_db
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
```

Why this works:

- it keeps API tests close to production code
- it avoids patching service functions everywhere
- it makes each test function start from a clean database
- it gives a test direct DB access when you need to force an expired share or inspect stored state

Important separation:

- `app` is imported only in `backend/tests/conftest.py`
- `backend/tests/test_shares_api.py` should use the `client` and `db_session` fixtures
- `backend/tests/test_shares_api.py` should **not** reference `app` directly

### 3. Add backend API tests for the highest-value share flows

These are the API behaviors most worth locking down now:

- create share
- retrieve share
- expired share returns `410`
- burn-after-read share works once and fails on second read
- invalid file payload shape is rejected

Write this code in `backend/tests/test_shares_api.py`:

```python
from datetime import UTC, datetime, timedelta

from app.models.share import Share


def test_create_text_share(client) -> None:
    response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], str)


def test_retrieve_text_share(client) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )
    share_id = create_response.json()["id"]

    response = client.get(f"/shares/{share_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == share_id
    assert data["type"] == "text"
    assert data["encrypted_payload"] == '{"iv":"iv","ciphertext":"cipher"}'


def test_expired_share_returns_410(client, db_session) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 1,
            "burn_after_read": False,
        },
    )
    share_id = create_response.json()["id"]

    share = db_session.get(Share, share_id)
    share.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.commit()

    response = client.get(f"/shares/{share_id}")

    assert response.status_code == 410
    assert response.json()["detail"] == "Share has expired"


def test_burn_after_read_share_is_consumed(client) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": True,
        },
    )
    share_id = create_response.json()["id"]

    first_response = client.get(f"/shares/{share_id}")
    second_response = client.get(f"/shares/{share_id}")

    assert first_response.status_code == 200
    assert second_response.status_code == 410
    assert second_response.json()["detail"] == "Share has already been opened"


def test_file_share_requires_file_metadata(client) -> None:
    response = client.post(
        "/shares",
        json={
            "type": "file",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )

    assert response.status_code == 422
```

Important note:

The expiry test reaches into the database because waiting for real time to pass inside tests is slower and less reliable than forcing the stored `expires_at` value into the past.

This is also why the test file needs a `db_session` fixture instead of trying to reach into `app.dependency_overrides` manually from the test body.

One backend nuance to be aware of:

- SQLite tests may give you timezone-naive datetimes even if your main Postgres path is using timezone-aware values
- if your service compares `share.expires_at` directly against `datetime.now(UTC)`, tests can fail with naive-vs-aware datetime errors

If that happens, fix it in the service layer by normalizing stored datetimes before comparison, not by weakening the test.

### 4. Add frontend test tooling

The frontend currently has build/lint tooling, but no test runner.

For this repo, the simplest fit is:

- **Vitest** for the test runner
- **Testing Library** for React component interaction
- **jsdom** for DOM simulation

From `frontend/`:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
mkdir -p src/test
touch src/test/setup.ts vitest.config.ts
```

Why this stack:

- it fits naturally with Vite
- it is standard for React unit/integration tests
- it is enough to test these flows without bringing in Playwright yet

### 5. Add frontend test configuration

The frontend test runner needs:

- a jsdom environment
- a setup file for `jest-dom`
- a test script in `package.json`

Create `frontend/vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

Create `frontend/src/test/setup.ts` with:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

Update `frontend/package.json` scripts to include:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### 6. Add a frontend test for the create flow

The create flow is worth testing because it now branches:

- text vs file input
- encryption before submission
- backend call payload shape

For this step, keep the frontend test focused and practical:

- mock the API call
- mock crypto where useful
- confirm the form flow triggers the expected behavior

Create `frontend/src/components/ShareForm.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ShareForm } from './ShareForm'


describe('ShareForm', () => {
  it('submits text share values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ShareForm isSubmitting={false} onSubmit={onSubmit} />)

    await user.type(
      screen.getByLabelText(/secret content/i),
      'hello from test',
    )
    await user.click(screen.getByRole('button', { name: /create share/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'text',
      content: 'hello from test',
      file: null,
      expires_in: 3600,
      burn_after_read: false,
    })
  })

  it('switches to file mode and submits selected file', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ShareForm isSubmitting={false} onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/share type/i), 'file')

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const fileInput = screen.getByLabelText(/^file$/i)
    const submitButton = screen.getByRole('button', { name: /create share/i })

    await user.upload(fileInput, file)

    expect(submitButton).not.toBeDisabled()

    fireEvent.submit(submitButton.closest('form')!)

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'file',
      content: '',
      file,
      expires_in: 3600,
      burn_after_read: false,
    })
  })
})
```

Why the file-mode test uses `fireEvent.submit(...)` instead of only `user.click(...)`:

- jsdom can be flaky around native file-input form submission behavior
- the important thing for this test is verifying the component’s submit payload
- direct form submission keeps the test stable while still testing the component logic you care about

### 7. Add a frontend test for wrong-key decryption behavior

One of the most important frontend regressions to catch is:

- invalid key should show an error, not fake success

You do not need to fully render the whole router for this first version.

Instead, test the crypto helper directly. That gives you fast, reliable coverage for the key failure path.

Create `frontend/src/lib/crypto/text.test.ts` with:

```ts
// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { decryptText, encryptText } from './text'


describe('text crypto', () => {
  it('round-trips plaintext with the correct key', async () => {
    const { encryptedPayload, decryptionKey } = await encryptText('hello')

    const plaintext = await decryptText(encryptedPayload, decryptionKey)

    expect(plaintext).toBe('hello')
  })

  it('fails with the wrong key', async () => {
    const { encryptedPayload } = await encryptText('hello')
    const { decryptionKey: wrongKey } = await encryptText('something else')

    await expect(decryptText(encryptedPayload, wrongKey)).rejects.toThrow(
      'Failed to decrypt share. Check the decryption key.',
    )
  })
})
```

This is not a full UI test, but it still protects one of the most important user-facing guarantees.

Why the `@vitest-environment node` line is needed:

- the crypto helper uses the Web Crypto API directly
- the default frontend test environment is `jsdom`
- running this one file in the Node environment avoids browser-simulation quirks and works well with the crypto helper tests

### 8. Run backend tests

From `backend/`:

```bash
uv run pytest
```

Expected result:

- test session starts successfully
- all backend tests pass

If a test fails, do not just adjust the assertion blindly. Check whether the app behavior or the test expectation is wrong.

### 9. Run frontend tests

From `frontend/`:

```bash
npm run test
```

Expected result:

- Vitest starts in run mode
- component and crypto tests pass

Then also confirm nothing else regressed:

```bash
npm run lint
npm run build
```

Expected result:

- lint passes
- build passes

### 10. Review test scope honestly

Before finishing, look at what is and is not covered yet.

At the end of this step, you should have meaningful coverage for:

- backend create route
- backend retrieve route
- backend expired share behavior
- backend burn-after-read behavior
- backend invalid file request shape
- frontend create-form submission behavior
- frontend crypto wrong-key failure

You will still **not** have coverage for:

- full frontend page-level integration around `ViewSharePage`
- file decryption download behavior in the UI
- browser-level end-to-end tests

That is acceptable for this step. The point is to establish a useful baseline, not perfect coverage.

---

## Expected Result

After this step:

- the backend has real API tests instead of no tests
- the frontend has a proper test runner
- key creation/open/decrypt regression points are covered
- future refactors have a safety net

---

## What Not To Do Yet

Do not do these in this step:

- Playwright or Cypress
- snapshot-heavy frontend testing
- exhaustive crypto test matrices
- performance benchmarking
- CI wiring

Those can be added later once the baseline tests are stable.

---

## Finish This Step

When verification is complete:

```bash
git add backend frontend
git commit -m "test: add share flow coverage"
```
