import { useState } from 'react'

import { ShareForm } from '../components/ShareForm'
import { ShareResult } from '../components/ShareResult'
import { createShare } from '../lib/api/shares'
import { encryptText, serializeEncryptedTextPayload } from '../lib/crypto/text'
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
      const { encryptedPayload, decryptionKey } = await encryptText(
        values.content,
      )

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
