# PHASE-2-STEP-02

## Goal

Add Phase 2 configuration scaffolding for local development and future cloud deployment.

This step should leave you with:

- a clearer separation between local development config and future deployed config
- backend config placeholders for auth and public app URLs
- a frontend environment example file for Phase 2 runtime values
- a small public doc that explains the new config surface

This step does **not** include:

- real Clerk integration
- real Firebase Hosting setup
- real Cloud Run deployment
- production secret values
- backend auth verification logic

---

## Starting Point

Expected starting state:

- `PHASE-2-STEP-01` is already committed
- the repo still runs with the Phase 1 local setup
- `backend/.env.example` exists and only covers current backend settings
- the frontend does not yet have its own `.env.example`
- Phase 2 auth and cloud-deployment environment variables are not yet documented

Check:

```bash
git status --short
sed -n '1,200p' backend/.env.example
find frontend -maxdepth 1 -type f | sort
sed -n '1,220p' docs/public/LOCAL_SETUP.md
```

You should see:

- a clean working tree
- a backend env example with database and Phase 1 limits only
- no `frontend/.env.example`
- local setup docs that still describe only the Phase 1 configuration

Why this matters:

Phase 2 adds auth, user identity, and cloud deployment targets. If you wait too long to define the config surface, later steps end up hardcoding assumptions into backend and frontend code.

---

## Do This

### 1. Expand the backend environment example

The backend is about to gain two new responsibilities:

- understanding the public app URLs for local and deployed environments
- validating authenticated requests later in the phase

Even though auth verification is not implemented in this step, the config contract should exist now.

Update `backend/.env.example` so it includes:

- existing database and Phase 1 limits
- app environment mode such as `APP_ENV`
- public frontend URL
- public backend URL
- placeholder Clerk settings needed later for auth verification

A good Phase 2 example shape is:

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://rahasia:rahasia@localhost:5433/rahasia
BACKEND_PUBLIC_URL=http://127.0.0.1:8000
FRONTEND_PUBLIC_URL=http://127.0.0.1:5173
CORS_ALLOWED_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173"]

CLERK_SECRET_KEY=sk_test_replace_me
CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_JWT_ISSUER=https://your-clerk-domain.clerk.accounts.dev

MAX_REQUEST_BODY_BYTES=8500000
MAX_ENCRYPTED_PAYLOAD_CHARS=8000000
MAX_FILE_BYTES=5000000
MAX_EXPIRES_IN_SECONDS=2592000
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=30
```

Why include placeholder auth values now:

- later steps can rely on a known variable contract
- the example file tells you what the backend will eventually need
- you avoid inventing env names ad hoc during auth implementation

Important:

- use obvious placeholder values
- do not put real secrets in the example file

### 2. Add a frontend environment example

Phase 1 used the Vite dev proxy and did not need much explicit frontend runtime config.

Phase 2 changes that because the frontend will need:

- a backend API base URL for environments where the app is not using only the local dev proxy
- a Clerk publishable key
- optionally a public frontend URL if you want one explicit place to reference it

Create:

- `frontend/.env.example`

Use a shape like:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
VITE_APP_URL=http://127.0.0.1:5173
```

Why this file matters:

- Vite only exposes client variables that start with `VITE_`
- Phase 2 auth will need at least one explicit frontend runtime value
- production deployment will need a clearer API-origin story than “always use `/api`”

### 3. Add a small public config note for Phase 2 setup

At this point, another developer should be able to see which new env files exist and what they are for, even before auth is implemented.

Create a small doc such as:

- `docs/public/PHASE_2_CONFIG.md`

This document does not need to be long.

It should explain:

- which env example files exist
- which one belongs to backend vs frontend
- that Clerk keys are placeholders for now
- that Firebase Hosting and Cloud Run deployment variables will be finalized in later steps

A good document shape is:

1. purpose
2. backend env file
3. frontend env file
4. placeholder auth keys
5. note that production values are set later

### 4. Link the new config note from the existing docs

Do not rewrite all public docs yet.

Just add a light pointer where it will help:

- in `README.md`, or
- in `docs/public/LOCAL_SETUP.md`, or
- in both if the pointer stays concise

The point is not to fully document Clerk yet. The point is to make the new configuration surface discoverable.

### 5. Keep the implementation boundary clean

This step is only about config scaffolding.

That means:

- do not install Clerk packages yet
- do not change backend auth logic yet
- do not change frontend routing yet
- do not deploy anything yet

If you start wiring runtime behavior here, the step becomes muddy and harder to verify.

---

## Expected Result

After this step:

- `backend/.env.example` includes Phase 2 placeholder variables
- `frontend/.env.example` exists
- a small Phase 2 config doc exists under `docs/public/`
- the repo still behaves like Phase 1 at runtime because no auth logic is wired yet

---

## What Not To Do Yet

Do not:

- add Clerk SDK code
- read new env vars in the app yet unless needed for a harmless scaffold
- switch production deployment docs fully to Phase 2
- add database models for users or groups yet

That work belongs to the next steps.

---

## Verification

Run:

```bash
git status --short
sed -n '1,220p' backend/.env.example
sed -n '1,120p' frontend/.env.example
sed -n '1,200p' docs/public/PHASE_2_CONFIG.md
rg -n "PHASE_2_CONFIG|frontend/.env.example|CLERK_" README.md docs/public/LOCAL_SETUP.md docs/public/PHASE_2_CONFIG.md
```

Expected result:

- `backend/.env.example` contains placeholder Phase 2 auth and app URL settings
- `frontend/.env.example` exists and uses `VITE_` prefixes
- the new config doc explains the files without claiming auth already works
- at least one existing public doc points readers to the new config note

Success looks like:

- the configuration contract for upcoming Phase 2 work is visible
- no real secrets are committed
- no Phase 2 runtime behavior has been prematurely implemented

---

## Finish This Step

Stage the config scaffolding files:

```bash
git add backend/.env.example frontend/.env.example docs/public/PHASE_2_CONFIG.md README.md docs/public/LOCAL_SETUP.md devlog/PHASE-2-STEP-02.md
```

Adjust the staged file list if you chose to link the config note from only one public doc instead of both.

Then commit:

```bash
git commit -m "chore: add phase 2 config scaffolding"
```
