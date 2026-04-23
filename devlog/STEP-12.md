# STEP-12

## Goal

Enforce share lifecycle rules during retrieval:

- expired shares should return a clear `410 Gone` state
- burn-after-read shares should be consumed on first successful retrieval
- a consumed burn-after-read share should not be retrievable a second time
- the frontend should show cleaner error states for expired or already-opened shares

This step should leave you with:

- backend retrieval logic that mutates the share lifecycle when needed
- backend `410` responses with more specific messages
- frontend retrieval UI that reflects those states clearly

This step does **not** include:

- file burn-after-read behavior beyond the same lifecycle rule
- cleanup jobs or cron-based deletion
- backend test coverage yet
- final UI polish

---

## Starting Point

Expected starting state:

- Step 11 is already committed
- if you did Step 11A, that is committed too
- repo is clean before starting
- create + retrieve + decrypt flow already works for text shares
- burn-after-read is stored in the database but not yet enforced during retrieval

Check:

```bash
git status --short
git log --oneline --decorate -n 8
find backend/app -maxdepth 4 -type f | sort
find frontend/src -maxdepth 4 -type f | sort
```

You should see:

- clean working tree
- latest product commit around Step 11
- `backend/app/services/share_service.py`
- `backend/app/api/routes_shares.py`
- `frontend/src/pages/ViewSharePage.tsx`

---

## Do This

### 1. Tighten the backend retrieval lifecycle

Right now `get_share_by_id()` only reads the share and rejects obvious bad states.

That is not enough anymore, because retrieval is now a lifecycle event:

- an expired share should be rejected consistently
- a burn-after-read share should be marked consumed on its first valid retrieval
- a second retrieval should fail with a clear message

This is the important design idea for this step:

- **retrieving a burn-after-read share is not just a read, it is a state transition**

That is why this logic belongs in the service layer, not in the route handler.

Also, because two requests could arrive close together, we want the lookup and state transition to happen under a row lock so two readers do not both get the same burn-after-read share.

In PostgreSQL, `SELECT ... FOR UPDATE` gives you that row-level lock. In SQLAlchemy ORM, that means using `.with_for_update()` on the select statement.

Replace the contents of `backend/app/services/share_service.py` with:

```python
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.share import Share
from app.schemas.share import CreateShareRequest


def create_share(db: Session, payload: CreateShareRequest) -> Share:
    expires_at = datetime.now(UTC) + timedelta(seconds=payload.expires_in)

    share = Share(
        id=str(uuid4()),
        type=payload.type,
        encrypted_payload=payload.encrypted_payload,
        file_name=payload.file_name,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        expires_at=expires_at,
        burn_after_read=payload.burn_after_read,
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return share


def get_share_by_id(db: Session, share_id: str) -> Share:
    statement = select(Share).where(Share.id == share_id).with_for_update()
    share = db.execute(statement).scalar_one_or_none()

    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found",
        )

    now = datetime.now(UTC)

    if share.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share has expired",
        )

    if share.is_deleted:
        detail = (
            "Share has already been opened"
            if share.burn_after_read and share.read_at is not None
            else "Share is no longer available"
        )
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=detail,
        )

    if share.burn_after_read:
        share.is_deleted = True
        share.read_at = now
        db.commit()

    return share
```

What this changes:

- the row is locked while being checked
- expired shares still return `410`
- already-consumed burn-after-read shares return a more specific message
- the first valid retrieval of a burn-after-read share marks it consumed immediately

Important nuance:

- the server cannot know whether the recipient actually read the plaintext in the UI
- the strongest rule the backend can enforce is: **once the encrypted payload is successfully served, the share is considered consumed**

That is the right interpretation for this app.

### 2. Keep the route thin

The route should still stay simple.

The route’s job is:

- accept the request
- call the service
- shape the response model

The route should **not** duplicate lifecycle rules. That belongs in the service.

Your existing `backend/app/api/routes_shares.py` should remain structurally the same. The main reason to look at it now is to confirm it still only does response shaping.

Check:

```bash
sed -n '1,220p' backend/app/api/routes_shares.py
```

You should still see:

- `get_share_route(...)`
- `share = get_share_by_id(db, share_id)`
- `GetShareResponse(...)`

If you accidentally moved lifecycle logic into the route, move it back into the service.

### 3. Improve the retrieval page error states

The frontend already surfaces backend errors, but Step 12 should make those states feel more intentional.

There is one more important behavior change here:

- do **not** auto-fetch the share inside `useEffect` when the page loads

Why:

- a burn-after-read share is consumed as soon as the backend successfully serves it
- if the frontend fetches on mount, merely opening the page consumes the share
- in React development mode, `StrictMode` can run mount effects twice, which can accidentally consume the share and then immediately make the second request fail

So the retrieval flow should become:

1. user opens the share page
2. user pastes the decryption key
3. user clicks the decrypt button
4. only then does the frontend request the encrypted payload

That is the correct pattern for a one-time retrieval endpoint.

At this point, the retrieval page can fail in a few distinct ways:

- no share ID in the URL
- share not found
- share expired
- share already opened
- decryption failed because the key is wrong

The user should not need to guess which case happened.

Replace the contents of `frontend/src/pages/ViewSharePage.tsx` with:

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getShare } from '../lib/api/shares'
import { decryptText, parseEncryptedTextPayload } from '../lib/crypto/text'
import type { GetShareResponse } from '../types/share'

function getLoadErrorMessage(error: string | null, missingShareId: boolean): string {
  if (missingShareId) {
    return 'Missing share ID.'
  }

  if (error === 'Share has expired') {
    return 'This share has expired.'
  }

  if (error === 'Share has already been opened') {
    return 'This burn-after-read share has already been opened.'
  }

  if (error === 'Share not found') {
    return 'This share link does not exist.'
  }

  return error ?? 'Failed to load share.'
}

export function ViewSharePage() {
  const { shareId } = useParams()
  const [share, setShare] = useState<GetShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decryptionKey, setDecryptionKey] = useState('')
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const missingShareId = !shareId
  const loadErrorMessage = getLoadErrorMessage(error, missingShareId)

  async function handleDecrypt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!shareId) {
      return
    }

    const currentShareId = shareId

    setError(null)
    setDecryptError(null)
    setDecryptedContent(null)
    setIsDecrypting(true)

    try {
      const response = await getShare(currentShareId)
      setShare(response)

      if (response.type !== 'text') {
        throw new Error('Only text shares are supported in this step.')
      }

      const payload = parseEncryptedTextPayload(response.encrypted_payload)
      const plaintext = await decryptText(payload, decryptionKey.trim())
      setDecryptedContent(plaintext)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to decrypt share'

      if (
        message === 'Share has expired' ||
        message === 'Share has already been opened' ||
        message === 'Share not found' ||
        message === 'Failed to load share'
      ) {
        setShare(null)
        setError(message)
      } else {
        setDecryptError(message)
      }
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <main className="page stack">
      <p className="eyebrow">Rahasia</p>
      <h1>View share</h1>

      <p className="hint">
        Paste the decryption key and open the share when you are ready.
      </p>

      {missingShareId || error ? (
        <section className="card stack">
          <p className="error">{loadErrorMessage}</p>
          <Link to="/">Back to create page</Link>
        </section>
      ) : null}

      {!missingShareId && !error ? (
        <>
          <form className="card stack" onSubmit={handleDecrypt}>
            <div className="field">
              <label htmlFor="decryption-key">Decryption key</label>
              <input
                id="decryption-key"
                value={decryptionKey}
                onChange={(event) => setDecryptionKey(event.target.value)}
                placeholder="Paste the decryption key here"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isDecrypting || decryptionKey.trim().length === 0}
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt share'}
            </button>

            {decryptError ? <p className="error">{decryptError}</p> : null}
          </form>

          {share ? (
            <section className="card stack">
              <div className="field">
                <label>Share ID</label>
                <input value={share.id} readOnly />
              </div>

              <div className="field">
                <label>Share type</label>
                <input value={share.type} readOnly />
              </div>

              <div className="field">
                <label>Expires at</label>
                <input value={share.expires_at} readOnly />
              </div>

              <div className="field">
                <label>Burn after read</label>
                <input value={share.burn_after_read ? 'Yes' : 'No'} readOnly />
              </div>
            </section>
          ) : null}

          {decryptedContent ? (
            <section className="card stack">
              <h2>Decrypted content</h2>
              <div className="field">
                <label>Plaintext</label>
                <textarea value={decryptedContent} rows={10} readOnly />
              </div>
            </section>
          ) : null}
        </>
        </>
      ) : null}
    </main>
  )
}
```

What this changes:

- backend detail strings are mapped into clearer user-facing messages
- the share is fetched only when the user explicitly tries to open it
- expired and already-opened states feel intentional instead of generic
- the decryption form still behaves the same when the share is valid
- React `StrictMode` no longer causes accidental double-fetch consumption in development

### 4. Verify the backend still starts

Before testing behavior, make sure the app still runs after the service change.

From `backend/`:

```bash
uv run ruff check
uv run pytest
```

Expected result:

- `ruff check` passes
- `pytest` may still report no tests collected at this stage, which is fine

Then run the backend if it is not already running:

```bash
uv run uvicorn app.main:app --reload
```

Expected output shape:

```text
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 5. Verify a normal share still works

First confirm that non-burn-after-read shares still retrieve normally.

Create one:

```bash
curl -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "encrypted_payload": "{\"iv\":\"test-iv\",\"ciphertext\":\"test-cipher\"}",
    "expires_in": 3600,
    "burn_after_read": false
  }'
```

Expected response shape:

```json
{"id":"<share-id>"}
```

Then retrieve it twice:

```bash
curl http://127.0.0.1:8000/shares/<share-id>
curl http://127.0.0.1:8000/shares/<share-id>
```

Expected result:

- both requests return `200`
- both responses still include the encrypted payload

### 6. Verify burn-after-read consumption

Now confirm that first retrieval works and second retrieval fails.

Create a burn-after-read share:

```bash
curl -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "encrypted_payload": "{\"iv\":\"test-iv\",\"ciphertext\":\"test-cipher\"}",
    "expires_in": 3600,
    "burn_after_read": true
  }'
```

Expected response shape:

```json
{"id":"<share-id>"}
```

Retrieve it the first time:

```bash
curl -i http://127.0.0.1:8000/shares/<share-id>
```

Expected shape:

- status `200 OK`
- response includes encrypted payload

Retrieve it a second time:

```bash
curl -i http://127.0.0.1:8000/shares/<share-id>
```

Expected shape:

```text
HTTP/1.1 410 Gone
```

and body:

```json
{"detail":"Share has already been opened"}
```

### 7. Verify expiration handling

Finally confirm that expired shares are rejected with the correct message.

Create a very short-lived share:

```bash
curl -X POST http://127.0.0.1:8000/shares \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "encrypted_payload": "{\"iv\":\"test-iv\",\"ciphertext\":\"test-cipher\"}",
    "expires_in": 30,
    "burn_after_read": false
  }'
```

Wait for more than thirty seconds, then retrieve it:

```bash
sleep 31
curl -i http://127.0.0.1:8000/shares/<share-id>
```

Expected shape:

```text
HTTP/1.1 410 Gone
```

and body:

```json
{"detail":"Share has expired"}
```

### 8. Verify the frontend behavior

Now verify the UI behavior in the browser:

1. Create a normal text share and open it with the correct key.
2. Create a burn-after-read share, open it once, then refresh or reopen the link.
3. Create a very short-lived share, wait until it expires, then open it.

What you should see:

- valid share: decryption form appears and valid key reveals plaintext
- consumed burn-after-read share: error card says the share has already been opened
- expired share: error card says the share has expired

---

## Expected Result

After this step:

- a burn-after-read share works exactly once
- expired shares fail with a clear `410` message
- the frontend surfaces those failure states clearly
- share retrieval now behaves like a lifecycle transition, not just a plain read

---

## What Not To Do Yet

Do not add these in this step:

- scheduled cleanup tasks
- background deletion workers
- file upload lifecycle edge cases
- password-derived keys
- automated tests

Those can be handled in later steps.

---

## Finish This Step

When verification is complete:

```bash
git add backend frontend
git commit -m "feat: enforce expiration and burn-after-read rules"
```
