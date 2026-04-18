import type { EncryptedTextPayload } from '../../types/share'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''

    bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
    })

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
    const binary = atob(`${normalized}${padding}`)

    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return Uint8Array.from(bytes).buffer as ArrayBuffer
}

export function serializeEncryptedTextPayload(
    payload: EncryptedTextPayload,
): string {
    return JSON.stringify(payload)
}

export function parseEncryptedTextPayload(value: string):
EncryptedTextPayload {
    const parsed = JSON.parse(value) as Partial<EncryptedTextPayload>

    if (
    typeof parsed.iv !== 'string' ||
    typeof parsed.ciphertext !== 'string'
    ) {
    throw new Error('Invalid encrypted payload format')
    }

    return {
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
    }
}

export async function encryptText(
    plaintext: string,
): Promise<{
    encryptedPayload: EncryptedTextPayload
    decryptionKey: string
}> {
    const key = await crypto.subtle.generateKey(
    {
        name: 'AES-GCM',
        length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedPlaintext = encoder.encode(plaintext)

    const encrypted = await crypto.subtle.encrypt(
    {
        name: 'AES-GCM',
        iv,
    },
    key,
    encodedPlaintext,
    )

    const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key))

    return {
    encryptedPayload: {
        iv: bytesToBase64Url(iv),
        ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
    },
    decryptionKey: bytesToBase64Url(rawKey),
    }
}

export async function decryptText(
    payload: EncryptedTextPayload,
    decryptionKey: string,
): Promise<string> {
    try {
    const keyBytes = base64UrlToBytes(decryptionKey)
    const key = await crypto.subtle.importKey(
        'raw',
        toArrayBuffer(keyBytes),
        {
        name: 'AES-GCM',
        },
        false,
        ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
        {
        name: 'AES-GCM',
        iv: toArrayBuffer(base64UrlToBytes(payload.iv)),
        },
        key,
        toArrayBuffer(base64UrlToBytes(payload.ciphertext)),
    )

    return decoder.decode(decrypted)
    } catch {
    throw new Error('Failed to decrypt share. Check the decryption key.')
    }
}
