# STEP-02

## Goal

Scaffold the frontend application inside `frontend/` using React, Vite, and TypeScript.

This step should leave you with:

- a working frontend app
- a basic source folder structure
- routing dependency installed
- the app runnable locally

This step does **not** include:

- backend integration
- encryption/decryption implementation
- create/open share UI
- styling polish

---

## Starting Point

Expected starting state:

- Step 1 is already committed
- `frontend/` currently only contains `.gitkeep`
- repo is clean before starting

Check:

```bash
git status --short
git log --oneline --decorate -n 1
```

You should see:

- clean working tree
- latest commit: `chore: initialize monorepo structure`

---

## Do This

### 1. Remove the placeholder file

The `frontend/` folder is no longer empty, so remove `.gitkeep`.

```bash
rm frontend/.gitkeep
```

### 2. Scaffold the app with Vite

From the repo root:

```bash
npm create vite@latest frontend -- --template react-ts
```

If Vite warns that the target directory is not empty, that is because `frontend/` already existed. Since you removed `.gitkeep`, it should be safe to continue.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
npm install react-router-dom
```

Do not add extra UI libraries yet.

Keep this step minimal.

### 4. Create the initial frontend source structure

Inside `frontend/src/`, create:

```text
src/
  pages/
  components/
  lib/
  types/
```

You do not need to fully populate them yet. Empty placeholder files are fine if needed.

Recommended first placeholders:

- `src/pages/.gitkeep`
- `src/components/.gitkeep`
- `src/lib/.gitkeep`
- `src/types/.gitkeep`

### 5. Keep the default app simple for now

At this step, your goal is only:

- React app boots
- TypeScript works
- routing dependency is installed

You can keep the default Vite UI temporarily or replace it with a minimal placeholder page.

Do **not** build the actual product UI yet.

### 6. Verify the frontend runs

From `frontend/`:

```bash
npm run dev
```

Verify:

- dev server starts successfully
- the app loads in the browser
- there are no immediate TypeScript/build errors

Then stop the dev server.

---

## Expected Result

After this step, `frontend/` should contain at least:

```text
frontend/
  package.json
  package-lock.json
  index.html
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    pages/
    components/
    lib/
    types/
```

There may also be standard Vite files such as:

- `eslint.config.js`
- `public/`
- additional TypeScript config files

That is fine.

---

## What Not To Do Yet

- Do not add Tailwind yet unless you intentionally want it
- Do not add component libraries yet
- Do not build the share flow yet
- Do not wire frontend to backend yet
- Do not implement crypto helpers yet

This step is only the frontend scaffold.

---

## Verification

Before committing:

```bash
git status --short
```

Check that the frontend scaffold files are tracked and that `docs-dev/` remains untracked/ignored.

Useful checks:

```bash
find frontend -maxdepth 3 -type f | sort
cat frontend/package.json
```

---

## Finish This Step

From the repo root:

```bash
git add frontend .gitignore README.md
git commit -m "chore: scaffold frontend app"
```

If `README.md` or `.gitignore` did not change during this step, you can omit them:

```bash
git add frontend
git commit -m "chore: scaffold frontend app"
```

---

## Commit Message

```text
chore: scaffold frontend app
```
