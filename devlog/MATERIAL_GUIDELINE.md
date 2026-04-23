# MATERIAL Guideline

## Purpose

This document defines what a `MATERIAL_*.md` file is for in this project.

`MATERIAL_*.md` files are not step checklists.

They are private reference documents for:

- first-principles explanations
- mental models
- architecture explanations
- distilled stack knowledge
- tradeoffs and alternatives

They should read more like internal learning/reference notes than task instructions.

---

## What A MATERIAL Doc Is

A `MATERIAL_*.md` file should explain a concept deeply enough that someone can understand:

- what this tool/layer/pattern is
- why it exists
- how it fits into this project
- what problems it solves
- what alternatives exist
- what can go wrong

Examples:

- `MATERIAL_ALEMBIC.md`
- `MATERIAL_SQLALCHEMY_MODEL.md`
- later: `MATERIAL_WEB_CRYPTO.md`
- later: `MATERIAL_FASTAPI_ROUTING.md`
- later: `MATERIAL_REACT_ROUTING.md`

---

## What A MATERIAL Doc Is Not

A `MATERIAL_*.md` file is not:

- a step-by-step implementation checklist
- a commit-oriented workflow doc
- a “run these 5 commands” guide
- a copy of the official docs

It can include examples and commands, but the primary goal is understanding, not execution.

---

## Difference Between STEP And MATERIAL Docs

### STEP docs

Purpose:

- guide implementation
- tell what to do next
- end with one commit

Focus:

- sequence
- scope control
- commands
- code
- verification

Example:

- `STEP-06.md` tells you how to add the `Share` model and migration

### MATERIAL docs

Purpose:

- explain concepts
- build understanding
- answer “why are we doing this?”

Focus:

- first principles
- mental models
- architecture
- tradeoffs
- alternatives
- failure cases

Example:

- `MATERIAL_ALEMBIC.md` explains what migrations are and why Alembic exists

Short rule:

- STEP = what to do
- MATERIAL = why it works and why it exists

---

## When To Create A MATERIAL Doc

Create a material doc when:

- the concept is new or non-obvious
- the stack/tool is important enough to deserve first-principles understanding
- the step docs would become too cluttered if all explanation stayed there
- you want a reusable reference that future steps can assume

Good candidates:

- migrations / Alembic
- SQLAlchemy models
- Web Crypto
- end-to-end encryption model
- FastAPI dependency injection
- React routing
- object storage and file handling

---

## Preferred Structure

Not every material doc needs the exact same shape, but a good default structure is:

### 1. Purpose

- what this doc explains

### 2. The Core Problem

- what underlying problem this tool/pattern solves

### 3. Key Concepts

- main vocabulary and mental model

### 4. How It Fits In This Project

- why this project is using it

### 5. Alternatives

- what else could have been used instead

### 6. What Can Go Wrong

- common mistakes or failure modes

### 7. Practical Rule

- what workflow or habit should be followed in this repo

---

## Writing Rules

### Start From First Principles

Assume the reader may have never used the tool before.

Do not begin from jargon without explanation.

Bad:

- “Alembic autogenerate diffs metadata against the current schema”

Better:

- explain what schema drift is first
- then explain why migrations exist
- then explain autogenerate

### Explain Why, Not Just How

A material doc should answer questions like:

- why do we need this?
- what breaks without it?
- why this tool instead of another?
- what does this file actually do?

### Use This Project As The Anchor

The material doc should stay grounded in this project.

Do not drift into generic theory with no connection back to Rahasia.

Good:

- explain the concept generally
- then tie it back to how Rahasia uses it

### Be Distilled, Not Exhaustive

Think of material docs as distilled internal docs:

- clearer than official docs
- narrower than official docs
- focused on what matters for this project

They are not meant to reproduce full upstream documentation.

### Include Examples When They Clarify

Examples are good when they make the concept concrete:

- a sample migration function
- a sample model field
- a sample request/response

But examples should support explanation, not replace it.

---

## Tone

Write like:

- a pragmatic technical mentor
- concise but explanatory
- focused on helping someone build durable understanding

Do not write like:

- vague tutorial filler
- marketing copy
- blindly copied official docs

---

## File Naming

Use names like:

- `MATERIAL_ALEMBIC.md`
- `MATERIAL_SQLALCHEMY_MODEL.md`
- `MATERIAL_WEB_CRYPTO.md`

The name should identify the concept, not the task.

Task sequencing belongs in `STEP-xx.md`, not `MATERIAL_*.md`.

---

## Practical Rule For This Repo

Use both document types:

- `STEP-xx.md` for guided execution
- `MATERIAL_*.md` for deeper conceptual understanding

They complement each other.

Do not replace one with the other.
