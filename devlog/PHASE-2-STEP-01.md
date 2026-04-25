# PHASE-2-STEP-01

## Goal

Create the Phase 2 planning foundation without changing any Phase 1 documents.

This step should leave you with:

- a dedicated Phase 2 PRD at `devlog/PHASE-2-PRD.md`
- a dedicated Phase 2 plan at `devlog/PHASE-2-PLAN.md`
- an explicit naming convention for future Phase 2 step docs
- carried-over Phase 1 notes recorded in the new Phase 2 planning docs

This step does **not** include:

- backend auth implementation
- frontend auth implementation
- new database models
- deployment changes
- new runtime configuration

---

## Starting Point

Expected starting state:

- Phase 1 implementation and docs are already complete through Step 16
- the repo already contains `devlog/PRD.md`, `devlog/PLAN.md`, and `devlog/STEP-01.md` through `devlog/STEP-16.md`
- the working tree is clean
- there are no `PHASE-2-*` planning files yet

Check:

```bash
git status --short
find devlog -maxdepth 1 -type f | sort
sed -n '1,80p' devlog/PRD.md
sed -n '1,80p' devlog/PLAN.md
```

You should see:

- a clean working tree
- the existing Phase 1 planning files
- no `devlog/PHASE-2-PRD.md`
- no `devlog/PHASE-2-PLAN.md`

Why this matters:

Phase 2 should start from the real end state of Phase 1, not from memory. That means the first Phase 2 step is documentation and scope control, not implementation code.

---

## Do This

### 1. Create the new Phase 2 planning files

Do not overwrite `devlog/PRD.md` or `devlog/PLAN.md`.

Those files are now the Phase 1 record. Phase 2 should sit beside them as a separate planning track.

From the repo root:

```bash
touch devlog/PHASE-2-PRD.md
touch devlog/PHASE-2-PLAN.md
```

Expected result:

- the old Phase 1 docs remain untouched
- the new Phase 2 docs exist as separate files

### 2. Establish the Phase 2 file naming convention

Phase 1 already owns the simple names:

- `PRD.md`
- `PLAN.md`
- `STEP-01.md` through `STEP-16.md`

Do not rename them now. That would create churn without improving the product.

Instead, make Phase 2 explicit from the start.

Use this naming rule:

- `devlog/PHASE-2-PRD.md`
- `devlog/PHASE-2-PLAN.md`
- `devlog/PHASE-2-STEP-01.md`
- `devlog/PHASE-2-STEP-02.md`
- and so on

This keeps Phase 1 stable while making later phases unambiguous.

There is no command for this substep beyond creating the files. The important part is documenting the convention inside the new Phase 2 docs.

### 3. Write the Phase 2 PRD from the current repo baseline

The Phase 2 PRD should not pretend the app is empty.

It should start from what already exists:

- anonymous text sharing
- anonymous file sharing
- expiration
- burn-after-read
- existing tests
- existing setup docs

Then it should define the new Phase 2 goals such as:

- optional Google login
- usernames
- groups
- invites
- group-restricted access
- cloud deployment

It should also carry forward any important unfinished notes from Phase 1 so they are visible instead of silently lost.

Write the PRD into:

- `devlog/PHASE-2-PRD.md`

The document should include at least:

- overview
- product goals
- current baseline
- Phase 2 scope
- data model direction
- auth and deployment choices
- alternatives with pros and cons
- success metrics

### 4. Write the Phase 2 plan from the approved PRD

The Phase 2 plan should translate the PRD into implementation order.

Do not start with UI polish or deployment first.

A good Phase 2 order is:

1. auth foundation
2. username foundation
3. group and membership model
4. invite system
5. restricted secret access
6. tests
7. deployment

Write the plan into:

- `devlog/PHASE-2-PLAN.md`

The document should:

- assume the current Phase 1 repo already exists
- keep anonymous sharing intact
- break Phase 2 into many smaller steps
- name future step docs as `PHASE-2-STEP-xx.md`

### 5. Record carried-over Phase 1 notes explicitly

This is important because once Phase 2 starts, people tend to mentally replace the old plan with the new one.

Do not lose known Phase 1 notes such as:

- the original password-based flow was planned but not implemented
- burn-after-read behavior should be reviewed again
- deployment docs exist, but a real live multi-user deployment is still ahead

These notes do not have to become the first Phase 2 implementation step, but they should appear in the new Phase 2 planning documents.

---

## Expected Result

After this step:

- `devlog/PHASE-2-PRD.md` exists
- `devlog/PHASE-2-PLAN.md` exists
- Phase 1 planning files are unchanged
- Phase 2 has an explicit naming convention for future step docs
- the next implementation step can start from a clear Phase 2 scope instead of ad hoc feature requests

---

## What Not To Do Yet

Do not:

- add Clerk dependencies yet
- add username fields to the database yet
- create group tables yet
- deploy anything yet
- write Phase 2 step docs beyond what is justified by the approved plan

This step is about planning discipline first.

---

## Verification

Run:

```bash
git status --short
find devlog -maxdepth 1 -type f | sort
sed -n '1,120p' devlog/PHASE-2-PRD.md
sed -n '1,120p' devlog/PHASE-2-PLAN.md
```

Expected file list shape:

```text
devlog/PHASE-2-PLAN.md
devlog/PHASE-2-PRD.md
devlog/PLAN.md
devlog/PRD.md
devlog/STEP-01.md
...
devlog/STEP-16.md
```

Success looks like:

- the new Phase 2 docs exist
- the Phase 1 docs still exist under their original names
- the Phase 2 PRD describes the new scope from the real current baseline
- the Phase 2 plan breaks the work into implementation order rather than vague themes

---

## Finish This Step

Stage the new Phase 2 planning files:

```bash
git add devlog/PHASE-2-PRD.md devlog/PHASE-2-PLAN.md devlog/PHASE-2-STEP-01.md
```

Then commit:

```bash
git commit -m "docs: add phase 2 planning docs"
```
