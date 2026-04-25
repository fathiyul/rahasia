# Phase 2 Config Notes

This document explains the configuration surface that Phase 2 will add.

It exists so the repo has one place that describes the upcoming auth and deployment-related environment variables before the full implementation is finished.

## Current State

Right now, the Phase 1 app still uses the existing backend environment example:

- `backend/.env.example`

That file currently covers:

- database connection
- CORS origins
- request and payload limits
- rate limiting settings

The frontend does not yet have its own committed `.env.example` file for Phase 2 runtime values.

## Phase 2 Direction

Phase 2 will add configuration for:

- optional Google login through Clerk
- explicit frontend runtime values
- deployed frontend and backend public URLs
- future Firebase Hosting and Cloud Run deployment settings

## Backend Environment File

The backend will continue to use:

- `backend/.env.example`

Phase 2 is expected to expand that file with placeholders such as:

- app environment mode
- backend public URL
- frontend public URL
- Clerk-related backend verification settings

These values should stay as placeholders in the example file. Real secrets must not be committed.

## Frontend Environment File

Phase 2 is expected to introduce:

- `frontend/.env.example`

That file will likely hold Vite-prefixed variables such as:

- API base URL
- Clerk publishable key
- frontend app URL

This is mainly needed because a deployed frontend cannot rely only on the Phase 1 local dev proxy behavior.

## Clerk Keys

Any Clerk keys shown in example files should be obviously fake placeholder values such as:

- `pk_test_replace_me`
- `sk_test_replace_me`

Do not commit real publishable or secret keys into the repository.

## Deployment Note

This document does not mean Firebase Hosting, Cloud Run, or Clerk are fully wired yet.

It only records the configuration direction so later Phase 2 steps can use a consistent variable contract instead of inventing names ad hoc.

Production values should be finalized later when:

- backend auth verification is implemented
- frontend auth integration is implemented
- Firebase Hosting deployment is configured
- Cloud Run deployment is configured
