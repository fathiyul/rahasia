# MATERIAL: Web Crypto

## Purpose

This document explains what the **Web Crypto API** is and how it is being used in this project.

It is written for the practical question:

- why does an end-to-end encrypted sharing app need crypto at all?
- why is the crypto happening in the browser?
- what are the actual moving parts in this codebase?

This is not a blockchain, Web3, or cryptocurrency topic.

---

## What “Web Crypto” Means

The **Web Crypto API** is the browser’s built-in cryptography API.

In JavaScript, you usually access it through:

```ts
window.crypto
window.crypto.subtle
```

The important part for this app is:

- `crypto.subtle.generateKey(...)`
- `crypto.subtle.encrypt(...)`
- `crypto.subtle.decrypt(...)`
- `crypto.subtle.exportKey(...)`
- `crypto.subtle.importKey(...)`

So when this project says “Web Crypto”, it means:

- use the browser’s native crypto primitives
- do encryption and decryption on the client side
- do **not** send plaintext to the backend

---

## What It Is Not

“Web Crypto” does **not** mean:

- cryptocurrency
- blockchain
- DeFi
- wallets
- smart contracts
- Web3

Those are unrelated topics.

The only reason the word “crypto” appears here is because the app needs **cryptography**.

---

## Why This App Needs Crypto

The product goal is:

- sender writes text or selects a file
- app stores only encrypted data
- sender gives recipient:
  - the share link
  - the decryption key
- recipient decrypts locally

Without cryptography, the app would only be:

- regular file/text sharing
- with a database and links

That would not be end-to-end encrypted.

If the backend ever receives plaintext, then:

- the backend can read the content
- the database can contain readable content
- anyone with server-side access can inspect the content

That breaks the core privacy model.

So crypto is not an optional extra here. It is the mechanism that makes the product claim true.

---

## Why Encryption Happens In The Browser

This app wants the backend to know as little as possible.

So the intended data flow is:

1. user enters plaintext text or selects a file
2. browser encrypts it
3. browser sends only encrypted payload + metadata to backend
4. backend stores encrypted payload
5. recipient fetches encrypted payload
6. recipient browser decrypts it with the key

That means:

- encryption happens before upload
- decryption happens after download
- the backend never needs plaintext

This is why the Web Crypto API is the right tool here:

- it is built into the browser
- it avoids sending raw data to the server
- it keeps the key on the client side

---

## End-to-End Encryption In This Project

In this repo, “end-to-end encrypted” means:

- sender’s browser encrypts the content
- backend stores ciphertext, not plaintext
- recipient’s browser decrypts the content
- decryption key is not stored by the backend

This protects against:

- casual inspection of the database
- backend logic that would otherwise read plaintext
- server-side operators seeing cleartext by default

It does **not** magically protect against everything.

It does not protect against:

- compromised sender device
- compromised recipient device
- a sender leaking the decryption key
- malicious frontend code if your deployment is compromised
- someone seeing plaintext on screen after decryption

So the promise is strong, but not absolute.

---

## The Core Crypto Design Here

This app uses:

- **AES-GCM**

That choice matters because AES-GCM gives you:

- encryption
- integrity protection

In practical terms:

- the ciphertext is unreadable without the key
- tampering should cause decryption to fail

This is why AES-GCM is a strong default for browser-side symmetric encryption.

---

## Plaintext vs Ciphertext

These two words are fundamental to the whole app.

**Plaintext** means:

- the original readable content
- the text or file bytes before encryption

Examples:

- a note like `my wifi password is ...`
- the raw bytes of a `.png` file
- the raw bytes of a `.pdf` file

**Ciphertext** means:

- the encrypted output
- the unreadable version produced by encryption

The backend should only ever store:

- ciphertext
- IV
- metadata

It should not store plaintext.

So in this app:

- before encryption: sender has plaintext
- after encryption: backend stores ciphertext
- after decryption: recipient gets plaintext again

That is the full cycle.

---

## What AES Means

**AES** stands for:

- Advanced Encryption Standard

In practical terms for this app, AES is:

- the underlying symmetric encryption algorithm
- the thing that turns plaintext bytes into ciphertext bytes when used with a key

“Symmetric” means:

- the same secret key is used for both encryption and decryption

That is different from asymmetric/public-key crypto, where:

- one key encrypts
- another key decrypts

This app is currently using symmetric encryption because:

- the browser can generate a strong random key
- the sender can share that key separately
- the recipient can use that same key to decrypt

So when you see AES here, think:

- strong shared-key encryption

not:

- passwords
- public/private keypairs
- blockchain anything

---

## What GCM Means

**GCM** stands for:

- Galois/Counter Mode

You do not need the math to use it correctly, but you do need the practical meaning.

For this app, GCM matters because it gives you two things at once:

1. **confidentiality**
   - the content is hidden without the key
2. **integrity/authentication**
   - tampered data should fail to decrypt

That second property is especially important.

Without authenticated encryption, an attacker or corrupted system might:

- alter the encrypted payload
- produce damaged output
- potentially lead to confusing or unsafe results

With AES-GCM, if the ciphertext, IV, or key is wrong, decryption should fail instead of silently returning nonsense.

So the practical mental model is:

- AES = the encryption algorithm
- GCM = the mode that makes it authenticated and safe to use this way

---

## Symmetric Key vs Password

So far, this project uses a **generated symmetric key**.

That means:

- the browser generates a random encryption key
- that same key is used later for decryption

This is different from a password-based system.

Current model:

- sender gets a generated decryption key
- sender shares it separately

Possible later model:

- sender chooses a password
- browser derives a key from that password

That later flow would add key-derivation concepts like PBKDF2 or Argon2. That is **not** what the current implementation is doing yet.

---

## What AES-GCM Needs

For AES-GCM, you need:

- a secret key
- plaintext bytes
- an IV

After encryption, you get:

- ciphertext

For decryption, you need:

- the same key
- the same IV
- the ciphertext

That is why this app stores:

- ciphertext
- IV

And separately shares:

- decryption key

If any of those pieces are wrong, decryption fails.

---

## What An IV Is

An **IV** is an initialization vector.

You can think of it as:

- non-secret per-encryption input
- used to make repeated encryptions safe and distinct

Important properties:

- it is **not** the secret key
- it can be stored alongside the ciphertext
- it must be generated fresh for each encryption

In this project, the IV is generated like this:

```ts
const iv = crypto.getRandomValues(new Uint8Array(12))
```

Why 12 bytes:

- that is the standard AES-GCM nonce size
- it is the most common and recommended size for GCM

If you reused the same IV unsafely with the same key, that could break security assumptions. So a fresh random IV per encryption matters.

---

## Why IV Reuse Is Dangerous

This is one of the easiest crypto rules to get wrong.

For AES-GCM, you should treat the IV as:

- unique per encryption under the same key

If you reuse an IV with the same key, you can break important security guarantees.

You do not need the full cryptanalysis details to understand the consequence:

- repeated IV reuse under the same key is unsafe
- it can leak structure or undermine integrity guarantees

That is why this app always generates a fresh IV at encryption time:

```ts
const iv = crypto.getRandomValues(new Uint8Array(12))
```

And that is why the IV is stored alongside the ciphertext:

- it is needed later for decryption
- it is not secret
- but it must match the original encryption operation

So the safe rule is:

- **same key + new IV each encryption**

---

## Why The Key Is Shared Separately

The backend stores encrypted payloads, but not decryption keys.

That is deliberate.

If the backend stored both:

- ciphertext
- IV
- decryption key

then the backend could decrypt everything.

That would defeat the point of end-to-end encryption.

So the design is:

- backend stores ciphertext + IV + metadata
- sender separately shares the decryption key with the recipient

This is why the share result UI shows:

- share URL
- decryption key

as separate things.

---

## Why The Payload Is Serialized

The encrypted payload is not stored as a raw binary object in the API request.

Instead, this app serializes the payload into JSON:

```json
{
  "iv": "...",
  "ciphertext": "..."
}
```

Why:

- the backend API already accepts JSON
- JSON is easy to send and store
- frontend can parse it back reliably later

So the pattern is:

- encrypt bytes
- convert IV and ciphertext into string-safe format
- serialize to JSON string
- send/store that string

---

## Why Base64url Encoding Exists

The browser crypto API gives you bytes, not friendly JSON strings.

But JSON and URLs work best with strings.

So the app converts binary data into **base64url** strings.

This is why helper functions like these exist:

- `bytesToBase64Url(...)`
- `base64UrlToBytes(...)`

Why not raw bytes directly:

- JSON cannot safely carry raw binary
- URLs and text payloads need string-safe values

Why **base64url**, not plain base64:

- avoids `+` and `/`
- safer for URLs and fragments
- easier to copy around

So:

- IV becomes a base64url string
- ciphertext becomes a base64url string
- exported key becomes a base64url string

---

## Why Wrong-Key Or Tampered Decryption Fails

In this app, decryption is expected to fail if:

- the user pastes the wrong key
- the ciphertext was modified
- the IV was modified
- the payload was corrupted in storage or transit

That is a feature, not a bug.

Because AES-GCM is authenticated encryption, it does not just try to “best effort” decode something. It verifies that the encrypted data matches the key and IV correctly.

So if any important piece is wrong, the browser crypto API should reject the decryption operation.

That is why your code can treat these cases as:

- “failed to decrypt”

instead of:

- “got weird garbage text”

This is also why the app shows a decryption error for the wrong key rather than partial output.

---

## How Text Encryption Works Here

Text is handled like this:

1. convert plaintext string into bytes
2. encrypt bytes with AES-GCM
3. store `{ iv, ciphertext }`
4. export key into a shareable string

Later:

1. fetch encrypted payload
2. parse `{ iv, ciphertext }`
3. import key from the provided key string
4. decrypt bytes
5. decode bytes back into text

That is why the text helper layer contains:

- `encryptText(...)`
- `decryptText(...)`

But under the hood it now reuses byte-oriented helpers.

---

## How File Encryption Works Here

Files use the same crypto, but a different wrapper.

File flow:

1. read file into bytes
2. encrypt bytes with AES-GCM
3. store encrypted payload + file metadata
4. export key string

Later:

1. fetch encrypted payload + metadata
2. decrypt bytes
3. rebuild a `Blob`
4. create a download URL
5. let the user download the file

So the difference between text and file is mostly:

- input conversion
- output conversion

The actual cryptography is the same.

---

## Why The Backend Can Store File Shares Without Understanding Them

The backend does not need to understand file contents.

It only needs:

- encrypted payload
- file name
- file size
- MIME type

That is enough for the frontend to:

- identify that the share is a file
- decrypt bytes locally
- rebuild the file download

So the backend acts more like:

- encrypted blob storage
- lifecycle enforcement
- metadata storage

not as a file parser or decryptor.

---

## Why Burn-After-Read Affects The Retrieval Flow

Once burn-after-read exists, retrieval is not just:

- fetch data

It becomes:

- fetch data
- consume availability

That is why the frontend cannot safely auto-fetch a burn-after-read share on page load.

If it did:

- opening the page would consume the share
- React dev behavior could trigger double-fetches
- the user could lose the share before intentionally decrypting it

So the correct pattern is:

1. user opens share page
2. user provides key
3. user clicks decrypt
4. frontend fetches encrypted payload only then

This is partly a lifecycle concern, but it matters to the crypto UX because the encrypted payload is effectively single-use in that mode.

---

## Why The App Uses Browser APIs Instead Of A Custom Crypto Library First

Using the browser’s native crypto API is a sensible starting point because:

- it is built in
- it is standardized
- it avoids pulling in crypto dependencies early
- it is well matched to browser-side encryption/decryption

That does not mean all third-party crypto libraries are bad.

It means:

- for this use case, the platform already provides what you need

That keeps the implementation smaller and avoids unnecessary package risk.

---

## Common Related Questions

### Is the backend totally blind?

Not totally.

The backend still knows:

- share ID
- share type
- file metadata
- expiration
- whether the share was opened

But it should **not** know:

- plaintext text
- decrypted file contents
- decryption key

So the backend still knows operational metadata, but not the secret content itself.

### If the backend cannot decrypt, how can the recipient decrypt?

Because the recipient has:

- the encrypted payload from the backend
- the decryption key from the sender

That is enough.

### Why not put the key directly in the main URL?

You usually want to keep the key separate from the backend-visible request path.

In some designs, the key goes in the URL fragment (`#...`) because fragments are not sent to the server during HTTP requests.

In your current flow, you chose to show:

- the link
- the decryption key

as separate values, which keeps that separation explicit.

### Why does wrong key decryption fail instead of giving garbage text?

Because AES-GCM includes authentication/integrity checks.

If the key, IV, or ciphertext is wrong or tampered with, decryption should fail.

### Can encrypted files be larger than encrypted text?

Yes, but larger files make this design less efficient because:

- everything is being handled in memory in the browser
- everything is being sent as JSON-friendly encoded payload
- everything is currently stored in the DB row

That is fine for small MVP files, but not a long-term large-file architecture.

---

## How This Maps To The Current Codebase

Key files:

- [text.ts](/home/fathiyul/01-project/rahasia/frontend/src/lib/crypto/text.ts)
- [file.ts](/home/fathiyul/01-project/rahasia/frontend/src/lib/crypto/file.ts)
- [CreateSharePage.tsx](/home/fathiyul/01-project/rahasia/frontend/src/pages/CreateSharePage.tsx)
- [ViewSharePage.tsx](/home/fathiyul/01-project/rahasia/frontend/src/pages/ViewSharePage.tsx)
- [share.ts](/home/fathiyul/01-project/rahasia/frontend/src/types/share.ts)

Rough responsibility split:

- `text.ts`
  - byte helpers
  - text encryption/decryption wrappers
  - payload serialization/parsing

- `file.ts`
  - file-to-bytes wrapper
  - bytes-to-blob wrapper

- `CreateSharePage.tsx`
  - chooses text or file encryption path
  - sends encrypted payload to backend

- `ViewSharePage.tsx`
  - fetches encrypted payload
  - decrypts text or file in browser
  - presents plaintext or download link

---

## Summary

For this project, Web Crypto means:

- browser-native cryptography
- client-side encryption before upload
- client-side decryption after retrieval
- backend stores ciphertext, not plaintext

That is the mechanism that makes the app meaningfully end-to-end encrypted instead of just “shared by link.”
