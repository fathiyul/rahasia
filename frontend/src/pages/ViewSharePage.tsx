import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getShare } from '../lib/api/shares'
import { decryptText, parseEncryptedTextPayload } from '../lib/crypto/text'
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
      ) : null}
    </main>
  )
}
