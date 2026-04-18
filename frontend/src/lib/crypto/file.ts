import type { EncryptedPayload } from '../../types/share'
import { decryptBytes, encryptBytes, toArrayBuffer } from './text'

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

  return new Blob([toArrayBuffer(decrypted)], {
    type: mimeType ?? 'application/octet-stream',
  })
}
