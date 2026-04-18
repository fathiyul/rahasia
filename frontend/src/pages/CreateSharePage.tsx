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
