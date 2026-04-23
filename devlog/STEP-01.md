# STEP-01

## Goal

Initialize the monorepo structure for the Rahasia project without adding application code yet.

This step sets up:

- Git repository
- top-level project folders
- private local planning docs
- a public-safe `README.md`
- a root `.gitignore`

This step does **not** include frontend scaffolding, backend scaffolding, database setup, or any implementation code.

---

## Step Outcome

After this step, the repository should have:

- a Git repo initialized on the `main` branch
- empty placeholder folders for `frontend`, `backend`, `infra`, and `docs`
- a private local `docs-dev/` folder for planning files
- a root `.gitignore` that prevents `docs-dev/` and local environment files from being committed
- a minimal public `README.md`

---

## Current Structure

Current repo structure after setup:

```text
rahasia/
  .git/
  .gitignore
  README.md
  frontend/
    .gitkeep
  backend/
    .gitkeep
  infra/
    .gitkeep
  docs/
    .gitkeep
    public/
  docs-dev/
    PRD.md
    PLAN.md
```

Notes:

- `docs-dev/` is private local documentation and is intentionally ignored by Git
- `docs/public/` exists for any documentation that is safe to publish later
- `.gitkeep` files are present so Git can track the empty folders

---

## What Was Done

### 1. Initialized Git

The repo was initialized and switched to the `main` branch.

Expected commands:

```bash
git init
git checkout -b main
```

Confirmed state:

- current branch is `main`
- there are no commits yet

### 2. Created Base Folders

Created these project directories:

- `frontend/`
- `backend/`
- `infra/`
- `docs/`
- `docs/public/`
- `docs-dev/`

Placeholder `.gitkeep` files were added to:

- `frontend/`
- `backend/`
- `infra/`
- `docs/`

### 3. Moved Private Planning Files

Private project planning files were moved into:

- `docs-dev/PRD.md`
- `docs-dev/PLAN.md`

These are intentionally kept outside the public Git history.

### 4. Added Root `.gitignore`

The current `.gitignore` includes:

```gitignore
.codex
docs-dev/
.env
.env.*
!.env.example
node_modules/
dist/
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
.DS_Store
```

This keeps the private planning folder and common local/runtime files out of Git.

### 5. Added Public-Safe `README.md`

The root `README.md` was created with:

- project name
- short project description
- current status
- planned stack
- repository structure
- high-level product goal

This is appropriate for a public repository because it describes the project without exposing internal planning docs.

---

## Verification

Things confirmed from the current repo state:

- Git repo exists
- branch is `main`
- no commits exist yet
- `docs-dev/` contains `PRD.md` and `PLAN.md`
- `docs-dev/` is ignored by Git
- `README.md` exists
- `.gitignore` exists
- empty tracked folders use `.gitkeep`

Useful verification commands:

```bash
git status --short
git branch --show-current
find . -maxdepth 2 -type f | sort
```

Expected `git status --short` at this stage should show tracked candidates such as:

- `.gitignore`
- `README.md`
- `frontend/.gitkeep`
- `backend/.gitkeep`
- `infra/.gitkeep`
- `docs/.gitkeep`

It should **not** show files inside `docs-dev/`.

---

## Notes And Adjustments

- The repo uses `docs-dev/` instead of `docs/dev/` because private planning files should not be pushed to a public GitHub repository
- `docs/public/` is reserved for public-facing documentation later
- `docs/.gitkeep` is currently present; that is acceptable for now even though `docs/public/` already exists

---

## Finish This Step

Before committing, verify the ignored/private files are not being staged:

```bash
git status
```

Then commit the repo scaffold:

```bash
git add .
git commit -m "chore: initialize monorepo structure"
```

---

## Commit Message

```text
chore: initialize monorepo structure
```
