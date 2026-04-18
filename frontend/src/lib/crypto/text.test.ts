// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { decryptText, encryptText } from './text'

describe('text crypto', () => {
  it('round-trips plaintext with the correct key', async () => {
    const { encryptedPayload, decryptionKey } = await encryptText('hello')

    const plaintext = await decryptText(encryptedPayload, decryptionKey)

    expect(plaintext).toBe('hello')
  })

  it('fails with the wrong key', async () => {
    const { encryptedPayload } = await encryptText('hello')
    const { decryptionKey: wrongKey } = await encryptText('something else')

    await expect(decryptText(encryptedPayload, wrongKey)).rejects.toThrow(
      'Failed to decrypt share. Check the decryption key.',
    )
  })
})
