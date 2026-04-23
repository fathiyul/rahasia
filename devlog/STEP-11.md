# STEP-11

## Goal

Replace the temporary plaintext frontend flow with real client-side encryption and decryption using the **Web Crypto API**.

This step should leave you with:

- browser-side text encryption before upload
- browser-side text decryption after retrieval
- a generated decryption key shown separately from the link
- a retrieval page that asks for the decryption key and reveals plaintext only after successful decryption

This step does **not** include:

- password-derived keys
- file encryption/decryption
- burn-after-read enforcement
- final share page polish

---

## Starting Point

Expected starting state:

- Step 10 is already committed
- repo is clean before starting
- frontend create and retrieval flows already work
- the frontend is still sending raw textarea content inside `encrypted_payload`
- the retrieval page still displays the received payload directly

Check:

```bash
git status --short
git log --oneline --decorate -n 7
find frontend -maxdepth 4 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
```

You should see:

- clean working tree
- latest commit: `feat: add share retrieval UI flow`
- `ShareForm.tsx`, `ShareResult.tsx`, and the retrieval page already exist

---

## Do This

### 1. Rename the retrieval page to reflect what it now does

The file `SharePlaceholderPage.tsx` was acceptable while the route was just a scaffold.

After this step, the page will become the real retrieval and decryption page. So the filename should match its role.

From `frontend/`:

```bash
mv src/pages/SharePlaceholderPage.tsx src/pages/ViewSharePage.tsx
mkdir -p src/lib/crypto
touch src/lib/crypto/text.ts
```

Then verify:

```bash
find src/pages src/lib/crypto -maxdepth 2 -type f | sort
```

You should now have:

```text
src/lib/crypto/text.ts
src/pages/CreateSharePage.tsx
src/pages/ViewSharePage.tsx
```

### 2. Separate plaintext form values from API payload values

So far, the frontend form has been directly producing the backend payload shape:

- the form collected plaintext
- the page submitted that plaintext under `encrypted_payload`

That was only temporary scaffolding.

Now the responsibilities should be:

- the form collects plaintext input from the user
- the page encrypts that plaintext in the browser
- only the encrypted result is sent to the backend

So this substep creates a cleaner distinction:

- `CreateShareFormValues` = what the user enters
- `CreateSharePayload` = what the backend receives
- `EncryptedTextPayload` = the internal encrypted text structure that gets serialized into `encrypted_payload`

Replace the contents of `frontend/src/types/share.ts` with:

```ts
export type ShareType = 'text' | 'file'

export type CreateShareFormValues = {
  type: ShareType
  content: string
  expires_in: number
  burn_after_read: boolean
}

export type EncryptedTextPayload = {
  iv: string
  ciphertext: string
}

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

What these types now mean:

- `CreateShareFormValues`: raw user input before encryption
- `EncryptedTextPayload`: the IV + ciphertext structure produced by encryption
- `CreateSharePayload`: what gets POSTed to the backend

### 3. Add the Web Crypto helper functions

This is the core crypto substep.

What you are trying to achieve here:

- generate a random AES-GCM key in the browser
- encrypt plaintext into ciphertext + IV
- export the decryption key into a sharable string
- import that key later for decryption
- serialize/parse the encrypted payload shape safely

This code uses the **Web Crypto API**, specifically `crypto.subtle`.

That means:

- encryption happens in the browser
- decryption happens in the browser
- the backend only sees encrypted text

Write this code in `frontend/src/lib/crypto/text.ts`:

```ts
import type { EncryptedTextPayload } from '../../types/share'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  const binary = atob(`${normalized}${padding}`)

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer as ArrayBuffer
}

export function serializeEncryptedTextPayload(
  payload: EncryptedTextPayload,
): string {
  return JSON.stringify(payload)
}

export function parseEncryptedTextPayload(value: string): EncryptedTextPayload {
  const parsed = JSON.parse(value) as Partial<EncryptedTextPayload>

  if (
    typeof parsed.iv !== 'string' ||
    typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error('Invalid encrypted payload format')
  }

  return {
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
  }
}

export async function encryptText(
  plaintext: string,
): Promise<{
  encryptedPayload: EncryptedTextPayload
  decryptionKey: string
}> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedPlaintext = encoder.encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedPlaintext,
  )

  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key))

  return {
    encryptedPayload: {
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
    },
    decryptionKey: bytesToBase64Url(rawKey),
  }
}

export async function decryptText(
  payload: EncryptedTextPayload,
  decryptionKey: string,
): Promise<string> {
  try {
    const keyBytes = base64UrlToBytes(decryptionKey)
    const key = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(keyBytes),
      {
        name: 'AES-GCM',
      },
      false,
      ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(base64UrlToBytes(payload.iv)),
      },
      key,
      toArrayBuffer(base64UrlToBytes(payload.ciphertext)),
    )

    return decoder.decode(decrypted)
  } catch {
    throw new Error('Failed to decrypt share. Check the decryption key.')
  }
}
```

Why `toArrayBuffer(...)` is used:

- newer TypeScript DOM typings can complain that a `Uint8Array` may be backed by `ArrayBufferLike`
- `crypto.subtle.importKey()` and `crypto.subtle.decrypt()` expect `BufferSource` values compatible with `ArrayBuffer`
- converting the byte arrays into a concrete `ArrayBuffer` avoids that type mismatch cleanly

What this file now provides:

- `encryptText()` for the create flow
- `decryptText()` for the retrieval flow
- serialization/parsing helpers for the encrypted payload

### 4. Update the create form to return plaintext form values

Now that encryption happens in the page layer, the form should stop pretending it is building the final API payload.

The form’s responsibility is only:

- collect plaintext content
- collect expiration and burn-after-read options
- return those raw user-entered values

Replace the contents of `frontend/src/components/ShareForm.tsx` with:

```tsx
import { useState } from 'react'

import type { CreateShareFormValues, ShareType } from '../types/share'

type ShareFormProps = {
  isSubmitting: boolean
  onSubmit: (values: CreateShareFormValues) => Promise<void>
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
      content,
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
          placeholder="This text will be encrypted in your browser before upload."
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
        {isSubmitting ? 'Encrypting and creating...' : 'Create share'}
      </button>
    </form>
  )
}
```

### 5. Update the create page to encrypt before sending to the backend

This substep is the bridge between:

- plaintext form input
- encrypted backend payload

The create page should now:

1. receive plaintext form values
2. encrypt the content in the browser
3. serialize the encrypted payload
4. send only encrypted data to the backend
5. keep the generated decryption key for the UI result

Replace the contents of `frontend/src/pages/CreateSharePage.tsx` with:

```tsx
import { useState } from 'react'

import { ShareForm } from '../components/ShareForm'
import { ShareResult } from '../components/ShareResult'
import { createShare } from '../lib/api/shares'
import {
  encryptText,
  serializeEncryptedTextPayload,
} from '../lib/crypto/text'
import type { CreateShareFormValues, CreateSharePayload } from '../types/share'

export function CreateSharePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShareId, setCreatedShareId] = useState<string | null>(null)
  const [createdShareKey, setCreatedShareKey] = useState<string | null>(null)

  async function handleCreateShare(values: CreateShareFormValues) {
    setIsSubmitting(true)
    setError(null)
    setCreatedShareId(null)
    setCreatedShareKey(null)

    try {
      const { encryptedPayload, decryptionKey } = await encryptText(values.content)

      const payload: CreateSharePayload = {
        type: values.type,
        encrypted_payload: serializeEncryptedTextPayload(encryptedPayload),
        expires_in: values.expires_in,
        burn_after_read: values.burn_after_read,
      }

      const response = await createShare(payload)
      setCreatedShareId(response.id)
      setCreatedShareKey(decryptionKey)
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
          Your text will be encrypted in the browser before it is sent to the
          backend.
        </p>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <ShareForm isSubmitting={isSubmitting} onSubmit={handleCreateShare} />

      {createdShareId && createdShareKey ? (
        <ShareResult shareId={createdShareId} shareKey={createdShareKey} />
      ) : null}
    </main>
  )
}
```

### 6. Update the result component to show link and key separately

This project’s intended sharing model is:

- sender shares the link
- sender shares the generated decryption key separately

So the result UI should now show:

- the share URL without the key embedded
- the generated decryption key as its own value

Replace the contents of `frontend/src/components/ShareResult.tsx` with:

```tsx
import { useState } from 'react'

type ShareResultProps = {
  shareId: string
  shareKey: string
}

export function ShareResult({ shareId, shareKey }: ShareResultProps) {
  const shareUrl = `${window.location.origin}/shares/${shareId}`
  const [copiedField, setCopiedField] = useState<'url' | 'key' | null>(null)

  async function copyValue(field: 'url' | 'key', value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    window.setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current))
    }, 1500)
  }

  return (
    <section className="card stack">
      <h2>Share created</h2>

      <div className="field">
        <label>Share URL</label>
        <div className="copy-field">
          <button
            className="copy-button"
            type="button"
            onClick={() => void copyValue('url', shareUrl)}
          >
            {copiedField === 'url' ? 'Copied' : 'Copy'}
          </button>
          <input value={shareUrl} readOnly />
        </div>
      </div>

      <div className="field">
        <label>Decryption key</label>
        <div className="copy-field">
          <button
            className="copy-button"
            type="button"
            onClick={() => void copyValue('key', shareKey)}
          >
            {copiedField === 'key' ? 'Copied' : 'Copy'}
          </button>
          <input value={shareKey} readOnly />
        </div>
      </div>

      <p className="hint">
        Send the link and the decryption key separately.
      </p>
    </section>
  )
}
```

This adds:

- one-click copy for the share URL
- one-click copy for the decryption key
- short `Copied` feedback for each field
- a button positioned inside the field at the top right

### 7. Turn the retrieval page into a decryption page

The retrieval page should no longer dump `encrypted_payload` directly.

Its responsibility is now:

- fetch the encrypted share from the backend
- ask the user for the decryption key
- decrypt the payload in the browser
- reveal plaintext only after successful decryption

Replace the contents of `frontend/src/pages/ViewSharePage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getShare } from '../lib/api/shares'
import { decryptText, parseEncryptedTextPayload } from '../lib/crypto/text'
import type { GetShareResponse } from '../types/share'

export function ViewSharePage() {
  const { shareId } = useParams()
  const [share, setShare] = useState<GetShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [decryptionKey, setDecryptionKey] = useState('')
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
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

  async function handleDecrypt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!share) {
      return
    }

    setDecryptError(null)
    setDecryptedContent(null)
    setIsDecrypting(true)

    try {
      if (share.type !== 'text') {
        throw new Error('Only text shares are supported in this step.')
      }

      const payload = parseEncryptedTextPayload(share.encrypted_payload)
      const plaintext = await decryptText(payload, decryptionKey.trim())
      setDecryptedContent(plaintext)
    } catch (err) {
      setDecryptError(
        err instanceof Error ? err.message : 'Failed to decrypt share',
      )
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <main className="page stack">
      <p className="eyebrow">Rahasia</p>
      <h1>View share</h1>

      {isLoading ? <p className="hint">Loading encrypted share...</p> : null}

      {missingShareId || error ? (
        <section className="card stack">
          <p className="error">{missingShareId ? 'Missing share ID' : error}</p>
          <Link to="/">Back to create page</Link>
        </section>
      ) : null}

      {share ? (
        <>
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

            <button type="submit" disabled={isDecrypting || decryptionKey.trim().length === 0}>
              {isDecrypting ? 'Decrypting...' : 'Decrypt share'}
            </button>

            {decryptError ? <p className="error">{decryptError}</p> : null}
          </form>

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
      ) : null}
    </main>
  )
}
```

What this page now does:

- fetches the encrypted share from the backend
- never shows raw plaintext unless decryption succeeds
- asks the user for the decryption key explicitly
- decrypts in the browser only

### 8. Update the router for the renamed retrieval page

The route path stays the same:

- `/shares/:shareId`

But the router should now import the renamed file.

Replace the contents of `frontend/src/app/router.tsx` with:

```tsx
import { createBrowserRouter } from 'react-router-dom'

import { CreateSharePage } from '../pages/CreateSharePage'
import { ViewSharePage } from '../pages/ViewSharePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CreateSharePage />,
  },
  {
    path: '/shares/:shareId',
    element: <ViewSharePage />,
  },
])
```

### 9. Verify the frontend files before running the app

From `frontend/`:

```bash
find src -maxdepth 4 -type f | sort
sed -n '1,260p' src/types/share.ts
sed -n '1,360p' src/lib/crypto/text.ts
sed -n '1,280p' src/components/ShareForm.tsx
sed -n '1,280p' src/components/ShareResult.tsx
sed -n '1,320p' src/pages/CreateSharePage.tsx
sed -n '1,360p' src/pages/ViewSharePage.tsx
sed -n '1,220p' src/app/router.tsx
```

Check that:

- the crypto helper file exists
- the create page encrypts before POSTing
- the result page shows URL and key separately
- the retrieval page asks for a decryption key

### 10. Run backend and frontend together

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
2. enter a secret like `hello rahasia`
3. create the share
4. confirm you get:
   - a share URL
   - a separate decryption key
5. open the share URL
6. paste the decryption key
7. click `Decrypt share`
8. confirm the plaintext appears

Expected behavior:

- the create page still works
- the retrieval page fetches the share successfully
- plaintext is only shown after decryption

### 11. Test incorrect key behavior

On the retrieval page:

1. paste an incorrect key
2. click `Decrypt share`

Expected behavior:

- decryption fails
- the page shows a readable error message
- plaintext is not revealed

### 12. Verify the backend no longer receives plaintext

This is an important conceptual check for this step.

After creating a share from the frontend, use the backend retrieval endpoint directly and inspect the stored payload.

From another terminal:

```bash
curl http://127.0.0.1:8000/shares/<share-id>
```

Expected behavior:

- `encrypted_payload` should now be a serialized encrypted structure
- it should not equal the original secret text

Example output shape:

```json
{
  "id": "<share-id>",
  "type": "text",
  "encrypted_payload": "{\"iv\":\"...\",\"ciphertext\":\"...\"}",
  "file_name": null,
  "file_size": null,
  "mime_type": null,
  "burn_after_read": false,
  "expires_at": "2026-04-18T12:34:56Z"
}
```

That confirms:

- the browser encrypted before upload
- the backend only stores encrypted data

### 13. Optional sanity checks

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

After this step, the frontend should:

- encrypt text in the browser before sending it to the backend
- show a generated decryption key after share creation
- fetch encrypted payloads from the backend
- decrypt them in the browser only after the user provides the key

This is the first end-to-end encrypted browser flow for text shares.

---

## What Not To Do Yet

- Do not add password-based encryption yet
- Do not add file encryption yet
- Do not add burn-after-read mutation yet
- Do not polish the full UX yet

This step is only generated-key text encryption/decryption.

---

## Verification

Before committing:

```bash
git status --short
find frontend -maxdepth 4 -type f -not -path 'frontend/node_modules/*' -not -path 'frontend/dist/*' | sort
sed -n '1,260p' frontend/src/types/share.ts
sed -n '1,360p' frontend/src/lib/crypto/text.ts
sed -n '1,280p' frontend/src/components/ShareForm.tsx
sed -n '1,280p' frontend/src/components/ShareResult.tsx
sed -n '1,320p' frontend/src/pages/CreateSharePage.tsx
sed -n '1,360p' frontend/src/pages/ViewSharePage.tsx
sed -n '1,220p' frontend/src/app/router.tsx
```

Make sure:

- the browser create flow still works
- the created result shows a separate decryption key
- the backend payload is encrypted, not plaintext
- the retrieval page only reveals plaintext after correct decryption
- a wrong key produces an error
- build and lint still pass

---

## Finish This Step

From the repo root:

```bash
git add frontend
git commit -m "feat: add client-side encryption and decryption"
```

---

## Commit Message

```text
feat: add client-side encryption and decryption
```
