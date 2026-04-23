For this project, a monorepo is the right choice because:

- frontend and backend are one product with one PRD and one release cycle
- you’ll change API contracts and UI together often
- local setup is simpler
- deployment can still be separate later

Use this shape:

rahasia/
frontend/
backend/
infra/
docs/
PRD.md
README.md
.gitignore
docker-compose.yml

Do not split into separate repos yet. Split later only if:

- different teams own frontend/backend
- release cycles diverge heavily
- backend becomes a reusable platform for multiple clients

## Updated Step-by-Step Plan

### Step 1: Initialize the repo

Do:

- git init
- create base folders: frontend, backend, infra, docs
- add root .gitignore
- add root README.md
- keep PRD.md at root

Commit:

- chore: initialize monorepo structure

### Step 2: Set up the frontend app

Do:

- scaffold React + Vite + TypeScript inside frontend/
- install basic app deps
- install routing
- create initial folders:
- src/pages
- src/components
- src/lib
- src/types
- make sure the app runs locally

Commit:

- chore: scaffold frontend app

### Step 3: Set up the backend app

Do:

- create FastAPI project inside backend/
- add dependency management
- create initial backend folders:
- app/api
- app/core
- app/db
- app/models
- app/schemas
- app/services
- create a health endpoint
- make sure backend runs locally

Commit:

- chore: scaffold backend app

### Step 4: Add local database

Do:

- choose PostgreSQL
- add docker-compose.yml at repo root for Postgres
- add backend env config for DB connection
- verify backend can connect to the DB

Commit:

- chore: add local postgres setup

### Step 5: Add database migrations

Do:

- set up Alembic in backend/
- connect Alembic to your SQLAlchemy models
- create the initial migration workflow
- confirm migrations run cleanly

Commit:

- chore: add database migration setup

### Step 6: Create the core shares table

Do:

- create the main model for shares
- support both text and file
- include:
- id
- type
- encrypted_payload
- file_name
- file_size
- mime_type
- expires_at
- burn_after_read
- is_deleted
- read_at
- created_at
- generate and apply the first real migration

Commit:

- feat: add share data model

### Step 7: Implement share creation API

Do:

- add POST /shares
- validate request payload
- store encrypted payload and metadata
- return share ID
- reject invalid expiration or oversized payloads

Commit:

- feat: implement share creation endpoint

### Step 8: Implement share retrieval API

Do:

- add GET /shares/{id}
- return encrypted payload and metadata
- reject expired or deleted shares
- prepare logic for burn-after-read

Commit:

- feat: implement share retrieval endpoint

### Step 9: Build the create-share frontend flow

Do:

- add create page
- let user choose:
- text or file
- expiration
- burn-after-read
- password or generated key
- wire submit flow to backend
- show returned share link

Commit:

- feat: add create share UI flow

### Step 10: Build the open-share frontend flow

Do:

- add share view page
- fetch share by ID
- prompt for password or key
- decrypt in browser
- show text or file download

Commit:

- feat: add share retrieval UI flow

### Step 11: Add browser-side encryption and decryption

Do:

- implement client-side encryption helpers
- implement client-side decryption helpers
- support text first
- then support file payloads
- make sure backend never receives plaintext

Commit:

- feat: add client-side encryption and decryption

### Step 12: Finish burn-after-read and expiration behavior

Do:

- enforce expired state in backend
- enforce one-time access correctly
- make retrieval behavior atomic enough to avoid double-read bugs
- show clean frontend error states

Commit:

- feat: enforce expiration and burn-after-read rules

### Step 13: Add file-sharing support fully

Do:

- finalize encrypted file upload flow
- decide dev storage:
- DB blob if small and simple, or
- local encrypted file storage
- preserve metadata for download
- handle file size limits

Commit:

- feat: add encrypted file sharing

### Step 14: Add validation and abuse controls

Do:

- add backend request validation
- add upload size limits
- add MIME/file restrictions
- add basic CORS config
- add basic rate limiting if exposed publicly

Commit:

- feat: add validation and basic security controls

### Step 15: Add tests

Do:

- backend tests for:
- create share
- retrieve share
- expired share
- burn-after-read
- frontend tests for:
- create flow
- open flow
- invalid password/key
- test text first, then file flow

Commit:

- test: add share flow coverage

### Step 16: Prepare deployment

Do:

- add production env examples
- decide object storage for production files
- document frontend and backend deploy separately
- document DB migration during deploy
- update README with local run instructions

Commit:

- docs: add deployment and local setup instructions

## Recommended Build Order

Do this in this exact order:

1. repo
2. frontend scaffold
3. backend scaffold
4. postgres
5. migrations
6. share model
7. create API
8. retrieve API
9. create UI
10. open UI
11. encryption/decryption
12. expiration + burn-after-read
13. file sharing
14. validation/security
15. tests
16. deploy docs

## Important Scope Rule

For the first working version, I’d strongly narrow MVP to:

- text sharing only
- password or generated key
- expiration
- burn-after-read

