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
