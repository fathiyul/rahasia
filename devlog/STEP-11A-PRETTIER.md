# STEP 11A: Add Prettier for Frontend Formatting

This is a Step 11 follow-up, not a product feature step.

We reached this during Step 11 because the frontend code was already working, but some files had inconsistent manual formatting from copying code out of terminal output. ESLint was passing, but it was not responsible for formatting, so whitespace and layout issues were not being normalized automatically.

The purpose of this step is to add a dedicated formatter so the frontend codebase has:

- consistent formatting
- optional format-on-save support in the editor
- a simple command to clean up formatting without changing program behavior

This step is about developer workflow and code quality, not app functionality.

## Why Prettier Here

We considered:

- **Prettier**
- **Biome**

We chose **Prettier** for now because:

- the repo already has ESLint working
- the immediate problem is formatting, not lint migration
- Prettier is the lower-risk, lower-churn addition
- Biome would be a bigger tooling decision because it overlaps with ESLint

So the decision for now is:

- **Prettier handles formatting**
- **ESLint continues handling lint rules**

If later we want one consolidated frontend toolchain, we can revisit Biome in a separate step.

## What This Step Should Achieve

After this step:

- `npm run lint` still checks code-quality rules
- a new formatting command can rewrite frontend files into a consistent style
- editor integration becomes straightforward
- future Step 11+ frontend edits become easier to maintain

## 11A.1 Install Prettier

We need Prettier as a frontend development dependency because this formatting concern belongs to the frontend toolchain.

From the repo root:

```bash
cd frontend
npm install -D prettier
```

Verify:

```bash
cat package.json
```

Expected change:

- `prettier` appears under `devDependencies`

## 11A.2 Add a Prettier config file

Prettier works with sensible defaults, but we should still make the choice explicit in the repo so formatting is predictable and documented.

Create `frontend/.prettierrc` with:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
```

Why these settings:

- `semi: false` matches the code style already present in this frontend
- `singleQuote: true` matches the current TypeScript files
- `trailingComma: "all"` gives cleaner diffs when objects or params grow later

## 11A.3 Add a Prettier ignore file

We do not want Prettier wasting time on generated output or dependencies.

Create `frontend/.prettierignore` with:

```text
node_modules
dist
```

## 11A.4 Add formatting scripts to package.json

We want formatting to be runnable the same way as lint and build: through npm scripts, not by remembering long commands.

In `frontend/package.json`, add these scripts:

```json
"format": "prettier . --write",
"format:check": "prettier . --check"
```

Place them alongside the existing scripts.

The idea:

- `format` rewrites files
- `format:check` reports formatting drift without modifying files

Verify:

```bash
cat package.json
```

Expected result:

- `scripts` now include `format` and `format:check`

## 11A.5 Run Prettier once across the frontend

This is the cleanup pass that normalizes the Step 11 formatting drift.

From `frontend/`:

```bash
npm run format
```

What should happen:

- Prettier rewrites files in place
- indentation becomes consistent
- trailing whitespace disappears
- line wrapping becomes standardized

This step may touch many files, but the changes should be formatting-only.

## 11A.6 Verify formatting and existing checks

After formatting, confirm that:

- formatting is now clean
- lint still passes
- build still passes

Run:

```bash
npm run format:check
npm run lint
npm run build
```

Expected outcome:

- `format:check` reports everything is formatted
- `lint` passes
- `build` passes

## 11A.7 Optional editor setup

This is optional, but recommended.

If your editor supports Prettier, set it as the formatter for frontend files and enable format on save. That gives you the behavior you expected earlier when saving files.

This step is editor-specific, so it does not need to be committed unless you later want to add shared workspace settings for the repo.

### VS Code

If you use VS Code:

1. Install the **Prettier - Code formatter** extension by **Prettier**.
2. Open VS Code Settings.
3. Search for `format on save` and enable it.
4. Search for `default formatter`.
5. Set the default formatter for the frontend project or relevant file types to:

```text
esbenp.prettier-vscode
```

If you want to make that explicit in workspace settings later, you can add a repo file like `.vscode/settings.json`, but only do that if you want editor behavior shared in the repo. For now, personal editor settings are enough.

What you should see afterward:

- saving a `.ts`, `.tsx`, `.js`, or `.css` file in `frontend/` reformats the file automatically
- manual formatting can still be run with `npm run format`

## 11A.8 Review the diff carefully

Before committing, make sure the diff is mostly formatting-only.

Run:

```bash
git status
git diff -- frontend
```

What to check:

- no logic changed accidentally
- no generated files were added
- the diff is mostly whitespace, indentation, wrapping, and quote consistency

## Commit

If everything looks correct:

```bash
git add frontend
git commit -m "chore: add frontend prettier formatting"
```

## Notes

- This step is intentionally frontend-only.
- This does not replace ESLint.
- This does not affect backend Python formatting.
- If we later adopt Biome, that should be a separate explicit tooling decision and migration step.
