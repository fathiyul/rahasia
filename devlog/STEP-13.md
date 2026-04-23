# STEP-13

## Goal

Add encrypted file sharing on top of the text-sharing flow you already have.

This step should leave you with:

- file selection in the create form
- browser-side file encryption before upload
- file metadata stored with the share
- browser-side file decryption after retrieval
- a download link for the decrypted file

This step does **not** include:

- large-file optimizations
- object storage
- chunked uploads
- file validation limits
- automated tests

---

## Starting Point

Expected starting state:

- Step 12 is already committed
- text sharing works end-to-end
- burn-after-read and expiration are already enforced
- the backend schema already has `file_name`, `file_size`, and `mime_type`
- the frontend still only supports text in practice

Check:

```bash
git status --short
git log --oneline --decorate -n 8
sed -n '1,260p' backend/app/schemas/share.py
sed -n '1,260p' frontend/src/components/ShareForm.tsx
```

You should see:

- clean working tree
- latest commit around Step 12
- backend request/response schemas already include file metadata fields
- the frontend form still has `File (later step)` disabled

---

## Design Choice For This Step

For local development, use the **existing database row** to store encrypted file payloads inside `encrypted_payload`.

Why this is acceptable right now:

- the backend model already stores encrypted payload + metadata together
- the current API contract already supports file metadata
- this keeps Step 13 focused on getting the feature working end-to-end

Why this is only a dev/MVP choice:

- base64-encoded encrypted files are not efficient for larger payloads
- the database should not become your long-term blob store
- production will likely move encrypted file blobs to object storage later

So the rule for this step is:

- **support small encrypted files end-to-end using the existing table**

---

## Do This

### 1. Confirm the backend already has the fields this step needs

Before adding frontend file support, confirm that the backend contract already supports:

- `type = "file"`
- `file_name`
- `file_size`
- `mime_type`

That is important because Step 13 should mostly be frontend work, not another backend schema step.

Check:

```bash
sed -n '1,260p' backend/app/schemas/share.py
sed -n '1,260p' backend/app/services/share_service.py
```

You should see:

- `CreateShareRequest` already includes file metadata fields
- `create_share()` already persists those fields
- `GetShareResponse` already returns those fields

If those fields are missing, stop and fix that first. Otherwise continue without widening the backend.

### 2. Extend the frontend share types for file input and generic encrypted payloads

Right now the frontend types are still text-centric:

- form values only carry `content`
- the encrypted payload type is named as if it were only for text

That is too narrow now.

In this step:

- the form needs both plaintext text and an optional selected file
- the encrypted payload shape stays the same for text and file: `iv + ciphertext`

Replace `frontend/src/types/share.ts` with:

```ts
export type ShareType = 'text' | 'file'

export type CreateShareFormValues = {
  type: ShareType
  content: string
  file: File | null
  expires_in: number
  burn_after_read: boolean
}

export type EncryptedPayload = {
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

What changed:

- `CreateShareFormValues` now carries `file`
- `EncryptedPayload` is generic enough for text and file
- the API payload shape stays compatible with the backend you already built

### 3. Refactor the text crypto helper into a reusable byte-based helper

Text and files both need the same low-level cryptography:

- generate an AES-GCM key
- encrypt bytes
- export the key
- import the key later
- decrypt bytes

The only real difference is:

- text starts as a string and ends as a string
- file starts as bytes and ends as a `Blob`

So this substep makes `text.ts` reusable by exposing generic byte helpers.

Replace `frontend/src/lib/crypto/text.ts` with:

```ts
import type { EncryptedPayload } from '../../types/share'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  const binary = atob(`${normalized}${padding}`)

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer as ArrayBuffer
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload)
}

export function parseEncryptedPayload(value: string): EncryptedPayload {
  const parsed = JSON.parse(value) as Partial<EncryptedPayload>

  if (typeof parsed.iv !== 'string' || typeof parsed.ciphertext !== 'string') {
    throw new Error('Invalid encrypted payload format')
  }

  return {
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
  }
}

export async function encryptBytes(bytes: Uint8Array): Promise<{
  encryptedPayload: EncryptedPayload
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

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    bytes,
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

export async function decryptBytes(
  payload: EncryptedPayload,
  decryptionKey: string,
): Promise<Uint8Array> {
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

    return new Uint8Array(decrypted)
  } catch {
    throw new Error('Failed to decrypt share. Check the decryption key.')
  }
}

export async function encryptText(plaintext: string): Promise<{
  encryptedPayload: EncryptedPayload
  decryptionKey: string
}> {
  return encryptBytes(encoder.encode(plaintext))
}

export async function decryptText(
  payload: EncryptedPayload,
  decryptionKey: string,
): Promise<string> {
  const decrypted = await decryptBytes(payload, decryptionKey)
  return decoder.decode(decrypted)
}
```

What changed:

- the payload type is now generic
- the low-level crypto is byte-based
- text encryption/decryption is now just a thin wrapper around byte encryption/decryption

### 4. Add a file crypto helper

This substep adds the file-specific wrapper around the reusable byte helpers.

The file helper should:

- read the selected file into bytes
- encrypt those bytes
- return the encrypted payload plus file metadata
- decrypt back into a `Blob`

Create `frontend/src/lib/crypto/file.ts` with:

```ts
import type { EncryptedPayload } from '../../types/share'
import { decryptBytes, encryptBytes } from './text'

export async function encryptFile(file: File): Promise<{
  encryptedPayload: EncryptedPayload
  decryptionKey: string
  fileName: string
  fileSize: number
  mimeType: string | null
}> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { encryptedPayload, decryptionKey } = await encryptBytes(bytes)

  return {
    encryptedPayload,
    decryptionKey,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || null,
  }
}

export async function decryptFile(
  payload: EncryptedPayload,
  decryptionKey: string,
  mimeType: string | null,
): Promise<Blob> {
  const decrypted = await decryptBytes(payload, decryptionKey)

  return new Blob([decrypted], {
    type: mimeType ?? 'application/octet-stream',
  })
}
```

### 5. Update the create form to support both text and file input

Right now the form is hard-coded around the textarea.

That needs to change so the user can choose:

- text share
- file share

The form should:

- keep both text state and file state
- render the correct input based on `type`
- only require the active input
- stop disabling the file option

Replace `frontend/src/components/ShareForm.tsx` with:

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiresIn, setExpiresIn] = useState('3600')
  const [burnAfterRead, setBurnAfterRead] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onSubmit({
      type,
      content,
      file: selectedFile,
      expires_in: Number(expiresIn),
      burn_after_read: burnAfterRead,
    })
  }

  const isSubmitDisabled =
    isSubmitting ||
    (type === 'text'
      ? content.trim().length === 0
      : selectedFile === null)

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
          <option value="file">File</option>
        </select>
      </div>

      {type === 'text' ? (
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
      ) : (
        <div className="field">
          <label htmlFor="share-file">File</label>
          <input
            id="share-file"
            type="file"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            required
          />
          <p className="hint">
            The file is encrypted in your browser before upload.
          </p>
        </div>
      )}

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

      <button type="submit" disabled={isSubmitDisabled}>
        {isSubmitting ? 'Encrypting and creating...' : 'Create share'}
      </button>
    </form>
  )
}
```

### 6. Update the create page to branch between text and file encryption

The form only collects user input.

The page is still responsible for:

- deciding how to encrypt based on the selected share type
- building the backend payload
- sending metadata for file shares

Replace `frontend/src/pages/CreateSharePage.tsx` with:

```tsx
import { useState } from 'react'

import { ShareForm } from '../components/ShareForm'
import { ShareResult } from '../components/ShareResult'
import { createShare } from '../lib/api/shares'
import { encryptFile } from '../lib/crypto/file'
import { encryptText, serializeEncryptedPayload } from '../lib/crypto/text'
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
      let payload: CreateSharePayload
      let decryptionKey: string

      if (values.type === 'text') {
        const encryptedResult = await encryptText(values.content)
        decryptionKey = encryptedResult.decryptionKey

        payload = {
          type: 'text',
          encrypted_payload: serializeEncryptedPayload(
            encryptedResult.encryptedPayload,
          ),
          expires_in: values.expires_in,
          burn_after_read: values.burn_after_read,
        }
      } else {
        if (!values.file) {
          throw new Error('Choose a file to share.')
        }

        const encryptedResult = await encryptFile(values.file)
        decryptionKey = encryptedResult.decryptionKey

        payload = {
          type: 'file',
          encrypted_payload: serializeEncryptedPayload(
            encryptedResult.encryptedPayload,
          ),
          file_name: encryptedResult.fileName,
          file_size: encryptedResult.fileSize,
          mime_type: encryptedResult.mimeType,
          expires_in: values.expires_in,
          burn_after_read: values.burn_after_read,
        }
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
          Your text or file is encrypted in the browser before it is sent to
          the backend.
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

### 7. Update the retrieval page to decrypt either text or file

Now the retrieval page has two possible successful outcomes:

- plaintext text
- decrypted file ready for download

That means the page must:

- parse the generic encrypted payload
- decrypt text shares into a string
- decrypt file shares into a `Blob`
- create an object URL for download
- revoke old object URLs when they are replaced or the page unmounts

Replace `frontend/src/pages/ViewSharePage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getShare } from '../lib/api/shares'
import { decryptFile } from '../lib/crypto/file'
import { decryptText, parseEncryptedPayload } from '../lib/crypto/text'
import type { GetShareResponse } from '../types/share'

function getLoadErrorMessage(
  error: string | null,
  missingShareId: boolean,
): string {
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const missingShareId = !shareId
  const loadErrorMessage = getLoadErrorMessage(error, missingShareId)

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  async function handleDecrypt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!shareId) {
      return
    }

    const currentShareId = shareId

    setError(null)
    setDecryptError(null)
    setDecryptedContent(null)

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }

    setIsDecrypting(true)

    try {
      const response = await getShare(currentShareId)
      setShare(response)

      const payload = parseEncryptedPayload(response.encrypted_payload)

      if (response.type === 'text') {
        const plaintext = await decryptText(payload, decryptionKey.trim())
        setDecryptedContent(plaintext)
      } else {
        const blob = await decryptFile(
          payload,
          decryptionKey.trim(),
          response.mime_type,
        )
        const nextDownloadUrl = URL.createObjectURL(blob)
        setDownloadUrl(nextDownloadUrl)
      }
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

              {share.file_name ? (
                <div className="field">
                  <label>File name</label>
                  <input value={share.file_name} readOnly />
                </div>
              ) : null}

              {share.file_size !== null ? (
                <div className="field">
                  <label>File size</label>
                  <input value={`${share.file_size} bytes`} readOnly />
                </div>
              ) : null}

              {share.mime_type ? (
                <div className="field">
                  <label>MIME type</label>
                  <input value={share.mime_type} readOnly />
                </div>
              ) : null}
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

          {downloadUrl && share?.type === 'file' ? (
            <section className="card stack">
              <h2>Decrypted file</h2>
              <p className="hint">
                Your file is ready to download locally after decryption.
              </p>
              <a
                className="button-link"
                href={downloadUrl}
                download={share.file_name ?? 'secret-file'}
              >
                Download decrypted file
              </a>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
```

### 8. Add a small link style for the file download action

The download action is an `<a>` tag, not a `<button>`, because it points to a generated object URL.

It should still look like the rest of the UI.

Append this to `frontend/src/index.css`:

```css
.button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 12px 16px;
  border-radius: 10px;
  background: #2f5f4f;
  color: #fff;
  text-decoration: none;
}
```

### 9. Verify the frontend build still passes

Before trying the feature in the browser, make sure the frontend still compiles and lints cleanly.

From `frontend/`:

```bash
npm run lint
npm run build
```

Expected result:

- lint passes
- build passes

### 10. Verify the file-sharing flow in the browser

This is the main verification for Step 13.

Run the backend and frontend in dev mode, then test this exact sequence:

1. choose `File` in the create form
2. select a small local file, like a `.txt` or `.png`
3. create the share
4. copy the link and decryption key
5. open the share page in a new tab
6. paste the decryption key
7. click `Decrypt share`
8. confirm the download link appears
9. download the decrypted file and open it locally

What success looks like:

- the backend stores the share successfully
- the retrieval page shows file metadata after fetching
- decrypting creates a download link
- the downloaded file opens correctly

Also test a burn-after-read file share:

1. create a file share with burn-after-read enabled
2. open it once successfully
3. refresh or reopen the link

Expected result:

- first open succeeds
- second open shows the already-opened error state

---

## Expected Result

After this step:

- both text and file shares work in the same app flow
- files are encrypted in the browser before upload
- the backend stores only encrypted file payload + metadata
- recipients can decrypt files in the browser and download them locally

---

## What Not To Do Yet

Do not add these in this step:

- file size limits
- MIME restrictions
- object storage
- streaming decryption
- chunked uploads
- tests

Those belong in later hardening steps.

---

## Finish This Step

When verification is complete:

```bash
git add frontend
git commit -m "feat: add encrypted file sharing"
```
