# MATERIAL_SESSION_AND_YIELD

## Purpose

This document explains:

- what “session” means in general
- what a database session means
- what a SQLAlchemy session is doing
- why FastAPI dependency functions sometimes use `yield` instead of `return`
- common related questions and confusions

This is a concept/reference document, not a build checklist.

---

## 1. What “Session” Means In General

At a broad level, a **session** means:

- a bounded context of interaction over some period of time

That is the general idea.

A session usually implies:

- something starts
- some work or interaction happens
- some state is kept during that period
- then it ends and gets cleaned up or discarded

So “session” does not only belong to databases.

It is a more general software idea.

---

## 2. General Examples Of Sessions

### 2.1 Login Session

When you log into a website:

- the server remembers who you are for a while
- requests during that period belong to the same login/auth session

Typical state:

- user identity
- expiration time
- auth token or session ID

### 2.2 Chat Session

In a chat app or AI app:

- a session may mean one ongoing conversation context
- messages within that period are grouped together

Typical state:

- message history
- conversation ID
- active participants

### 2.3 Editing Session

In a document editor:

- one period of editing can be treated as a session
- changes are accumulated during that editing window

Typical state:

- current document content
- unsaved changes
- cursor/selection state

### 2.4 Network/Connection Session

Some systems use “session” to describe an active connection or negotiated interaction between two systems.

Typical state:

- connection details
- protocol state
- timing and lifecycle info

---

## 3. The General Pattern Behind A Session

Across all these examples, the pattern is:

1. create/open some context
2. do work inside that context
3. keep some temporary state during the work
4. close/finish/expire the context

That is the general idea of a session.

So when someone says “session,” the right question is:

- session of what?

Examples:

- auth session
- browser session
- DB session
- chat session

---

## 4. What A Database Session Means

A **database session** is a session specifically for interacting with the database.

It is the bounded context in which you:

- query data
- create/update/delete rows
- track changes
- commit or roll back work

So:

- general meaning: bounded interaction context
- database meaning: bounded data-access/work context

That is why “a unit of work around data access” is a good definition of a **database session**, not the most general definition of “session” overall.

---

## 5. What A SQLAlchemy Session Is

In SQLAlchemy, a session is the main object that manages ORM interaction with the database.

A SQLAlchemy session helps with:

- holding ORM objects
- tracking changes to those objects
- sending SQL to the database
- grouping work into a transaction
- committing or rolling back

Example:

```python
share = Share(
    id="abc",
    type="text",
    encrypted_payload="ciphertext",
    expires_at=expires_at,
    burn_after_read=False,
)

db.add(share)
db.commit()
db.refresh(share)
```

What is happening:

- `db.add(share)`: tell SQLAlchemy this object should be inserted
- `db.commit()`: make the transaction permanent in the DB
- `db.refresh(share)`: reload current DB state into the Python object

So the SQLAlchemy session is the object coordinating that database work.

---

## 6. Why Not Just Talk Directly To The Database Every Time?

Because a session gives you a managed workspace for related DB operations.

Benefits:

- tracks objects and changes
- groups operations into one transaction
- makes commit/rollback possible
- avoids scattering raw connection logic everywhere

Without a session, your code would often become:

- more repetitive
- more error-prone
- harder to manage consistently

---

## 7. What A Transaction Has To Do With A Session

A **transaction** is the all-or-nothing boundary for DB changes.

The session often manages work that happens inside a transaction.

Example idea:

- create a share
- write an audit record
- maybe update another row

You usually want either:

- all of that to succeed

or:

- none of it to be permanently applied

That is what transaction control is for.

So a session is not exactly the same thing as a transaction, but they are closely related.

Simple mental model:

- session = managed DB work context
- transaction = atomic success/failure boundary inside that context

---

## 8. Is A Session The Same As A Database Connection?

Not exactly.

People often confuse these.

A connection is:

- the lower-level link to the database

A session is:

- a higher-level ORM/work abstraction built on top of database connectivity

So:

- connection is lower level
- session is higher level

In practice, a session may acquire and use connections behind the scenes.

You usually work with the session in ORM code, not raw connections directly.

---

## 9. What `yield` Means In General

`yield` is a Python keyword that turns a function into a generator.

Unlike `return`, which ends the function immediately, `yield`:

- produces a value
- pauses the function
- allows it to continue later

Example:

```python
def numbers():
    yield 1
    yield 2
    yield 3
```

This does not return all values at once.

It produces them one at a time.

---

## 10. `return` vs `yield`

### `return`

```python
def get_name():
    return "fathiyul"
```

Meaning:

- give back a value
- function is done

### `yield`

```python
def get_values():
    yield 1
    yield 2
```

Meaning:

- provide a value for now
- pause
- resume later if asked

That is the general distinction.

---

## 11. Why FastAPI Uses `yield` In Dependencies

FastAPI supports dependencies that need:

- setup before the route runs
- cleanup after the route finishes

That is exactly why `yield` is useful.

Example:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

What happens:

1. create the DB session
2. `yield db` gives it to the route handler
3. the route handler uses it
4. after the request finishes, execution resumes
5. `finally` runs and closes the session

So this is not “yield because we want multiple values.”

It is:

- yield the dependency for temporary use
- then resume the function for cleanup

That is the important idea.

---

## 12. Why `return` Is Not Enough Here

If you wrote:

```python
def get_db():
    db = SessionLocal()
    return db
```

then:

- the route would receive the session
- but the function would be finished immediately
- there would be no built-in cleanup point in that function

So `yield` is used because FastAPI can treat it like:

- setup
- hand over resource
- cleanup afterward

That makes it ideal for resources like:

- DB sessions
- temporary files
- network clients
- transactions

---

## 13. Common Related Questions

### 13.1 Is one session created for the whole app?

Usually no.

In web apps, the common pattern is:

- one session per request

That keeps DB work isolated between requests.

### 13.2 Why close the session?

Because resources should not stay open forever.

Closing the session helps avoid:

- leaked resources
- stale state
- connection management problems

### 13.3 Why not make one global session?

Because that usually causes shared-state problems and bad request isolation.

Per-request sessions are safer and more standard.

### 13.4 Is session data automatically saved?

Not permanently.

You usually need `commit()` for changes to become durable.

Without commit, changes may not be persisted.

### 13.5 What is `refresh()` for?

It reloads the object from the DB.

Useful when:

- defaults were set by the DB
- timestamps were generated by the DB
- you want the newest stored state back in Python

### 13.6 What if an error happens before commit?

Typically the transaction is not successfully committed, so changes should not become permanent.

This is one reason sessions/transactions are useful.

### 13.7 Is `yield` only for FastAPI?

No.

`yield` is a general Python feature.

FastAPI just uses it in a useful way for dependency lifecycle management.

### 13.8 Is a session the same as login session/cookie session?

No.

Those are different uses of the same general word.

You always need to ask:

- session of what?

---

## 14. Mental Model To Keep

Use this:

- general “session” = bounded context of interaction over time
- DB session = bounded context for database work
- SQLAlchemy session = ORM object managing DB work and persistence
- `yield` in FastAPI dependency = hand a resource over temporarily, then clean it up afterward

That mental model is enough for most everyday backend work.

---

## 15. Practical Rule For This Repo

For Rahasia:

- use one SQLAlchemy session per request
- provide it through `get_db()`
- use `yield` so FastAPI can clean it up automatically
- keep route handlers small and let services use the session

That is the intended pattern.
