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
