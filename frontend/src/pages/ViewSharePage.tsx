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

            <button
              type="submit"
              disabled={isDecrypting || decryptionKey.trim().length === 0}
            >
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
