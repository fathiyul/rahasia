# STEP-10

## Goal

Build the frontend retrieval flow for `/shares/:shareId`.

This step should leave you with:

- a frontend API function for `GET /shares/{shareId}`
- a frontend type for the retrieval response
- a real share view page that fetches the share from the backend
- loading, success, and error states for the retrieval page

This step does **not** include:

- real decryption
- password/key input
- burn-after-read client behavior
- final polished share-view design

---

## Starting Point

Expected starting state:

- Step 9 is already committed
- repo is clean before starting
- frontend create page works
- backend `GET /shares/{shareId}` already works
- frontend `/shares/:shareId` route still points to a placeholder page

Check:

```bash
git status --short
git log --oneline --decorate -n 6
find frontend -maxdepth 3 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
```

You should see:

- clean working tree
- latest commit: `feat: add create share UI flow`
- `SharePlaceholderPage.tsx` still exists in `src/pages/`

---

## Do This

### 1. Extend the frontend share types for retrieval

The create flow only needed the request payload and the create response payload.

The retrieval page needs a different shape:

- it does not send a request body
- it receives the encrypted payload and metadata back from the backend
- it needs enough information to render the current share page

This is still frontend contract typing, not a backend schema and not a database model.

Add this code to `frontend/src/types/share.ts` below the existing types:

```ts
export type GetShareResponse = {
  id: string
  type: ShareType
  encrypted_payload: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  burn_after_read: boolean
  expires_at: string
}
```

Why `expires_at` is a string here:

- the backend serializes datetimes as JSON strings
- the frontend receives the timestamp as text
- if needed, the frontend can later turn it into a `Date`

### 2. Add the retrieval API function

The frontend API layer should expose both:

- create share
- retrieve share

This keeps components/pages from doing raw `fetch()` calls directly.

Update `frontend/src/lib/api/shares.ts` to:

```ts
import { apiFetch } from './client'
import type {
  CreateSharePayload,
  CreateShareResponse,
  GetShareResponse,
} from '../../types/share'

export function createShare(
  payload: CreateSharePayload,
): Promise<CreateShareResponse> {
  return apiFetch<CreateShareResponse>('/shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getShare(shareId: string): Promise<GetShareResponse> {
  return apiFetch<GetShareResponse>(`/shares/${shareId}`)
}
```

What this adds:

- one function for the create flow
- one function for the retrieval flow

### 3. Replace the placeholder page with a real share view page

The placeholder page served one purpose:

- make the generated URL point somewhere real

Now the app needs an actual retrieval page that:

- reads the share ID from the route
- asks the backend for the share
- handles loading
- handles errors like not found/expired
- shows the returned payload and metadata

Important temporary limitation:

- because browser-side encryption is not implemented yet, this step will display the `encrypted_payload` value directly
- in the current scaffolding flow, that field still contains the raw text entered in Step 9
- Step 11 will replace this with real client-side encryption/decryption behavior

Replace the contents of `frontend/src/pages/SharePlaceholderPage.tsx` with:

```tsx
import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { getShare } from '../lib/api/shares'
import type { GetShareResponse } from '../types/share'

export function SharePlaceholderPage() {
  const { shareId } = useParams()
  const [share, setShare] = useState<GetShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const missingShareId = !shareId

  useEffect(() => {
    if (!shareId) {
      return
    }

    const currentShareId = shareId
    let isCancelled = false

    async function loadShare() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getShare(currentShareId)
        if (!isCancelled) {
          setShare(response)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load share')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadShare()

    return () => {
      isCancelled = true
    }
  }, [shareId])

  return (
    <main className="page stack">
      <p className="eyebrow">Rahasia</p>
      <h1>View share</h1>

      {isLoading ? <p className="hint">Loading share...</p> : null}

      {missingShareId || error ? (
        <section className="card stack">
          <p className="error">
            {missingShareId ? 'Missing share ID' : error}
          </p>
          <Link to="/">Back to create page</Link>
        </section>
      ) : null}

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
            <label>Payload</label>
            <textarea value={share.encrypted_payload} rows={10} readOnly />
          </div>

          <div className="field">
            <label>Expires at</label>
            <input value={share.expires_at} readOnly />
          </div>

          <div className="field">
            <label>Burn after read</label>
            <input value={share.burn_after_read ? 'Yes' : 'No'} readOnly />
          </div>

          <p className="hint">
            This is still the temporary pre-encryption retrieval flow. A later
            step will replace direct payload display with client-side
            decryption.
          </p>

          <Link to="/">Back to create page</Link>
        </section>
      ) : null}
    </main>
  )
}
```

Why `currentShareId` is used:

- `useParams()` returns `shareId` as `string | undefined`
- even after the missing-ID guard, TypeScript may still complain inside the nested async function
- copying it into `currentShareId` after the guard makes the value concretely `string` for the fetch call

Why `missingShareId` is rendered directly instead of being stored via `setError()` in the effect:

- ESLint warns about synchronous `setState()` inside the effect body
- a missing route param is already knowable during render
- so it is cleaner to derive that error directly from `shareId` instead of storing it in effect state

What this page now does:

- fetches the share automatically from the backend
- shows loading while waiting
- shows an error message for invalid/unavailable shares
- shows the returned payload and metadata when successful

### 4. Keep the router, but confirm the route now points to a real retrieval page

The route path itself should not change.

This substep is mainly a sanity check:

- the same `/shares/:shareId` route now leads to a real data-fetching page
- no router rewrite is needed if Step 9 was done correctly

Check `frontend/src/app/router.tsx` and confirm it still looks like:

```tsx
import { createBrowserRouter } from 'react-router-dom'

import { CreateSharePage } from '../pages/CreateSharePage'
import { SharePlaceholderPage } from '../pages/SharePlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CreateSharePage />,
  },
  {
    path: '/shares/:shareId',
    element: <SharePlaceholderPage />,
  },
])
```

You do not need to rename the page file yet unless you want to do that in a later cleanup.

For this step, the important thing is behavior, not filename perfection.

### 5. Improve the page styles slightly for retrieval content

The retrieval page now displays a large payload textarea and a couple of read-only fields.

The current CSS mostly supports this already, but add one small rule so read-only textareas behave better.

Add this to the end of `frontend/src/index.css`:

```css
textarea[readonly],
input[readonly] {
  color: #2a241b;
}
```

This is just a small readability improvement.

### 6. Verify the updated frontend files before running the app

From `frontend/`:

```bash
sed -n '1,220p' src/types/share.ts
sed -n '1,220p' src/lib/api/shares.ts
sed -n '1,320p' src/pages/SharePlaceholderPage.tsx
sed -n '1,220p' src/app/router.tsx
sed -n '1,320p' src/index.css
```

Check that:

- `GetShareResponse` exists
- `getShare()` exists
- the share page fetches by route param
- loading and error states exist

### 7. Run backend and frontend together

Start the backend first:

```bash
cd ../backend
uv run uvicorn app.main:app --reload
```

In another terminal, start the frontend:

```bash
cd ../frontend
npm run dev
```

Then test this browser flow:

1. open `/`
2. create a share
3. copy or click the generated `/shares/:shareId` URL
4. confirm the share page loads and fetches data
5. confirm the payload appears

Expected behavior:

- no CORS error
- create flow still works
- retrieval page loads actual backend data
- bad share IDs show an error state

### 8. Test the error case in the browser

Open a route like:

```text
http://127.0.0.1:5173/shares/not-a-real-id
```

Expected behavior:

- the page loads
- the backend returns `404`
- the frontend shows a readable error message

This confirms the route handles failure states instead of staying blank or crashing.

### 9. Optional sanity checks

From `frontend/`:

```bash
npm run build
npm run lint
```

Expected result:

- build passes
- lint passes

---

## Expected Result

After this step, the frontend should have:

- a create page at `/`
- a retrieval page at `/shares/:shareId`
- a browser flow that can create a share and then fetch it back from the backend

Important temporary limitation:

- the page still displays `encrypted_payload` directly
- real decryption is not implemented yet
- that will be fixed in the encryption step

---

## What Not To Do Yet

- Do not implement real decryption yet
- Do not add password/key handling yet
- Do not add file retrieval UI yet
- Do not add final polished design yet

This step is only retrieval flow scaffolding.

---

## Verification

Before committing:

```bash
git status --short
find frontend -maxdepth 3 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
sed -n '1,220p' frontend/src/types/share.ts
sed -n '1,220p' frontend/src/lib/api/shares.ts
sed -n '1,320p' frontend/src/pages/SharePlaceholderPage.tsx
sed -n '1,220p' frontend/src/app/router.tsx
sed -n '1,320p' frontend/src/index.css
```

Make sure:

- `GetShareResponse` exists
- `getShare()` exists
- `/shares/:shareId` fetches data successfully
- invalid share IDs show a readable error state
- build and lint still pass

---

## Finish This Step

From the repo root:

```bash
git add frontend
git commit -m "feat: add share retrieval UI flow"
```

---

## Commit Message

```text
feat: add share retrieval UI flow
```
