# Product Requirements Document (PRD)

## Project: Rahasia Phase 2

---

## 1. Overview

Phase 2 extends Rahasia from an anonymous encrypted sharing tool into a lightweight multi-user product.

The app should still support the current visitor flow:

- create and open anonymous shares without logging in

It should also add optional authenticated features:

- sign in with Google
- create groups
- invite people into groups
- create secrets that are only accessible by members of a group

This phase is not about building a social product. It is about introducing identity, ownership, and controlled sharing while keeping the app simple.

---

## 2. Product Goal

Build a Phase 2 version where:

- visitors can continue using anonymous share links
- users can optionally sign in with Google
- signed-in users can create and manage groups
- group membership controls access to some secrets
- the app is deployed on cloud infrastructure

The main product theme of Phase 2 is:

**optional identity plus group-based access control**

---

## 3. Current Baseline

Phase 1 already provides:

- encrypted text sharing
- encrypted file sharing for small files
- expiration handling
- burn-after-read handling
- backend and frontend tests
- local development setup and public deployment notes

Phase 2 should build on that existing codebase instead of redefining the product from scratch.

Known notes carried forward from Phase 1:

- the original password-based flow was planned but not implemented
- burn-after-read behavior should be revisited so a failed decrypt does not consume the share
- current deployment docs are informative, but the app is not yet deployed as a real multi-user cloud app

These notes should be treated as explicit carry-over items, not hidden assumptions.

---

## 4. Goals

### Primary Goals

- Add optional Google login
- Preserve anonymous sharing for visitors
- Add groups as the first authenticated product surface
- Allow secrets to be restricted to group members
- Deploy the app to a real cloud environment

### Secondary Goals

- Learn cloud deployment across frontend, backend, and database
- Learn how to model ownership and membership in a real app
- Create a stronger portfolio project with auth and authorization

---

## 5. Non-Goals

Phase 2 should not include:

- chat
- follows, likes, feeds, or profile social features
- direct messages
- enterprise SAML / SCIM identity integration
- complicated role hierarchies beyond what is needed for group ownership and membership
- a fully built billing or subscription system

---

## 6. Target Users

- visitors who want quick encrypted sharing without creating an account
- signed-in users who want to organize secrets by group
- small private teams sharing secrets within a controlled member list
- you, as a learning and portfolio use case

---

## 7. Core Product Rules

- Anonymous users must still be able to use the app
- Logged-in users get extra features, not a separate app
- Group-restricted secrets must only be available to group members
- The backend must still never store readable plaintext secret content
- The app should stay narrow and not drift into a social platform

---

## 8. Phase 2 Scope

### 8.1 Authentication

The app should support:

- optional sign-in with Google
- signed-out visitor usage
- signed-in session awareness in frontend and backend

The first auth experience should be simple:

- sign in
- sign out
- detect current user

Phase 2 should introduce a unique in-app username.

Username rules:

- unique across the app
- normalized lowercase
- allows letters, numbers, `_`, and `.`
- length should be limited to a practical range such as 3 to 30 characters

The username exists to make user references and group invites easier.

Google identity remains the authentication method, while the username becomes an application-level identifier.

### 8.2 Users

The app should create an internal application user record for authenticated users.

The internal user model should support:

- auth provider user ID
- email
- username
- display name
- avatar URL if available
- created_at
- last_login_at

### 8.3 Groups

Signed-in users should be able to:

- create a group
- view groups they belong to
- invite another user to a group
- remove members if they have enough permission
- rename a group if they have enough permission

Initial permission model should stay simple:

- group owner
- group member

Ownership must be membership-based, not tied to only one fixed owner on the group row.

Rules:

- a group can have one or more owners
- a group must always have at least one owner
- any owner can invite members
- any owner can promote a member to owner
- any owner can remove a member
- any owner can remove another owner only if at least one owner will still remain
- a member can leave the group at any time
- an owner can leave only if another owner will still remain
- if the group has exactly one member and that member is an owner, leaving should be treated as deleting the group
- if the group has one owner and other members, that owner must promote another owner before leaving

Avoid adding admin, moderator, editor, viewer, and custom roles in the first Phase 2 release unless a real need appears.

Group design notes:

- groups exist to limit access to secrets
- groups are not meant to become shared vaults, chats, or collaboration spaces in this phase
- group names do not need to be unique
- group IDs must be unique
- a group with only one owner member is allowed and should not be auto-deleted
- groups should be soft-deleted, not hard-deleted immediately
- archive behavior is out of scope

### 8.4 Group Membership Limits

The system should support configurable limits such as:

- max groups a user can create
- max groups a user can join
- max members per group

These can start as backend-configured limits instead of user-facing plan tiers.

### 8.5 Secret Visibility And Group Access

Signed-in users should be able to create secrets with explicit visibility settings.

Phase 2 visibility modes:

- `public_link`
- `group_restricted`

Definitions:

- `public_link` means anyone with the link can view the secret
- `group_restricted` means only authenticated users who are current members of at least one allowed group can view the secret

The app should not introduce a discoverable public directory in Phase 2.

When creating a `group_restricted` secret, the creator should be able to select one or more groups they currently belong to.

Behavior:

- encrypted before storage, same core privacy rule as Phase 1
- authorization is evaluated at read time using current group memberships
- if a user leaves a group, they lose future access granted through that group
- this revokes application access, not copies that the user already decrypted earlier
- expiration and burn-after-read can remain available only if the behavior stays understandable

Phase 2 secret types should stay aligned with Phase 1:

- text secrets
- file secrets

If implementation needs to be sequenced carefully, text can land before file in the restricted flow, but the Phase 2 product target should remain aligned with the Phase 1 secret types.

### 8.6 Anonymous Shares

Phase 1 anonymous sharing should remain available.

Anonymous shares should continue to support:

- text and file sharing
- expiration
- burn-after-read

This prevents Phase 2 from forcing login for the product's original use case.

---

## 9. User Flows

### Anonymous Visitor Flow

1. Visitor opens app
2. Visitor creates a normal anonymous share
3. App encrypts content before upload
4. App returns share link
5. Recipient opens link and decrypts with the provided key

### Google Login Flow

1. Visitor clicks sign in with Google
2. Auth provider completes login
3. App creates or updates internal user record
4. User returns to app as an authenticated member

### Create Group Flow

1. Signed-in user opens group creation UI
2. User enters group name
3. Backend creates the group with that user as owner
4. User becomes the first owner of that group
5. User sees the group in their group list or group detail page

### Invite Member Flow

1. Group owner selects invite action
2. Owner chooses invite by email, username, or shareable invite link
3. Backend creates a pending invite
4. Invited user logs in with Google if not already signed in
5. The app matches the invite automatically
6. User joins the group without a separate acceptance step

### Ownership Management Flow

1. Group owner opens group member management
2. Owner promotes a member to owner, or removes owner status from an existing owner
3. Backend validates that the group will still have at least one owner after the change
4. Membership roles are updated

### Leave Or Delete Group Flow

1. Member chooses leave group
2. If the user is a non-owner member, membership is removed
3. If the user is an owner and another owner remains, owner membership is removed
4. If the user is the only member and only owner, leaving deletes the group
5. If the user is the only owner but other members exist, the action must be blocked until another owner is assigned

### Create Restricted Secret Flow

1. Signed-in user opens secret creation UI
2. User chooses secret visibility
3. If the user chooses `group_restricted`, the app shows groups the user currently belongs to
4. User selects one or more groups
5. App encrypts the secret before upload
6. Backend stores encrypted payload and visibility metadata
7. Eligible viewers can open and decrypt it

### Rename Group Flow

1. Owner opens group settings
2. Owner changes the group name
3. Backend updates the stored name
4. Existing membership and access rules remain unchanged

### Group Membership Change Flow

1. A user is removed from a group, or leaves the group
2. Future access checks use current membership state
3. The user can no longer access secrets that depended on that group membership
4. Previously decrypted content outside the app cannot be revoked retroactively

---

## 10. Functional Requirements

### 10.1 Authentication Requirements

- Sign in with Google
- Sign out
- Identify current authenticated user
- Allow app usage without signing in
- Create and reserve a unique username for authenticated users

### 10.2 Group Requirements

- Create group
- List groups for current user
- View group details
- Rename group
- Invite member by email
- Invite member by username
- Create shareable invite link
- Remove member
- Promote member to owner
- Remove owner role if at least one owner remains
- Allow member leave flow
- Allow owner leave flow only when ownership invariants remain valid
- Allow group deletion by an owner
- Auto-join valid invites after login or link open

### 10.3 Secret Access Requirements

- Anonymous shares remain link-based
- Signed-in secret creation must support `public_link` and `group_restricted`
- `group_restricted` secrets must support selecting one or more groups the creator belongs to
- Restricted secrets require authentication
- Restricted secrets require active membership in at least one allowed group
- Backend authorization must not rely only on frontend checks
- Phase 2 secret types should stay aligned with Phase 1 text and file support

### 10.4 Deployment Requirements

- Frontend must be deployed publicly
- Backend API must be deployed publicly behind HTTPS
- Database must run in cloud
- Environment-specific configuration must be documented clearly

---

## 11. Suggested Data Model

### User

- `id`
- `auth_provider`
- `auth_provider_user_id`
- `email`
- `username`
- `display_name`
- `avatar_url` (nullable)
- `created_at`
- `last_login_at`

### Group

- `id`
- `name`
- `created_at`
- `deleted_at` (nullable)

### GroupMembership

- `id`
- `group_id`
- `user_id`
- `role` (`owner` or `member`)
- `created_at`

Important invariant:

- every group must always have at least one `owner` membership

### GroupInvite

- `id`
- `group_id`
- `invited_email` (nullable)
- `invited_username` (nullable)
- `invite_token` (nullable)
- `invited_by_user_id`
- `status` (`pending`, `accepted`, `revoked`)
- `created_at`

Important rules:

- an invite may target email, username, or invite token
- invite links do not expire by default in Phase 2
- invites should still be revocable

### Share

Keep the existing Phase 1 share model, but extend it carefully if needed with:

- `owner_user_id` (nullable)
- `visibility` (`public_link` or `group_restricted`)

Important rule:

- do not mix anonymous and group access rules implicitly
- make visibility explicit in the schema and backend logic
- keep group ownership in `group_memberships`, not in a single `groups.owner_user_id` field

### SecretGroupAccess

- `id`
- `secret_id`
- `group_id`
- `created_at`

Important invariant:

- a `group_restricted` secret must reference at least one allowed group
- a `public_link` secret must not rely on group membership for access

---

## 12. Authorization Model

### Anonymous Share

- link possession plus decryption key is enough

### Group-Restricted Secret

- authenticated session required
- active membership in at least one allowed group required
- decryption still happens client-side where possible

This means identity and authorization control access to the encrypted payload, while encryption continues to protect data at rest.

### Creator Ownership

- the backend may store `owner_user_id` internally for signed-in creators
- this does not imply a full user dashboard in Phase 2
- ownership metadata exists mainly for authorization, management, and future growth

---

## 13. Technical Direction

### Frontend

- React
- Vite
- Firebase Hosting for deployment
- Clerk frontend SDK for auth integration

Responsibilities:

- keep anonymous share flow working
- support login/logout UI
- show authenticated user state
- provide group and invite management UI
- provide secret visibility selection UI
- provide username setup UI if needed on first login
- encrypt content before upload

### Backend

- FastAPI
- Cloud Run for deployment

Responsibilities:

- validate sessions from auth provider
- maintain internal user, group, membership, and invite records
- store encrypted secret metadata
- enforce authorization for restricted secrets
- enforce unique username rules

### Database

- PostgreSQL on GCP Compute Engine VM

Responsibilities:

- store application data
- store group and membership relationships
- store encrypted share metadata
- store secret-to-group access relationships

### File Storage

Phase 2 should strongly consider moving file blobs out of the database.

Production recommendation:

- store encrypted files in object storage

Do not expand Phase 2 scope with this unless it is needed for deployment stability.

---

## 14. Infrastructure Alternatives

This section exists to record the considered options and their tradeoffs.

### 14.1 Frontend Hosting Alternatives

#### Firebase Hosting

Pros:

- simple deployment for a Vite SPA
- HTTPS and CDN handled for you
- good learning step without too much infrastructure burden
- straightforward SPA rewrites

Cons:

- another platform surface to learn
- less flexible than a custom container setup if you want everything in one runtime model

#### Cloud Storage + Load Balancer

Pros:

- closer to raw GCP infrastructure
- teaches more about static hosting internals

Cons:

- more setup complexity
- easier to get routing and HTTPS wrong
- more ops burden than Firebase Hosting for little product benefit at this stage

#### Vercel

Pros:

- fastest path to deployment
- excellent frontend developer experience

Cons:

- hides more infrastructure details
- not aligned with the learning goal of doing more cloud setup yourself

Phase 2 recommendation:

- choose Firebase Hosting

### 14.2 Backend Hosting Alternatives

#### Cloud Run

Pros:

- good fit for FastAPI container deployment
- scales without managing a VM for the app service
- teaches container-based deployment on GCP

Cons:

- still requires learning container build and runtime config
- request and connectivity debugging is less direct than running everything on one VM

#### Compute Engine VM

Pros:

- full control
- teaches Linux service management directly

Cons:

- much more operational work
- app deploys, reverse proxy, SSL, and process management all become your problem
- too much infrastructure detail can distract from Phase 2 product work

Phase 2 recommendation:

- choose Cloud Run

### 14.3 Database Alternatives

#### PostgreSQL on GCP Compute Engine VM

Pros:

- strong learning value
- full control over PostgreSQL setup
- aligns with the desire to understand real deployment components

Cons:

- backups, monitoring, upgrades, failover, and hardening are your responsibility
- most operationally risky option here
- easiest place to lose time during development

#### Cloud SQL for PostgreSQL

Pros:

- managed PostgreSQL on GCP
- less operational burden
- better fit if speed and reliability matter more than raw ops learning

Cons:

- teaches less about hands-on database operations
- higher abstraction and usually higher cost than a simple VM

#### Neon

Pros:

- very convenient developer experience
- branching and preview-oriented workflow is attractive
- easy to get started

Cons:

- outside the chosen GCP learning path
- less aligned with the goal of understanding self-managed deployment

#### Supabase Database

Pros:

- managed Postgres plus useful platform features
- easy path if auth and storage also live there

Cons:

- overlaps with the decision to use Clerk for auth
- less focused if the learning goal is GCP infrastructure plus a separate auth provider

Phase 2 recommendation:

- choose PostgreSQL on GCP Compute Engine VM if learning operations is part of the goal
- choose Cloud SQL instead if the VM becomes a delivery bottleneck

### 14.4 Auth Alternatives

#### Clerk

Pros:

- strong developer experience
- easy Google login integration
- good session and frontend tooling
- good fit for optional login in a React app

Cons:

- another external platform to learn
- application-level groups and permissions still need to be built in your database

#### Firebase Auth

Pros:

- integrates naturally with Firebase Hosting and GCP-adjacent tooling
- simple Google auth path

Cons:

- less appealing if Clerk's frontend and session ergonomics are preferred
- does not remove the need for your own application user and group model

#### Auth0

Pros:

- mature auth platform
- strong ecosystem

Cons:

- heavier than needed for this phase
- likely more than is needed for a portfolio-scale product

Phase 2 recommendation:

- choose Clerk

---

## 15. UX Requirements

### Visitor Experience

- visitor can understand the app without signing in
- visitor can still create anonymous shares
- login should appear as an upgrade path, not a blocker

### Signed-In Experience

- user can clearly tell when they are authenticated
- user can access their groups through a simple group list or direct group pages
- group membership and invites should be understandable without extra explanation
- ownership management should be clear enough that users do not accidentally orphan a group

No separate dashboard is required in Phase 2 if the core flows stay understandable.

### Secret Visibility Experience

- user should clearly know whether a secret is `public_link` or `group_restricted`
- when restricted, the user should see which groups are allowed during creation
- access errors should explain whether the problem is auth, membership, expiration, or invalid link

---

## 16. Security Expectations

- Google login must be verified securely through the auth provider
- backend must validate identity before returning group-restricted payloads
- backend must enforce the invariant that a group can never end up with zero owners
- backend must evaluate restricted-secret access using current memberships, not stale cached assumptions
- username uniqueness and normalization must be enforced server-side
- encryption rules from Phase 1 still apply
- production deployment must use HTTPS
- DB VM must be hardened and not exposed carelessly to the public internet

Out of scope for this phase:

- enterprise audit logging
- advanced fraud detection
- fine-grained zero-trust policy layers

---

## 17. Milestones

### Milestone 1: Authentication Foundation

- Google login
- internal user record creation
- unique username creation and validation
- signed-in session awareness
- signed-out visitor flow preserved

### Milestone 2: Group Foundation

- create group
- list groups
- basic group detail page
- owner/member relationship
- group rename
- soft delete for groups

### Milestone 3: Invites and Memberships

- invite by email
- invite by username
- invite by shareable link
- auto-join invite flow
- remove member
- enforce membership limits

### Milestone 4: Group Secrets

- create text and file secrets with `public_link` or `group_restricted` visibility
- authorize access using current memberships
- allow one or more groups on restricted secrets
- keep anonymous shares intact

### Milestone 5: Cloud Deployment

- frontend deployed on Firebase Hosting
- backend deployed on Cloud Run
- PostgreSQL deployed on GCP VM
- production configuration documented

---

## 18. Success Metrics

- visitor can still use the app anonymously
- signed-in user can create a group successfully
- invited user can join a group successfully
- restricted secret is inaccessible to users who are not current members of an allowed group
- a user who leaves a group loses future app access to secrets granted through that group
- the app runs end-to-end in cloud deployment

---

## 19. Future Ideas

- file support for group secrets
- owner transfer for groups
- archived groups
- password-based flow completion from original scope
- managed database migration from VM to Cloud SQL if needed
- enterprise SSO later if the product direction justifies it

---

## 20. Final Product Summary

Phase 2 should keep Rahasia simple while making it more real.

Visitors can still use the original anonymous sharing flow.

Signed-in users can use Google login, create groups, invite members, and share encrypted secrets with either public-link visibility or group-restricted visibility.

The phase should also result in a real cloud deployment that teaches frontend hosting, backend deployment, database operations, and authentication integration without turning the project into an overbuilt social platform.
