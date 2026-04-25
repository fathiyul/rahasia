# MATERIAL: Auth, JWT, JWK, JWKS, and Clerk

## Purpose

This document explains the authentication concepts used in Rahasia Phase 2.

It is written for practical questions like:

- what problem auth is solving in this app
- what Clerk does
- what a JWT is
- what JWK and JWKS are
- what same-origin and cross-origin mean
- how these ideas connect to the backend auth code

This is not meant to be a full security textbook.

The goal is to make the Phase 2 auth layer understandable enough that you can work on it without treating it like unexplained magic.

---

## What Auth Means In This Project

In Phase 1, the app mostly cared about:

- anonymous link sharing
- encryption and decryption

In Phase 2, the app also needs:

- optional login
- groups
- group-restricted secrets

That means the backend must answer a new question:

- who is making this request?

That is the authentication problem.

Authentication means:

- verifying identity

Authorization is a separate question:

- deciding what that identity is allowed to access

In this project:

- Clerk helps with authentication
- your app code handles authorization

Examples:

- “Is this request really from a valid logged-in user?” is authentication
- “Is this valid user allowed to access this group secret?” is authorization

---

## What Clerk Does

Clerk is the external identity platform used for Phase 2.

For this app, Clerk is responsible for:

- Google sign-in
- session management
- issuing session tokens

Clerk is **not** your app database.

It does not replace:

- your `users` table
- your `groups`
- your group membership logic
- your secret access rules

So the responsibility split is:

- Clerk: login and session identity
- your backend: app-specific data and permissions

---

## What A JWT Is

JWT stands for:

- JSON Web Token

A JWT is a signed token that contains claims about a user or session.

You can think of it like:

- a tamper-evident identity card

It usually contains fields such as:

- who the user is
- who issued the token
- when it expires
- which session it belongs to

In this project, Clerk issues session tokens in JWT form.

The backend receives a token and needs to verify:

- was this really issued by Clerk?
- has it expired?
- is it meant for this app?

If yes, the backend can trust the identity claims inside it.

---

## What Claims Are

A claim is just a field inside the JWT payload.

Common claims you will see in this project:

- `sub`
- `sid`
- `iss`
- `exp`
- `iat`
- `nbf`
- `azp`

What they usually mean:

- `sub`: subject, usually the user ID
- `sid`: session ID
- `iss`: issuer
- `exp`: expiration time
- `iat`: issued at time
- `nbf`: not valid before this time
- `azp`: authorized party

The backend checks some of these to reject bad tokens.

---

## What JWK Is

JWK stands for:

- JSON Web Key

A JWK is a cryptographic key described in JSON.

It is usually a public key used to verify a signed JWT.

You do not normally type this by hand in the app.

It is just the machine-readable key format used by auth systems.

---

## What JWKS Is

JWKS stands for:

- JSON Web Key Set

A JWKS is a list of JWKs served from a URL.

This matters because:

- Clerk signs JWTs with a private key
- your backend verifies those JWTs with Clerk's public key
- Clerk exposes those public keys through a JWKS endpoint

So the backend flow is:

1. receive JWT
2. look up the right public key from Clerk JWKS
3. verify the JWT signature
4. trust the claims only if signature and claims are valid

This is why the auth code uses a JWK client.

---

## Why Signature Verification Matters

Without signature verification, anyone could forge a token that says:

- “I am user X”

and your backend would have no reason to trust it.

Signature verification solves that.

It lets the backend confirm:

- Clerk really issued this token
- the token has not been modified

That is the core security property of JWT verification.

---

## Same-Origin and Cross-Origin

An origin is made of:

- scheme
- host
- port

Examples:

- `http://127.0.0.1:5173`
- `http://127.0.0.1:8000`

These are different origins because the port is different.

Same-origin means:

- frontend page and request target share the same scheme, host, and port

Cross-origin means:

- one of those differs

In local development, your frontend and backend are usually cross-origin because:

- frontend runs on `5173`
- backend runs on `8000`

So yes, this is the same “origin” idea used in CORS.

---

## What CORS Means

CORS stands for:

- Cross-Origin Resource Sharing

This is a browser security mechanism.

By default, browsers do not let frontend JavaScript freely read responses from a different origin unless the backend allows it.

That is why your backend has CORS configuration.

In simple terms, CORS says:

- “Is this frontend origin allowed to talk to this backend origin from browser JavaScript?”

That is related to auth because Phase 2 login and API calls happen between frontend and backend origins.

It is not the same thing as authentication, but it affects whether frontend requests are allowed by the browser.

---

## Cookie vs Bearer Token

There are two common ways an authenticated browser request carries session identity:

- cookie
- `Authorization: Bearer <token>` header

In this project, the backend auth code checks both.

Why:

- same-origin flows often use cookies naturally
- cross-origin API flows often send bearer tokens explicitly

So the backend helper tries:

1. `Authorization` header
2. `__session` cookie

This makes the backend flexible enough for later frontend integration.

---

## What The `azp` Claim Is Doing

`azp` means:

- authorized party

It helps indicate which client app the token was meant for.

In this project, the backend checks it against known frontend origins when it exists.

That gives one more safety check:

- the token should not just be valid
- it should also be intended for this app's frontend

---

## How This Connects To The Backend Auth File

The backend auth file is not doing “magic auth.”

It is doing a concrete pipeline:

1. get token from request
2. find Clerk public key from JWKS
3. verify token signature
4. verify important claims
5. return a simple auth context object

That auth context is what future protected routes will consume.

So the auth file is basically:

- request token extraction
- token verification
- auth dependency helpers for FastAPI

---

## What This Does Not Do Yet

This auth foundation does **not** yet:

- create internal users automatically
- sync Clerk user data into the database
- decide group access
- enforce secret authorization rules

Those are later steps.

This document only explains the identity-verification layer.

---

## Practical Mental Model

Use this mental model:

- Clerk says: “this browser session belongs to this user”
- the backend verifies that claim
- your app then decides: “okay, what is that user allowed to do?”

That is the whole point of the Phase 2 auth foundation.
