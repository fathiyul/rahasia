# STEP Guideline

## Purpose

This file defines how `STEP-xx.md` documents should be written for this project.

The goal is not only to tell someone what to type, but also to teach why each step exists and how it fits into the software.

These step docs should feel like a mentor guiding implementation.

---

## Core Rule

Each step should keep its normal implementation flow and substeps.

Do not split the document into one giant “idea section” and one giant “implementation section” unless there is a strong reason.

Instead, for each important substep:

1. state the substep
2. explain the idea and purpose of that substep
3. then give the commands/code for that same substep

The explanation should be inserted inside the substep, between the substep heading and the code/commands.

---

## Required Structure

Each `STEP-xx.md` should usually contain these sections:

### 1. Goal

Explain what this step accomplishes.

State:

- what will exist after the step
- what is intentionally out of scope for the step

### 2. Starting Point

Explain the expected repo/project state before starting.

Include:

- expected previous step commit
- clean working tree check
- basic verification commands

### 3. Do This

The step should then proceed through numbered substeps.

For each important substep, use this internal pattern:

1. substep heading
2. short idea-level explanation
3. exact commands or code
4. expected result when useful

Example shape:

```md
### 2. Create the `Share` model

Explain what `Share` is, why it exists, what it depends on, and what fields it should have.

Write this code in `backend/app/models/share.py`:
```

This is the preferred format.

### 4. Expected Result

Explain what should exist after the whole step is complete.

### 5. What Not To Do Yet

Explicitly state what remains out of scope so the step stays focused.

### 6. Verification

Always include:

- commands to verify the step
- example output or output shape
- what success looks like

Do not just say “run it.” Say what the user should expect to see.

### 7. Finish This Step

Always end with:

- what to stage
- the commit command
- the exact commit message

---

## Writing Rules

### Teach Inside The Substep

The idea-level explanation should live inside the substep that needs it.

Do this:

- heading
- explain what this substep is trying to achieve
- explain why this piece exists
- explain what it depends on or should contain
- then show the code/commands

Do not do this:

- one large theory section at the top
- then a separate large implementation section later

### Teach First, Then Unblock

The step should teach enough that the reader could attempt the implementation themselves.

But it should also include the actual code so the reader does not get blocked if they do not know how to implement it.

The balance is:

- explain the intention first
- provide the final code second

### Be Concrete

Avoid vague instructions like:

- “set up the model”
- “add an endpoint”
- “configure Alembic”

Instead say exactly:

- which file
- what object/function/class to create
- what it depends on
- what behavior it should have
- what output to expect

### Prefer Exact Terminal Commands

For file/folder creation, use exact shell commands whenever reasonable.

Good:

```bash
mkdir -p app/{api,core,db,models,schemas,services} tests
touch app/{api,core,db,models,schemas,services}/.gitkeep tests/.gitkeep
```

Also acceptable when readability is better:

```bash
mkdir app tests
cd app
mkdir api core db models schemas services
touch {api,core,db,models,schemas,services}/.gitkeep
cd ..
touch tests/.gitkeep
```

### Include Actual Code When Needed

If a substep requires code, include:

- the file path
- the full code snippet to write
- what that code is supposed to do

Do not assume the reader can infer the code from a one-line description.

### Include Example Outputs

If a command should return something meaningful, show an example.

Examples:

- endpoint response JSON
- Alembic output shape
- `docker compose ps` output shape
- expected table list from SQLAlchemy inspection

### Keep Step Boundaries Clean

Each step should do one logical chunk of work.

Do not mix too much into one step.

Example:

- one step for DB setup
- one step for migration infrastructure
- one step for first data model
- one step for create API
- one step for retrieve API

### Say What Not To Do Yet

Each step should explicitly state what is out of scope.

This prevents accidental overbuilding and keeps the implementation sequence disciplined.

---

## Preferred Tone

Write like a pragmatic mentor:

- clear
- direct
- instructional
- concrete

Do not write like:

- marketing copy
- vague tutorial filler
- unexplained code dump

The reader should feel guided, not flooded.

---

## Verification Rule

Every meaningful step should answer:

- what command do I run?
- what output should I expect?
- how do I know I did it correctly?

If those are missing, the step is incomplete.

---

## Commit Rule

Every step should end with one commit message only.

The step is not finished until it can close with a single clean commit.

---

## Private Docs Note

These `STEP-xx.md` files live in `docs-dev/` and are intentionally private/local for this project.

They are meant for guided development workflow, not public repository documentation.
