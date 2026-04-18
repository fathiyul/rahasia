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
