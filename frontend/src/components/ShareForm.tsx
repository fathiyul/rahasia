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

      <button
        type="submit"
        disabled={isSubmitting || content.trim().length === 0}
      >
        {isSubmitting ? 'Encrypting and creating...' : 'Create share'}
      </button>
    </form>
  )
}
