# STEP-09

## Goal

Build the first real frontend flow: create a share from the browser and send it to `POST /shares`.

This step should leave you with:

- a frontend router
- a create-share page at `/`
- a temporary placeholder page at `/shares/:shareId`
- a form component for creating shares
- a result component that shows the created share ID/link
- a frontend API layer that calls the backend
- a Vite dev proxy so the frontend can reach the backend without CORS work yet

This step does **not** include:

- real client-side encryption
- the actual retrieval/decrypt UI
- final styling polish
- password/key handling

---

## Starting Point

Expected starting state:

- Step 8 is already committed
- repo is clean before starting
- backend `POST /shares` already works
- frontend is still mostly the default Vite starter app

Check:

```bash
git status --short
git log --oneline --decorate -n 6
find frontend -maxdepth 3 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
```

You should see:

- clean working tree
- latest commit: `feat: implement share retrieval endpoint`
- default Vite files like `src/App.tsx`, `src/App.css`, and starter assets still present

---

## Do This

### 1. Remove the Vite starter files and prepare the real frontend structure

The current frontend still reflects the starter template, not this product.

This substep clears out the temporary Vite demo UI and prepares the folders/files for the actual app flow.

From `frontend/`:

```bash
rm -f src/{App.tsx,App.css}
rm -f src/assets/{react.svg,vite.svg,hero.png}
rm -f src/{pages,components,lib,types}/.gitkeep
mkdir -p src/app src/lib/api
touch src/app/router.tsx
touch src/pages/CreateSharePage.tsx
touch src/pages/SharePlaceholderPage.tsx
touch src/components/ShareForm.tsx
touch src/components/ShareResult.tsx
touch src/lib/api/client.ts
touch src/lib/api/shares.ts
touch src/types/share.ts
```

Then verify:

```bash
find src -maxdepth 3 -type f | sort
```

You should now have:

```text
src/app/router.tsx
src/pages/CreateSharePage.tsx
src/pages/SharePlaceholderPage.tsx
src/components/ShareForm.tsx
src/components/ShareResult.tsx
src/lib/api/client.ts
src/lib/api/shares.ts
src/types/share.ts
```

### 2. Add a local API proxy in Vite

If the browser frontend calls `http://127.0.0.1:8000` directly, you will run into CORS issues because the frontend dev server runs on a different origin.

We do not want to solve browser CORS policy in this step yet.

So the right move here is:

- let the frontend call `/api/...`
- let Vite proxy `/api` requests to the FastAPI backend

That keeps this step focused on frontend flow, not backend CORS config.

Replace the contents of `frontend/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

What this does:

- frontend code can call `/api/shares`
- Vite forwards that to `http://127.0.0.1:8000/shares`
- the browser sees same-origin frontend requests, so no CORS issue in dev

### 3. Define the frontend share types

Before wiring the API and UI, define the shapes the frontend expects to send and receive.

These are frontend TypeScript types, not Pydantic schemas and not SQLAlchemy models.

Their job is:

- help the frontend stay type-safe
- document what the frontend thinks the backend contract is

For this step, the frontend only needs:

- the create request payload
- the create response payload

One temporary but important note:

- the backend field is named `encrypted_payload`
- real encryption is not implemented yet
- for this step, the frontend will temporarily send the raw textarea content into `encrypted_payload`

This is a temporary scaffold only.

Step 11 will replace that with real browser-side encryption.

Write this code in `frontend/src/types/share.ts`:

```ts
export type ShareType = 'text' | 'file'

export type CreateSharePayload = {
  type: ShareType
  encrypted_payload: string
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  expires_in: number
  burn_after_read: boolean
}

export type CreateShareResponse = {
  id: string
}
```

### 4. Add a small frontend API layer

Do not call `fetch()` directly from every component.

This substep creates a minimal API layer so the frontend has one place for:

- HTTP requests
- JSON handling
- backend-specific endpoint functions

Write this code in `frontend/src/lib/api/client.ts`:

```ts
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const data = (await response.json()) as { detail?: string }
      if (data.detail) {
        message = data.detail
      }
    } catch {
      // Ignore JSON parse errors and keep the default message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}
```

Write this code in `frontend/src/lib/api/shares.ts`:

```ts
import { apiFetch } from './client'
import type { CreateSharePayload, CreateShareResponse } from '../../types/share'

export function createShare(
  payload: CreateSharePayload,
): Promise<CreateShareResponse> {
  return apiFetch<CreateShareResponse>('/shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
```

### 5. Build the create form component

Now create the actual UI for creating a share.

This component should:

- collect the form fields
- manage local form state
- call a submit handler passed from the page
- stay reusable and focused on form behavior

For now, support:

- share type
- text content
- expiration
- burn-after-read

Because real encryption is not implemented yet:

- label the textarea honestly
- make it clear this is temporary/plaintext for now

Write this code in `frontend/src/components/ShareForm.tsx`:

```tsx
import { useState } from 'react'

import type { CreateSharePayload, ShareType } from '../types/share'

type ShareFormProps = {
  isSubmitting: boolean
  onSubmit: (payload: CreateSharePayload) => Promise<void>
}

export function ShareForm({ isSubmitting, onSubmit }: ShareFormProps) {
  const [type, setType] = useState<ShareType>('text')
  const [content, setContent] = useState('')
  const [expiresIn, setExpiresIn] = useState('3600')
  const [burnAfterRead, setBurnAfterRead] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit({
      type,
      encrypted_payload: content,
      expires_in: Number(expiresIn),
      burn_after_read: burnAfterRead,
    })
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="share-type">Share type</label>
        <select
          id="share-type"
          value={type}
          onChange={(event) => setType(event.target.value as ShareType)}
        >
          <option value="text">Text</option>
          <option value="file" disabled>
            File (later step)
          </option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="share-content">Secret content</label>
        <textarea
          id="share-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Temporary plaintext input for now. Real client-side encryption comes in a later step."
          rows={8}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="expires-in">Expires in</label>
        <select
          id="expires-in"
          value={expiresIn}
          onChange={(event) => setExpiresIn(event.target.value)}
        >
          <option value="3600">1 hour</option>
          <option value="86400">1 day</option>
          <option value="604800">1 week</option>
        </select>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={burnAfterRead}
          onChange={(event) => setBurnAfterRead(event.target.checked)}
        />
        Burn after read
      </label>

      <button type="submit" disabled={isSubmitting || content.trim().length === 0}>
        {isSubmitting ? 'Creating...' : 'Create share'}
      </button>
    </form>
  )
}
```

### 6. Build the result component

After a share is created, the page should show a concrete result.

Even though the real retrieval page is not implemented yet, the user should still see:

- the new share ID
- the future share URL

That makes the flow feel real and sets up the next step naturally.

Write this code in `frontend/src/components/ShareResult.tsx`:

```tsx
type ShareResultProps = {
  shareId: string
}

export function ShareResult({ shareId }: ShareResultProps) {
  const shareUrl = `${window.location.origin}/shares/${shareId}`

  return (
    <section className="card stack">
      <h2>Share created</h2>
      <div className="field">
        <label>Share ID</label>
        <input value={shareId} readOnly />
      </div>
      <div className="field">
        <label>Share URL</label>
        <input value={shareUrl} readOnly />
      </div>
      <p className="hint">
        The retrieval page will be implemented in the next step.
      </p>
    </section>
  )
}
```

### 7. Build the create page and placeholder share page

The create page should:

- own the submit flow
- call the API layer
- handle loading and error state
- render the form and result together

The placeholder share page exists only so the generated URL points to a real frontend route for now.

Write this code in `frontend/src/pages/CreateSharePage.tsx`:

```tsx
import { useState } from 'react'

import { ShareForm } from '../components/ShareForm'
import { ShareResult } from '../components/ShareResult'
import { createShare } from '../lib/api/shares'
import type { CreateSharePayload } from '../types/share'

export function CreateSharePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShareId, setCreatedShareId] = useState<string | null>(null)

  async function handleCreateShare(payload: CreateSharePayload) {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await createShare(payload)
      setCreatedShareId(response.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page stack">
      <header className="stack">
        <p className="eyebrow">Rahasia</p>
        <h1>Create a share</h1>
        <p className="hint">
          This step wires the frontend flow to the backend. Real browser-side
          encryption comes later.
        </p>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <ShareForm isSubmitting={isSubmitting} onSubmit={handleCreateShare} />

      {createdShareId ? <ShareResult shareId={createdShareId} /> : null}
    </main>
  )
}
```

Write this code in `frontend/src/pages/SharePlaceholderPage.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'

export function SharePlaceholderPage() {
  const { shareId } = useParams()

  return (
    <main className="page stack">
      <p className="eyebrow">Rahasia</p>
      <h1>Share page coming next</h1>
      <p className="hint">
        This route exists so the generated link is meaningful. The actual
        retrieval UI will be built in the next step.
      </p>
      <div className="card stack">
        <p>
          Requested share ID: <code>{shareId}</code>
        </p>
        <Link to="/">Back to create page</Link>
      </div>
    </main>
  )
}
```

### 8. Add the router and replace the default app entry

The starter Vite app was centered on `App.tsx`.

This project now needs real routes, so the app entry should switch to a router-based structure.

Write this code in `frontend/src/app/router.tsx`:

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

Replace the contents of `frontend/src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './app/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

### 9. Replace the default global styles

The Vite starter CSS is no longer relevant.

This substep gives the app a simple, readable layout so the flow is usable without spending this step on design polish.

Replace the contents of `frontend/src/index.css` with:

```css
:root {
  font-family: Georgia, 'Times New Roman', serif;
  color: #1d1d1d;
  background: linear-gradient(180deg, #f7f0e4 0%, #efe2cc 100%);
  line-height: 1.5;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 72px;
}

.stack {
  display: grid;
  gap: 16px;
}

.card {
  padding: 20px;
  border: 1px solid #b89f77;
  border-radius: 16px;
  background: rgba(255, 251, 245, 0.9);
}

.field {
  display: grid;
  gap: 8px;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #9f8966;
  border-radius: 10px;
  background: #fffdf8;
}

.checkbox {
  display: flex;
  gap: 10px;
  align-items: center;
}

.eyebrow {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a5f38;
}

.hint {
  margin: 0;
  color: #5f5444;
}

.error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8d7d1;
  color: #7a1f1f;
}

button {
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  background: #2f5f4f;
  color: #fff;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

code {
  font-family: 'Courier New', monospace;
}
```

### 10. Verify the frontend files before running the app

From `frontend/`:

```bash
find src -maxdepth 3 -type f | sort
sed -n '1,220p' vite.config.ts
sed -n '1,220p' src/types/share.ts
sed -n '1,260p' src/lib/api/client.ts
sed -n '1,220p' src/lib/api/shares.ts
sed -n '1,280p' src/components/ShareForm.tsx
sed -n '1,220p' src/components/ShareResult.tsx
sed -n '1,260p' src/pages/CreateSharePage.tsx
sed -n '1,220p' src/pages/SharePlaceholderPage.tsx
sed -n '1,220p' src/app/router.tsx
sed -n '1,220p' src/main.tsx
sed -n '1,260p' src/index.css
```

Check that:

- the Vite starter UI is gone
- the router exists
- the API layer exists
- the create page exists
- the placeholder share page exists

### 11. Run backend and frontend together

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

Open the frontend URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

Then test this flow in the browser:

1. fill in the form
2. click `Create share`
3. confirm a share ID appears
4. confirm a share URL appears
5. open the generated `/shares/:shareId` link
6. confirm the placeholder page loads and shows the ID

Expected behavior:

- the form submits successfully
- no browser CORS error appears
- the backend creates a share
- the frontend shows the created result

### 12. Optional sanity checks

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

- a working create page at `/`
- a temporary placeholder route at `/shares/:shareId`
- a browser flow that creates a share through the backend

Important temporary limitation:

- the textarea content is still being sent directly as `encrypted_payload`
- this is only scaffolding for the frontend flow
- real browser-side encryption comes later

---

## What Not To Do Yet

- Do not implement the real retrieval page yet
- Do not add real encryption yet
- Do not add file upload yet
- Do not polish the full visual design yet

This step is only the frontend create flow.

---

## Verification

Before committing:

```bash
git status --short
find frontend -maxdepth 3 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
sed -n '1,220p' frontend/vite.config.ts
sed -n '1,220p' frontend/src/types/share.ts
sed -n '1,260p' frontend/src/lib/api/client.ts
sed -n '1,220p' frontend/src/lib/api/shares.ts
sed -n '1,280p' frontend/src/components/ShareForm.tsx
sed -n '1,220p' frontend/src/components/ShareResult.tsx
sed -n '1,260p' frontend/src/pages/CreateSharePage.tsx
sed -n '1,220p' frontend/src/pages/SharePlaceholderPage.tsx
sed -n '1,220p' frontend/src/app/router.tsx
sed -n '1,220p' frontend/src/main.tsx
sed -n '1,260p' frontend/src/index.css
```

Make sure:

- the frontend builds
- the frontend lints
- the create page works in the browser
- the result shows both ID and URL
- the placeholder share route works

---

## Finish This Step

From the repo root:

```bash
git add frontend
git commit -m "feat: add create share UI flow"
```

---

## Commit Message

```text
feat: add create share UI flow
```
